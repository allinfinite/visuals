import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface PaintStroke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  size: number;
  age: number;
}

export class ColorExtractionPaint implements Pattern {
  public name = 'Color Extraction Paint';
  public requiresWebcam = true;
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 50;  // Reduced for performance
  private processHeight: number = 38;  // Reduced for performance
  
  // Paint strokes
  private strokes: PaintStroke[] = [];
  private maxStrokes: number = 1200;  // Reduced from 3000
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
    
    // Detect motion and extract colors
    if (this.previousFrame) {
      this.extractColorsFromMotion(frame, this.previousFrame, audio);
    }
    
    this.previousFrame = frame;
    
    // Update strokes
    this.updateStrokes(dt);
    
    // Draw strokes
    this.drawStrokes();
  }
  
  private extractColorsFromMotion(current: ImageData, previous: ImageData, audio: AudioData): void {
    const { width, height } = this.context;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    const currentData = current.data;
    const previousData = previous.data;
    const motionThreshold = 30;
    const spawnRate = 5 + audio.rms * 20;
    
    let spawned = 0;
    
    for (let y = 0; y < this.processHeight && spawned < spawnRate; y++) {
      for (let x = 0; x < this.processWidth && spawned < spawnRate; x++) {
        const idx = (y * this.processWidth + x) * 4;
        
        // Calculate motion
        const diff = Math.abs(currentData[idx] - previousData[idx]) +
                     Math.abs(currentData[idx + 1] - previousData[idx + 1]) +
                     Math.abs(currentData[idx + 2] - previousData[idx + 2]);
        
        if (diff > motionThreshold && this.strokes.length < this.maxStrokes) {
          // Extract actual RGB color from video
          const r = currentData[idx];
          const g = currentData[idx + 1];
          const b = currentData[idx + 2];
          
          const screenX = x * scaleX;
          const screenY = y * scaleY;
          
          // Create paint stroke with actual video color
          this.strokes.push({
            x: screenX,
            y: screenY,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            r: r,
            g: g,
            b: b,
            size: 3 + Math.random() * 5 + audio.bass * 3,
            age: 0
          });
          
          spawned++;
        }
      }
    }
  }
  
  private updateStrokes(dt: number): void {
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const s = this.strokes[i];
      s.age += dt;
      
      // Remove old strokes
      if (s.age > 3) {
        this.strokes.splice(i, 1);
        continue;
      }
      
      // Apply velocity with damping
      s.vx *= 0.95;
      s.vy *= 0.95;
      
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
  }
  
  private drawStrokes(): void {
    // Sort by age (draw oldest first)
    const sorted = [...this.strokes].sort((a, b) => b.age - a.age);
    
    for (const s of sorted) {
      const alpha = Math.max(0, 1 - s.age / 3);
      
      // Convert RGB to hex
      const color = (s.r << 16) | (s.g << 8) | s.b;
      
      // Draw paint blob with soft edges
      this.graphics.beginFill(color, alpha * 0.7);
      this.graphics.drawCircle(s.x, s.y, s.size);
      this.graphics.endFill();
      
      // Outer softer layer
      this.graphics.beginFill(color, alpha * 0.3);
      this.graphics.drawCircle(s.x, s.y, s.size * 1.5);
      this.graphics.endFill();
    }
  }
  
  private drawInstructions(): void {
    const { width, height } = this.context;
    
    // Draw rainbow text
    const text = "Enable Webcam";
    const charWidth = 20;
    const textWidth = text.length * charWidth;
    
    for (let i = 0; i < text.length; i++) {
      const hue = (this.time * 60 + i * 30) % 360;
      const r = Math.floor(127 + 127 * Math.sin(hue * Math.PI / 180));
      const g = Math.floor(127 + 127 * Math.sin((hue + 120) * Math.PI / 180));
      const b = Math.floor(127 + 127 * Math.sin((hue + 240) * Math.PI / 180));
      const color = (r << 16) | (g << 8) | b;
      
      this.graphics.beginFill(color, 0.8);
      this.graphics.drawRect((width - textWidth) / 2 + i * charWidth, height / 2 - 15, charWidth - 4, 30);
      this.graphics.endFill();
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

