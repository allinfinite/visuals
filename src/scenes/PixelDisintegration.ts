import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface FallingPixel {
  x: number;
  y: number;
  vy: number;
  color: number;
  alpha: number;
  size: number;
}

export class PixelDisintegration implements Pattern {
  public name = 'Pixel Disintegration';
  public requiresWebcam = true;
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 80;
  private processHeight: number = 60;
  
  // Falling pixels
  private fallingPixels: FallingPixel[] = [];
  private pixelGrid: Map<string, number> = new Map(); // Track pixel ages
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
    
    // Process video frame (mirrored)
    this.videoCtx.save();
    this.videoCtx.scale(-1, 1);
    this.videoCtx.drawImage(video, -this.processWidth, 0, this.processWidth, this.processHeight);
    this.videoCtx.restore();
    const frame = this.videoCtx.getImageData(0, 0, this.processWidth, this.processHeight);
    
    // Detect motion
    const motionMap = this.detectMotion(frame);
    
    // Update pixel grid
    this.updatePixelGrid(frame, motionMap, dt, audio);
    
    // Draw static pixels
    this.drawStaticPixels();
    
    // Update and draw falling pixels
    this.updateFallingPixels(dt);
    this.drawFallingPixels();
    
    // Store frame
    this.previousFrame = frame;
  }
  
  private detectMotion(frame: ImageData): boolean[][] {
    const motion: boolean[][] = [];
    
    if (!this.previousFrame) {
      // No motion on first frame
      for (let y = 0; y < this.processHeight; y++) {
        motion[y] = new Array(this.processWidth).fill(false);
      }
      return motion;
    }
    
    const current = frame.data;
    const previous = this.previousFrame.data;
    const threshold = 30;
    
    for (let y = 0; y < this.processHeight; y++) {
      motion[y] = [];
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const diff = Math.abs(current[idx] - previous[idx]) +
                     Math.abs(current[idx + 1] - previous[idx + 1]) +
                     Math.abs(current[idx + 2] - previous[idx + 2]);
        motion[y][x] = diff > threshold;
      }
    }
    
    return motion;
  }
  
  private updatePixelGrid(frame: ImageData, motionMap: boolean[][], dt: number, audio: AudioData): void {
    const data = frame.data;
    const disintegrationSpeed = 0.5 + audio.mid * 0.5;
    const rebuildSpeed = 3 + audio.bass * 2;
    
    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const key = `${x},${y}`;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Only track visible pixels
        if (brightness < 200) {
          const hasMotion = motionMap[y][x];
          const age = this.pixelGrid.get(key) || 0;
          
          if (hasMotion) {
            // Reset age on motion (rebuild)
            this.pixelGrid.set(key, Math.max(0, age - rebuildSpeed * dt));
          } else {
            // Age pixel (disintegrate)
            const newAge = age + disintegrationSpeed * dt;
            this.pixelGrid.set(key, newAge);
            
            // Fall away when old enough
            if (newAge > 2 && Math.random() < 0.1) {
              this.createFallingPixel(x, y, data[idx], data[idx + 1], data[idx + 2]);
              this.pixelGrid.delete(key);
            }
          }
        } else {
          this.pixelGrid.delete(key);
        }
      }
    }
  }
  
  private createFallingPixel(x: number, y: number, _r: number, _g: number, _b: number): void {
    const { width, height } = this.context;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    // Convert RGB to HSL-ish color
    const hue = (this.time * 50 + y * 2) % 360;
    const color = hslToHex(hue, 70, 50);
    
    this.fallingPixels.push({
      x: x * scaleX,
      y: y * scaleY,
      vy: 50 + Math.random() * 100,
      color: color,
      alpha: 1,
      size: scaleX * 0.8
    });
  }
  
  private updateFallingPixels(dt: number): void {
    const { height } = this.context;
    
    for (let i = this.fallingPixels.length - 1; i >= 0; i--) {
      const p = this.fallingPixels[i];
      
      p.y += p.vy * dt;
      p.vy += 200 * dt; // Gravity
      p.alpha -= 0.5 * dt;
      
      if (p.y > height || p.alpha <= 0) {
        this.fallingPixels.splice(i, 1);
      }
    }
  }
  
  private drawStaticPixels(): void {
    const { width, height } = this.context;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    this.pixelGrid.forEach((age, key) => {
      const [x, y] = key.split(',').map(Number);
      const alpha = Math.max(0, 1 - age / 3);
      
      if (alpha > 0) {
        const hue = (this.time * 50 + y * 2) % 360;
        const color = hslToHex(hue, 70, 50);
        
        this.graphics.beginFill(color, alpha);
        this.graphics.drawRect(
          x * scaleX,
          y * scaleY,
          scaleX * 0.9,
          scaleY * 0.9
        );
        this.graphics.endFill();
      }
    });
  }
  
  private drawFallingPixels(): void {
    for (const p of this.fallingPixels) {
      this.graphics.beginFill(p.color, p.alpha);
      this.graphics.drawRect(p.x, p.y, p.size, p.size);
      this.graphics.endFill();
    }
  }
  
  private drawInstructions(): void {
    const { width, height } = this.context;
    const color = hslToHex((this.time * 60) % 360, 80, 60);
    
    this.graphics.beginFill(color, 0.8);
    const text = "Enable Webcam";
    const charWidth = 20;
    const textWidth = text.length * charWidth;
    for (let i = 0; i < text.length; i++) {
      this.graphics.drawRect((width - textWidth) / 2 + i * charWidth, height / 2 - 15, charWidth - 4, 30);
    }
    this.graphics.endFill();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

