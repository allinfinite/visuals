import type { WebcamData } from '../types';

export class WebcamInput {
  public video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private previousFrame: ImageData | null = null;
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;
  
  // Webcam state
  private centroidX: number = 0.5;
  private centroidY: number = 0.5;
  private motionIntensity: number = 0;
  private smoothedMotionIntensity: number = 0;
  private previousMotionIntensity: number = 0;
  private hasMotion: boolean = false;
  
  // Processing settings
  private processWidth: number = 80;  // Reduced from 160 for performance
  private processHeight: number = 60;  // Reduced from 120 for performance
  public motionSensitivity: number = 0.3; // 0-1, higher = more sensitive
  public clickThreshold: number = 0.7; // 0-1, motion spike threshold for clicks
  public smoothingFactor: number = 0.3; // 0-1, higher = more smoothing
  public dragMotionThreshold: number = 0.15; // 0-1, motion threshold for auto-dragging
  public accelerationThreshold: number = 0.5; // 0-1, threshold for sharp movement clicks
  
  // Performance optimization
  private frameSkip: number = 2; // Process every Nth frame
  private frameCount: number = 0
  
  // Click detection
  private clickCooldown: number = 0;
  private clickCooldownDuration: number = 0.5; // seconds
  private clickPauseTimer: number = 0;
  private clickPauseDuration: number = 0.15; // seconds to pause drag after click
  private motionHistory: number[] = [];
  private maxHistoryLength: number = 10;
  
  // Acceleration tracking for sharp movement detection
  private velocityHistory: number[] = [];
  private accelerationHistory: number[] = [];
  private maxAccelHistoryLength: number = 10;
  private lastClickTriggered: boolean = false;
  
  // Debug overlay
  public showDebug: boolean = false;
  private debugCanvas: HTMLCanvasElement | null = null;
  private debugCtx: CanvasRenderingContext2D | null = null;
  
  constructor() {
    this.setupDebugOverlay();
    // Make webcam accessible globally for scenes that want to use it
    (window as any).__webcamInput = this;
  }
  
  public async init(): Promise<boolean> {
    try {
      // Create video element
      this.video = document.createElement('video');
      this.video.autoplay = true;
      this.video.playsInline = true;
      this.video.muted = true;
      
      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      this.video.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (this.video) {
          this.video.onloadedmetadata = () => {
            this.video!.play();
            resolve();
          };
        }
      });
      
