import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface Dot {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  r: number;
  g: number;
  b: number;
  size: number;
  vx: number;
  vy: number;
}

export class PointillismPortrait implements Pattern {
  public name = 'Pointillism Portrait';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 40;  // Reduced for performance
  private processHeight: number = 30;  // Reduced for performance
  
  // Dots
  private dots: Dot[] = [];
  private targetDotCount: number = 800;  // Reduced from 2000
  private previousFrame: ImageData | null = null;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Create video processing canvas
    this.videoCanvas = document.createElement('canvas');
    this.videoCanvas.width = this.processWidth;
    this.videoCanvas.height = this.processHeight;
    const ctx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    this.videoCtx = ctx;
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;
    
    // Audio affects dot count (reduced for performance)
    this.targetDotCount = Math.floor(600 + audio.rms * 400);
    
    this.draw(dt, audio);
  }

  private draw(dt: number, audio: AudioData): void {
    this.graphics.clear();
    
    // Get webcam
    const webcamInput = (window as any).__webcamInput;
    const video = webcamInput?.video;
    
    if (!video || video.readyState !== 4) {
      this.drawInstructions();
      return;
    }
    
    // Process video frame
    this.videoCtx.drawImage(video, 0, 0, this.processWidth, this.processHeight);
    const frame = this.videoCtx.getImageData(0, 0, this.processWidth, this.processHeight);
    
    // Update dots based on frame
    this.updateDots(frame, dt, audio);
    
    // Draw dots
    this.drawDots();
    
    this.previousFrame = frame;
  }
  
  private updateDots(frame: ImageData, dt: number, audio: AudioData): void {
    const { width, height } = this.context;
    const data = frame.data;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    // Calculate motion intensity if we have previous frame
    let motionIntensity = 0;
    if (this.previousFrame) {
      const prevData = this.previousFrame.data;
      for (let i = 0; i < data.length; i += 4) {
        motionIntensity += Math.abs(data[i] - prevData[i]);
      }
      motionIntensity /= (data.length / 4 * 255);
    }
    
    // Adjust or create dots to match target count
    if (this.dots.length < this.targetDotCount) {
      // Add new dots
      const toAdd = Math.min(50, this.targetDotCount - this.dots.length);
      for (let i = 0; i < toAdd; i++) {
        const x = Math.floor(Math.random() * this.processWidth);
        const y = Math.floor(Math.random() * this.processHeight);
        const idx = (y * this.processWidth + x) * 4;
        
        this.dots.push({
          x: x * scaleX + (Math.random() - 0.5) * 100,
          y: y * scaleY + (Math.random() - 0.5) * 100,
          targetX: x * scaleX,
          targetY: y * scaleY,
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
          size: 2 + Math.random() * 3,
          vx: 0,
          vy: 0
        });
      }
    } else if (this.dots.length > this.targetDotCount) {
      // Remove excess dots
      this.dots.splice(this.targetDotCount);
    }
    
    // Update existing dots
    const driftAmount = motionIntensity * 200 + audio.treble * 100;
    const returnSpeed = 3 + audio.bass * 2;
    
    for (const dot of this.dots) {
      // Sample new target position and color
      const gridX = Math.round(dot.targetX / scaleX);
      const gridY = Math.round(dot.targetY / scaleY);
      
      if (gridX >= 0 && gridX < this.processWidth && gridY >= 0 && gridY < this.processHeight) {
        const idx = (gridY * this.processWidth + gridX) * 4;
        
        // Update color smoothly
        dot.r = dot.r * 0.9 + data[idx] * 0.1;
        dot.g = dot.g * 0.9 + data[idx + 1] * 0.1;
        dot.b = dot.b * 0.9 + data[idx + 2] * 0.1;
        
        // Update target position
        dot.targetX = gridX * scaleX;
        dot.targetY = gridY * scaleY;
      }
      
      // Apply forces
      const dx = dot.targetX - dot.x;
      const dy = dot.targetY - dot.y;
      
      // Return to target
      dot.vx += dx * returnSpeed * dt;
      dot.vy += dy * returnSpeed * dt;
      
      // Add drift based on motion
      dot.vx += (Math.random() - 0.5) * driftAmount * dt;
      dot.vy += (Math.random() - 0.5) * driftAmount * dt;
      
      // Damping
      dot.vx *= 0.9;
      dot.vy *= 0.9;
      
      // Update position
      dot.x += dot.vx * dt;
      dot.y += dot.vy * dt;
    }
  }
  
  private drawDots(): void {
    // Sort by brightness (darker first, lighter on top)
    const sorted = [...this.dots].sort((a, b) => {
      const brightA = a.r + a.g + a.b;
      const brightB = b.r + b.g + b.b;
      return brightA - brightB;
    });
    
    for (const dot of sorted) {
      // Convert RGB to hex
      const r = Math.floor(dot.r);
      const g = Math.floor(dot.g);
      const b = Math.floor(dot.b);
      const color = (r << 16) | (g << 8) | b;
      
      // Draw dot with slight transparency for impressionist effect
      this.graphics.beginFill(color, 0.8);
      this.graphics.drawCircle(dot.x, dot.y, dot.size);
      this.graphics.endFill();
    }
    
    // Draw dot count
    this.drawDotCount();
  }
  
  private drawDotCount(): void {
    const baseHue = (this.time * 60) % 360;
    const color = hslToHex(baseHue, 80, 60);
    
    const count = this.dots.length;
    const text = `${count}`;
    
    // Draw number as simple blocks
    this.graphics.beginFill(color, 0.6);
    for (let i = 0; i < text.length; i++) {
      this.graphics.drawRect(20 + i * 12, 20, 10, 20);
    }
    this.graphics.endFill();
  }
  
  private drawInstructions(): void {
    const { width, height } = this.context;
    
    // Draw with dots
    const text = "Enable Webcam";
    const charWidth = 20;
    const textWidth = text.length * charWidth;
    
    for (let i = 0; i < text.length; i++) {
      for (let j = 0; j < 10; j++) {
        const hue = (this.time * 60 + i * 10 + j * 5) % 360;
        const color = hslToHex(hue, 80, 60);
        const x = (width - textWidth) / 2 + i * charWidth + Math.random() * (charWidth - 4);
        const y = height / 2 - 15 + Math.random() * 30;
        
        this.graphics.beginFill(color, 0.6);
        this.graphics.drawCircle(x, y, 2 + Math.random() * 2);
        this.graphics.endFill();
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

