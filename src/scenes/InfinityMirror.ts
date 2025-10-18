import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class InfinityMirror implements Pattern {
  public name = 'Infinity Mirror';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 80;
  private processHeight: number = 60;
  
  // Frame delay buffer
  private frameBuffer: ImageData[] = [];
  private maxFrames: number = 12;
  private frameSkip: number = 3;
  private frameCounter: number = 0;

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
    
    // Audio affects number of mirrors
    this.maxFrames = Math.floor(8 + audio.rms * 8);
    
    this.draw(dt, audio);
  }

  private draw(_dt: number, audio: AudioData): void {
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
    
    // Add to buffer
    this.frameCounter++;
    if (this.frameCounter >= this.frameSkip) {
      this.frameCounter = 0;
      this.frameBuffer.push(frame);
      
      while (this.frameBuffer.length > this.maxFrames) {
        this.frameBuffer.shift();
      }
    }
    
    // Draw all frames with offset and scale
    this.drawInfinityFrames(audio);
  }
  
  private drawInfinityFrames(audio: AudioData): void {
    const { width, height } = this.context;
    const totalFrames = this.frameBuffer.length;
    
    if (totalFrames === 0) return;
    
    const baseHue = (this.time * 50) % 360;
    
    // Draw from oldest to newest (back to front)
    for (let i = 0; i < totalFrames; i++) {
      const frame = this.frameBuffer[i];
      const data = frame.data;
      const depth = (totalFrames - i - 1) / totalFrames; // 0 = front, 1 = back
      
      // Scale and offset for tunnel effect
      const scale = 1 - depth * 0.5;
      const offsetX = (width / 2) * (1 - scale);
      const offsetY = (height / 2) * (1 - scale);
      
      // Rotation for spiral effect
      const rotation = depth * Math.PI * 0.3 * (audio.beat ? 2 : 1);
      const centerX = width / 2;
      const centerY = height / 2;
      
      const scaleX = (width * scale) / this.processWidth;
      const scaleY = (height * scale) / this.processHeight;
      
      const alpha = 0.3 + (1 - depth) * 0.5;
      const hue = (baseHue + depth * 180) % 360;
      
      const threshold = 100;
      
      // Draw rotated and scaled frame
      for (let y = 0; y < this.processHeight; y += 2) {
        for (let x = 0; x < this.processWidth; x += 2) {
          const idx = (y * this.processWidth + x) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (gray < threshold) {
            // Position before rotation
            const localX = x * scaleX + offsetX - centerX;
            const localY = y * scaleY + offsetY - centerY;
            
            // Apply rotation
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);
            const rotatedX = localX * cos - localY * sin + centerX;
            const rotatedY = localX * sin + localY * cos + centerY;
            
            const color = hslToHex(hue, 80, 60);
            
            this.graphics.beginFill(color, alpha);
            this.graphics.drawRect(rotatedX, rotatedY, scaleX * 2, scaleY * 2);
            this.graphics.endFill();
          }
        }
      }
    }
    
    // Draw frame indicator
    this.drawFrameCount(totalFrames);
  }
  
  private drawFrameCount(count: number): void {
    const baseHue = (this.time * 60) % 360;
    const color = hslToHex(baseHue, 80, 60);
    
    // Draw concentric circles representing depth
    const centerX = 30;
    const centerY = 30;
    
    for (let i = 0; i < this.maxFrames; i++) {
      const alpha = i < count ? 0.6 : 0.2;
      const radius = 5 + i * 1.5;
      
      this.graphics.lineStyle(1, color, alpha);
      this.graphics.drawCircle(centerX, centerY, radius);
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