      // Create processing canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.processWidth;
      this.canvas.height = this.processHeight;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      
      if (!this.ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      this.isInitialized = true;
      this.isEnabled = true;
      
      console.log('📹 Webcam initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize webcam:', error);
      this.isInitialized = false;
      this.isEnabled = false;
      return false;
    }
  }
  
  public update(dt: number): void {
    if (!this.isInitialized || !this.isEnabled || !this.video || !this.ctx) {
      return;
    }
    
    // Update click cooldown
    if (this.clickCooldown > 0) {
      this.clickCooldown -= dt;
    }
    
    // Update click pause timer
    if (this.clickPauseTimer > 0) {
      this.clickPauseTimer -= dt;
    }
    
    // Frame skipping for performance
    this.frameCount++;
    if (this.frameCount < this.frameSkip) {
      return;
    }
    this.frameCount = 0;
    
    try {
      // Draw video frame to canvas (downscaled)
      this.ctx.drawImage(
        this.video,
        0, 0,
        this.processWidth,
        this.processHeight
      );
      
      // Get current frame data
      const currentFrame = this.ctx.getImageData(
        0, 0,
        this.processWidth,
        this.processHeight
      );
      
      // Process frame for motion detection
      if (this.previousFrame) {
        this.detectMotion(currentFrame, this.previousFrame);
      }
      
      // Store current frame for next iteration
      this.previousFrame = currentFrame;
      
      // Update debug overlay (always call to handle show/hide)
      this.updateDebugOverlay();
    } catch (error) {
      console.error('Error processing webcam frame:', error);
    }
  }
  
  private detectMotion(current: ImageData, previous: ImageData): void {
    const currentData = current.data;
    const previousData = previous.data;
    
    let totalMotion = 0;
    let motionPixels = 0;
    let motionX = 0;
    let motionY = 0;
    
    // Calculate motion threshold based on sensitivity
    const threshold = (1 - this.motionSensitivity) * 100;
    
    // Compare frames
    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        const i = (y * this.processWidth + x) * 4;
        
        // Calculate grayscale difference
        const rDiff = Math.abs(currentData[i] - previousData[i]);
        const gDiff = Math.abs(currentData[i + 1] - previousData[i + 1]);
        const bDiff = Math.abs(currentData[i + 2] - previousData[i + 2]);
        const diff = (rDiff + gDiff + bDiff) / 3;
        
        if (diff > threshold) {
          motionPixels++;
          motionX += x;
          motionY += y;
          totalMotion += diff;
        }
      }
    }
    
    // Calculate centroid if motion detected
    if (motionPixels > 0) {
      // Mirror X coordinate so left movement goes left (like a mirror)
      this.centroidX = 1 - (motionX / motionPixels / this.processWidth);
      this.centroidY = motionY / motionPixels / this.processHeight;
      
      // Normalize motion intensity
      const maxMotion = motionPixels * 255;
      this.motionIntensity = Math.min(1, totalMotion / (maxMotion * 0.3));
      this.hasMotion = true;
    } else {
      this.motionIntensity = 0;
      this.hasMotion = false;
    }
    
    // Smooth motion intensity
    this.smoothedMotionIntensity = 
      this.smoothingFactor * this.motionIntensity + 
      (1 - this.smoothingFactor) * this.smoothedMotionIntensity;
    
    // Calculate velocity (rate of change of motion)
    const velocity = this.smoothedMotionIntensity - this.previousMotionIntensity;
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > this.maxAccelHistoryLength) {
      this.velocityHistory.shift();
    }
    
    // Calculate acceleration (rate of change of velocity)
    if (this.velocityHistory.length >= 2) {
      const currentVel = this.velocityHistory[this.velocityHistory.length - 1];
      const prevVel = this.velocityHistory[this.velocityHistory.length - 2];
      const acceleration = Math.abs(currentVel - prevVel);
      
      this.accelerationHistory.push(acceleration);
      if (this.accelerationHistory.length > this.maxAccelHistoryLength) {
        this.accelerationHistory.shift();
      }
    }
    
    // Store current motion for next frame's velocity calculation
    this.previousMotionIntensity = this.smoothedMotionIntensity;
    
    // Track motion history for click detection
    this.motionHistory.push(this.smoothedMotionIntensity);
    if (this.motionHistory.length > this.maxHistoryLength) {
      this.motionHistory.shift();
    }
  }
  
  public shouldTriggerClick(): boolean {
    // Need cooldown and minimum history
    if (this.clickCooldown > 0 || this.motionHistory.length < 5) {
      this.lastClickTriggered = false;
      return false;
    }
    
    // FIRST: Check for sharp acceleration spikes (works even during drag mode)
    // This allows clicks during continuous motion
    if (this.accelerationHistory.length >= 3) {
      const recentAccel = this.accelerationHistory.slice(-3);
      const avgAcceleration = recentAccel.reduce((a, b) => a + b, 0) / recentAccel.length;
      
      // Sharp movement detected - trigger click even if dragging
      if (avgAcceleration > this.accelerationThreshold) {
        this.clickCooldown = this.clickCooldownDuration;
        this.clickPauseTimer = this.clickPauseDuration; // Pause dragging briefly
        this.lastClickTriggered = true;
        console.log(`Webcam click: Sharp movement (accel: ${avgAcceleration.toFixed(3)})`);
        return true;
      }
    }
    
    // SECOND: Original gentle spike detection (only when NOT in drag mode)
    if (this.smoothedMotionIntensity < this.dragMotionThreshold) {
      // Detect motion spike (sudden increase)
      const recent = this.motionHistory.slice(-3);
      const older = this.motionHistory.slice(-6, -3);
      
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      
      // Check if there's a significant spike
      const spike = recentAvg - olderAvg;
      const isSpike = spike > this.clickThreshold * 0.3 && recentAvg > this.clickThreshold;
      
      if (isSpike) {
        this.clickCooldown = this.clickCooldownDuration;
        this.lastClickTriggered = true;
        console.log(`Webcam click: Gentle spike (motion: ${recentAvg.toFixed(3)})`);
        return true;
      }
    }
    
    this.lastClickTriggered = false;
    return false;
  }
  
  public getWebcamData(): WebcamData {
    return {
      x: this.centroidX,
      y: this.centroidY,
      motionIntensity: this.smoothedMotionIntensity,
      hasMotion: this.hasMotion,
      enabled: this.isEnabled,
      isDragging: this.smoothedMotionIntensity > this.dragMotionThreshold && this.clickPauseTimer <= 0
    };
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled && !this.isInitialized) {
      this.init();
    }
  }
  
  public getEnabled(): boolean {
    return this.isEnabled;
  }
  
  public isReady(): boolean {
    return this.isInitialized && this.isEnabled;
  }
  
  private setupDebugOverlay(): void {
    // Create debug canvas overlay
    this.debugCanvas = document.createElement('canvas');
    this.debugCanvas.style.position = 'fixed';
    this.debugCanvas.style.top = '10px';
    this.debugCanvas.style.right = '10px';
    this.debugCanvas.style.border = '2px solid white';
    this.debugCanvas.style.zIndex = '10000';
    this.debugCanvas.style.display = 'none';
    this.debugCanvas.width = 200;
    this.debugCanvas.height = 150;
    document.body.appendChild(this.debugCanvas);
    
    this.debugCtx = this.debugCanvas.getContext('2d');
  }
  
  private updateDebugOverlay(): void {
    if (!this.debugCtx || !this.debugCanvas || !this.canvas) {
      return;
    }
    
    // Show/hide debug canvas
    if (this.showDebug) {
      this.debugCanvas.style.display = 'block';
    } else {
      this.debugCanvas.style.display = 'none';
      return;
    }
    
    // Clear
    this.debugCtx.fillStyle = 'black';
    this.debugCtx.fillRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);
    
    // Draw video preview (mirrored)
    this.debugCtx.save();
    this.debugCtx.scale(-1, 1);
    this.debugCtx.drawImage(
      this.canvas,
      -this.debugCanvas.width, 0,
      this.debugCanvas.width,
      this.debugCanvas.height * 0.6
    );
    this.debugCtx.restore();
    
    // Draw centroid marker
    const markerX = this.centroidX * this.debugCanvas.width;
    const markerY = this.centroidY * this.debugCanvas.height * 0.6;
    
    this.debugCtx.strokeStyle = 'lime';
    this.debugCtx.lineWidth = 2;
    this.debugCtx.beginPath();
    this.debugCtx.arc(markerX, markerY, 10, 0, Math.PI * 2);
    this.debugCtx.stroke();
    
    // Draw crosshair
    this.debugCtx.beginPath();
    this.debugCtx.moveTo(markerX - 15, markerY);
    this.debugCtx.lineTo(markerX + 15, markerY);
    this.debugCtx.moveTo(markerX, markerY - 15);
    this.debugCtx.lineTo(markerX, markerY + 15);
    this.debugCtx.stroke();
    
    // Draw motion intensity bar
    const barY = this.debugCanvas.height * 0.55;
    const barHeight = 12;
    const barWidth = this.debugCanvas.width - 20;
    
    this.debugCtx.strokeStyle = 'white';
    this.debugCtx.strokeRect(10, barY, barWidth, barHeight);
    
    this.debugCtx.fillStyle = this.smoothedMotionIntensity > this.clickThreshold ? 'red' : 'lime';
    this.debugCtx.fillRect(10, barY, barWidth * this.smoothedMotionIntensity, barHeight);
    
    // Draw acceleration bar
    const accelBarY = barY + barHeight + 5;
    const currentAccel = this.accelerationHistory.length > 0 
      ? this.accelerationHistory[this.accelerationHistory.length - 1] 
      : 0;
    const accelDisplay = Math.min(1, currentAccel / this.accelerationThreshold);
    
    this.debugCtx.strokeStyle = 'white';
    this.debugCtx.strokeRect(10, accelBarY, barWidth, barHeight);
    
    this.debugCtx.fillStyle = currentAccel > this.accelerationThreshold ? 'yellow' : 'cyan';
    this.debugCtx.fillRect(10, accelBarY, barWidth * accelDisplay, barHeight);
    
    // Draw text info
    this.debugCtx.fillStyle = 'white';
    this.debugCtx.font = '9px monospace';
    this.debugCtx.fillText(
      `Motion: ${(this.smoothedMotionIntensity * 100).toFixed(0)}%`,
      10,
      this.debugCanvas.height * 0.70
    );
    this.debugCtx.fillText(
      `Accel: ${(currentAccel * 100).toFixed(0)}% (${(this.accelerationThreshold * 100).toFixed(0)}%)`,
      10,
      this.debugCanvas.height * 0.77
    );
    this.debugCtx.fillText(
      `Pos: (${(this.centroidX * 100).toFixed(0)}, ${(this.centroidY * 100).toFixed(0)})`,
      10,
      this.debugCanvas.height * 0.84
    );
    
    // Draw drag state indicator
    const isDragging = this.smoothedMotionIntensity > this.dragMotionThreshold && this.clickPauseTimer <= 0;
    this.debugCtx.fillStyle = isDragging ? 'lime' : 'white';
    this.debugCtx.fillText(
      `${isDragging ? '🟢' : '⚪'} Drag: ${isDragging ? 'ON' : 'OFF'}`,
      10,
      this.debugCanvas.height * 0.91
    );
    
    // Show click trigger indicator
    if (this.lastClickTriggered || this.clickCooldown > 0) {
      this.debugCtx.fillStyle = 'yellow';
      this.debugCtx.fillText(
        `⚡ CLICK!`,
        120,
        this.debugCanvas.height * 0.91
      );
    }
    
    // Show click pause state
    if (this.clickPauseTimer > 0) {
      this.debugCtx.fillStyle = 'orange';
      this.debugCtx.fillText(
        `⏸ Pause: ${(this.clickPauseTimer * 1000).toFixed(0)}ms`,
        10,
        this.debugCanvas.height * 0.98
      );
    }
  }
  
  public destroy(): void {
    // Stop video stream
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Remove debug overlay
    if (this.debugCanvas && this.debugCanvas.parentElement) {
      this.debugCanvas.parentElement.removeChild(this.debugCanvas);
    }
    
    this.isInitialized = false;
    this.isEnabled = false;
  }
}

