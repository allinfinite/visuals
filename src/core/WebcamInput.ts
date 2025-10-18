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
  private hasMotion: boolean = false;
  
  // Processing settings
  private processWidth: number = 80;  // Reduced from 160 for performance
  private processHeight: number = 60;  // Reduced from 120 for performance
  public motionSensitivity: number = 0.3; // 0-1, higher = more sensitive
  public clickThreshold: number = 0.7; // 0-1, motion spike threshold for clicks
  public smoothingFactor: number = 0.3; // 0-1, higher = more smoothing
  
  // Performance optimization
  private frameSkip: number = 2; // Process every Nth frame
  private frameCount: number = 0;
  
  // Drag mode state
  private dragMode: 'none' | 'ready' | 'dragging' = 'none';
  private stillnessTime: number = 0;
  private stillnessThreshold: number = 0.08; // Very low motion = stillness
  private stillnessDuration: number = 0.5; // Seconds to hold still
  private slowMotionThreshold: number = 0.25; // Threshold for slow dragging motion
  private quickMotionThreshold: number = 0.6; // Quick motion exits drag
  
  // Click detection
  private clickCooldown: number = 0;
  private clickCooldownDuration: number = 0.5; // seconds
  private motionHistory: number[] = [];
  private maxHistoryLength: number = 10;
  
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
      
      // Update drag mode detection
      this.updateDragMode(dt);
      
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
    
    // Track motion history for click detection
    this.motionHistory.push(this.smoothedMotionIntensity);
    if (this.motionHistory.length > this.maxHistoryLength) {
      this.motionHistory.shift();
    }
  }
  
  private updateDragMode(dt: number): void {
    const motion = this.smoothedMotionIntensity;
    
    switch (this.dragMode) {
      case 'none':
        // Check if user is holding still
        if (motion < this.stillnessThreshold) {
          this.stillnessTime += dt;
          
          // Enter ready mode after holding still
          if (this.stillnessTime >= this.stillnessDuration) {
            this.dragMode = 'ready';
            this.stillnessTime = 0;
            console.log('🟡 Webcam: Ready to drag');
          }
        } else {
          // Reset if user moves
          this.stillnessTime = 0;
        }
        break;
        
      case 'ready':
        // In ready mode, start dragging on slow movement
        if (motion > this.stillnessThreshold && motion < this.slowMotionThreshold) {
          this.dragMode = 'dragging';
          console.log('🟢 Webcam: Dragging started');
        } else if (motion >= this.quickMotionThreshold) {
          // Quick motion cancels ready mode
          this.dragMode = 'none';
          this.stillnessTime = 0;
          console.log('⚪ Webcam: Ready cancelled');
        }
        break;
        
      case 'dragging':
        // Exit drag mode on quick motion or stillness
        if (motion >= this.quickMotionThreshold) {
          this.dragMode = 'none';
          this.stillnessTime = 0;
          console.log('🔴 Webcam: Drag ended (quick motion)');
        } else if (motion < this.stillnessThreshold) {
          this.stillnessTime += dt;
          
          // Hold still again to exit drag mode
          if (this.stillnessTime >= this.stillnessDuration) {
            this.dragMode = 'none';
            this.stillnessTime = 0;
            console.log('🔴 Webcam: Drag ended (stillness)');
          }
        } else {
          // Reset stillness counter if moving slowly (continue dragging)
          this.stillnessTime = 0;
        }
        break;
    }
  }
  
  public shouldTriggerClick(): boolean {
    // Disable regular clicks when in drag mode
    if (this.dragMode !== 'none') {
      return false;
    }
    
    if (this.clickCooldown > 0 || this.motionHistory.length < 5) {
      return false;
    }
    
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
      return true;
    }
    
    return false;
  }
  
  public getWebcamData(): WebcamData {
    return {
      x: this.centroidX,
      y: this.centroidY,
      motionIntensity: this.smoothedMotionIntensity,
      hasMotion: this.hasMotion,
      enabled: this.isEnabled,
      dragMode: this.dragMode,
      stillnessProgress: this.dragMode === 'none' ? 
        Math.min(1, this.stillnessTime / this.stillnessDuration) : 0
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
    const barY = this.debugCanvas.height * 0.65;
    const barHeight = 15;
    const barWidth = this.debugCanvas.width - 20;
    
    this.debugCtx.strokeStyle = 'white';
    this.debugCtx.strokeRect(10, barY, barWidth, barHeight);
    
    this.debugCtx.fillStyle = this.smoothedMotionIntensity > this.clickThreshold ? 'red' : 'lime';
    this.debugCtx.fillRect(10, barY, barWidth * this.smoothedMotionIntensity, barHeight);
    
    // Draw text info
    this.debugCtx.fillStyle = 'white';
    this.debugCtx.font = '10px monospace';
    this.debugCtx.fillText(
      `Motion: ${(this.smoothedMotionIntensity * 100).toFixed(0)}%`,
      10,
      this.debugCanvas.height * 0.77
    );
    this.debugCtx.fillText(
      `Pos: (${(this.centroidX * 100).toFixed(0)}, ${(this.centroidY * 100).toFixed(0)})`,
      10,
      this.debugCanvas.height * 0.85
    );
    
    // Draw drag mode indicator
    const modeColors: Record<string, string> = {
      'none': 'white',
      'ready': 'yellow',
      'dragging': 'lime'
    };
    const modeEmojis: Record<string, string> = {
      'none': '⚪',
      'ready': '🟡',
      'dragging': '🟢'
    };
    this.debugCtx.fillStyle = modeColors[this.dragMode];
    this.debugCtx.fillText(
      `${modeEmojis[this.dragMode]} ${this.dragMode.toUpperCase()}`,
      10,
      this.debugCanvas.height * 0.93
    );
    
    // Show stillness progress when in none mode
    if (this.dragMode === 'none' && this.stillnessTime > 0) {
      const progress = Math.min(1, this.stillnessTime / this.stillnessDuration);
      this.debugCtx.fillStyle = 'yellow';
      this.debugCtx.fillText(
        `Still: ${(progress * 100).toFixed(0)}%`,
        10,
        this.debugCanvas.height * 0.99
      );
    } else {
      this.debugCtx.fillStyle = 'white';
      this.debugCtx.fillText(
        `Source: ${this.hasMotion ? 'WEBCAM' : 'mouse'}`,
        10,
        this.debugCanvas.height * 0.99
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

