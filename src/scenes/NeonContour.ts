import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class NeonContour implements Pattern {
  public name = 'Neon Contour';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 160;
  private processHeight: number = 120;
  
  // Contour settings
  private numLayers: number = 5;
  private layerOffset: number = 5;

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
    
    // Audio affects layer offset
    this.layerOffset = 3 + audio.rms * 10;
    
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
    
    // Extract contours
    const edges = this.detectEdges(frame);
    const contours = this.extractContours(edges);
    
    // Draw multiple offset layers
    const baseHue = (this.time * 60) % 360;
    
    for (let layer = this.numLayers - 1; layer >= 0; layer--) {
      const offset = layer * this.layerOffset;
      const hue = (baseHue + layer * 60) % 360;
      const alpha = 0.6 + (layer / this.numLayers) * 0.4;
      const thickness = 3 + layer * 0.5 + (audio.beat ? 2 : 0);
      
      this.drawContours(contours, offset, hue, alpha, thickness);
    }
  }
  
  private detectEdges(imageData: ImageData): boolean[][] {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const edges: boolean[][] = [];
    const threshold = 40;
    
    for (let y = 1; y < height - 1; y++) {
      edges[y] = [];
      for (let x = 1; x < width - 1; x++) {
        // Sobel edge detection
        const gx = 
          -data[((y-1)*width + (x-1))*4] + data[((y-1)*width + (x+1))*4] +
          -2*data[(y*width + (x-1))*4] + 2*data[(y*width + (x+1))*4] +
          -data[((y+1)*width + (x-1))*4] + data[((y+1)*width + (x+1))*4];
          
        const gy = 
          -data[((y-1)*width + (x-1))*4] - 2*data[((y-1)*width + x)*4] - data[((y-1)*width + (x+1))*4] +
          data[((y+1)*width + (x-1))*4] + 2*data[((y+1)*width + x)*4] + data[((y+1)*width + (x+1))*4];
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y][x] = magnitude > threshold;
      }
    }
    
    return edges;
  }
  
  private extractContours(edges: boolean[][]): Array<{x: number, y: number}> {
    const points: Array<{x: number, y: number}> = [];
    
    for (let y = 1; y < this.processHeight - 1; y++) {
      for (let x = 1; x < this.processWidth - 1; x++) {
        if (edges[y]?.[x]) {
          points.push({ x, y });
        }
      }
    }
    
    return points;
  }
  
  private drawContours(
    contours: Array<{x: number, y: number}>,
    offset: number,
    hue: number,
    alpha: number,
    thickness: number
  ): void {
    const { width, height } = this.context;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    const color = hslToHex(hue, 100, 60);
    
    // Draw glowing lines
    for (const point of contours) {
      const screenX = point.x * scaleX + offset;
      const screenY = point.y * scaleY + offset;
      
      // Inner glow (brightest)
      this.graphics.lineStyle(thickness, color, alpha);
      this.graphics.beginFill(color, alpha * 0.8);
      this.graphics.drawCircle(screenX, screenY, thickness / 2);
      this.graphics.endFill();
      
      // Outer glow
      this.graphics.lineStyle(0);
      this.graphics.beginFill(color, alpha * 0.3);
      this.graphics.drawCircle(screenX, screenY, thickness * 1.5);
      this.graphics.endFill();
      
      // Extra outer glow for neon effect
      this.graphics.beginFill(color, alpha * 0.1);
      this.graphics.drawCircle(screenX, screenY, thickness * 3);
      this.graphics.endFill();
    }
  }
  
  private drawInstructions(): void {
    const { width, height } = this.context;
    const color = hslToHex((this.time * 60) % 360, 100, 60);
    
    // Neon text effect
    const text = "Enable Webcam";
    const charWidth = 20;
    const textWidth = text.length * charWidth;
    const startX = (width - textWidth) / 2;
    const y = height / 2 - 15;
    
    // Multiple layers for glow
    for (let glow = 3; glow >= 0; glow--) {
      const alpha = 0.3 / (glow + 1);
      this.graphics.lineStyle(2 + glow * 2, color, alpha);
      
      for (let i = 0; i < text.length; i++) {
        const x = startX + i * charWidth;
        this.graphics.drawRect(x, y, charWidth - 4, 30);
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

