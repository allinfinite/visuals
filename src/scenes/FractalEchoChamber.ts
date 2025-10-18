import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class FractalEchoChamber implements Pattern {
  public name = 'Fractal Echo Chamber';
  public requiresWebcam = true;
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 60;
  private processHeight: number = 45;
  
  // Fractal recursion
  private recursionDepth: number = 5;

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
    
    // Audio affects recursion depth
    this.recursionDepth = Math.floor(4 + audio.rms * 4);
    
    this.draw(dt, audio);
  }

  private draw(_dt: number, audio: AudioData): void {
    this.graphics.clear();
    
    const { width, height } = this.context;
    
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
    
    // Extract silhouette
    const silhouette = this.extractSilhouette(frame);
    
    // Draw recursive fractal layers
    this.drawFractalRecursion(silhouette, width / 2, height / 2, 1, 0, audio);
  }
  
  private extractSilhouette(imageData: ImageData): boolean[][] {
    const data = imageData.data;
    const silhouette: boolean[][] = [];
    const threshold = 120;
    
    for (let y = 0; y < this.processHeight; y++) {
      silhouette[y] = [];
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        silhouette[y][x] = gray < threshold;
      }
    }
    
    return silhouette;
  }
  
  private drawFractalRecursion(
    silhouette: boolean[][],
    centerX: number,
    centerY: number,
    scale: number,
    depth: number,
    audio: AudioData
  ): void {
    if (depth >= this.recursionDepth || scale < 0.05) return;
    
    const { width, height } = this.context;
    const baseHue = (this.time * 60 + depth * 60) % 360;
    const color = hslToHex(baseHue, 80, 60);
    const alpha = Math.max(0.2, 1 - depth / this.recursionDepth);
    
    // Draw silhouette at this scale and position
    const scaleX = (width * scale / 3) / this.processWidth;
    const scaleY = (height * scale / 3) / this.processHeight;
    const offsetX = centerX - (this.processWidth * scaleX) / 2;
    const offsetY = centerY - (this.processHeight * scaleY) / 2;
    
    this.graphics.beginFill(color, alpha * 0.6);
    
    for (let y = 0; y < this.processHeight; y += 2) {
      for (let x = 0; x < this.processWidth; x += 2) {
        if (silhouette[y][x]) {
          const screenX = offsetX + x * scaleX;
          const screenY = offsetY + y * scaleY;
          this.graphics.drawRect(screenX, screenY, scaleX * 2, scaleY * 2);
        }
      }
    }
    
    this.graphics.endFill();
    
    // Draw distorted outline
    this.graphics.lineStyle(1 + (audio.beat ? 1 : 0), color, alpha);
    this.drawDistortedOutline(silhouette, offsetX, offsetY, scaleX, scaleY, depth);
    
    // Recurse to 4 corners with smaller scale
    const newScale = scale * 0.6;
    const offset = Math.min(width, height) * scale * 0.3;
    const distortion = Math.sin(this.time + depth) * 20;
    
    this.drawFractalRecursion(silhouette, centerX - offset + distortion, centerY - offset, newScale, depth + 1, audio);
    this.drawFractalRecursion(silhouette, centerX + offset - distortion, centerY - offset, newScale, depth + 1, audio);
    this.drawFractalRecursion(silhouette, centerX - offset, centerY + offset + distortion, newScale, depth + 1, audio);
    this.drawFractalRecursion(silhouette, centerX + offset, centerY + offset - distortion, newScale, depth + 1, audio);
  }
  
  private drawDistortedOutline(
    silhouette: boolean[][],
    offsetX: number,
    offsetY: number,
    scaleX: number,
    scaleY: number,
    depth: number
  ): void {
    const distortionAmount = Math.sin(this.time * 2 + depth * 0.5) * 5;
    
    for (let y = 1; y < this.processHeight - 1; y++) {
      for (let x = 1; x < this.processWidth - 1; x++) {
        if (silhouette[y][x]) {
          // Check if edge
          const isEdge = !silhouette[y - 1]?.[x] || !silhouette[y + 1]?.[x] ||
                        !silhouette[y]?.[x - 1] || !silhouette[y]?.[x + 1];
          
          if (isEdge) {
            const screenX = offsetX + x * scaleX + distortionAmount;
            const screenY = offsetY + y * scaleY;
            this.graphics.drawCircle(screenX, screenY, 1);
          }
        }
      }
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

