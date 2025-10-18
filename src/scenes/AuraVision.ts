import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class AuraVision implements Pattern {
  public name = 'Aura Vision';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 160;
  private processHeight: number = 120;
  
  // Aura layers
  private auraLayers: number = 8;
  private pulsePhase: number = 0;

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
    
    // Pulse with audio beat
    if (audio.beat) {
      this.pulsePhase = 1;
    }
    this.pulsePhase *= 0.95;
    
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
    
    // Create silhouette
    const silhouette = this.createSilhouette(frame);
    
    // Draw multiple aura layers
    const baseHue = (this.time * 30) % 360;
    const pulse = 1 + this.pulsePhase * 0.3;
    
    for (let layer = this.auraLayers; layer >= 0; layer--) {
      const expansion = layer * 8 * pulse + audio.rms * 20;
      const hue = (baseHue + layer * 40) % 360;
      const alpha = (1 - layer / this.auraLayers) * 0.3;
      
      this.drawAuraLayer(silhouette, expansion, hue, alpha);
    }
    
    // Draw core silhouette
    this.drawSilhouette(silhouette, 0xffffff, 0.9);
  }
  
  private createSilhouette(imageData: ImageData): boolean[][] {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const silhouette: boolean[][] = [];
    
    const threshold = 100;
    
    for (let y = 0; y < height; y++) {
      silhouette[y] = [];
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        silhouette[y][x] = gray < threshold;
      }
    }
    
    return silhouette;
  }
  
  private drawAuraLayer(silhouette: boolean[][], expansion: number, hue: number, alpha: number): void {
    const { width, height } = this.context;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    const color = hslToHex(hue, 90, 60);
    
    this.graphics.lineStyle(0);
    this.graphics.beginFill(color, alpha);
    
    // Draw expanded silhouette with blur effect
    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        if (silhouette[y][x]) {
          // Check if edge pixel
          const isEdge = 
            x === 0 || x === this.processWidth - 1 ||
            y === 0 || y === this.processHeight - 1 ||
            !silhouette[y - 1]?.[x] ||
            !silhouette[y + 1]?.[x] ||
            !silhouette[y]?.[x - 1] ||
            !silhouette[y]?.[x + 1];
          
          if (isEdge) {
            const screenX = x * scaleX;
            const screenY = y * scaleY;
            
            // Draw expanded circle
            const size = 4 + expansion / 2;
            this.graphics.drawCircle(screenX, screenY, size);
          }
        }
      }
    }
    
    this.graphics.endFill();
  }
  
  private drawSilhouette(silhouette: boolean[][], color: number, alpha: number): void {
    const { width, height } = this.context;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    this.graphics.lineStyle(0);
    this.graphics.beginFill(color, alpha);
    
    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        if (silhouette[y][x]) {
          const screenX = x * scaleX;
          const screenY = y * scaleY;
          this.graphics.drawRect(screenX, screenY, scaleX, scaleY);
        }
      }
    }
    
    this.graphics.endFill();
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

