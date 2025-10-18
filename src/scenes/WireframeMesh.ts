import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class WireframeMesh implements Pattern {
  public name = 'Wireframe Mesh';
  public requiresWebcam = true;
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 40;
  private processHeight: number = 30;
  
  // Mesh settings
  private rotationY: number = 0;
  private rotationSpeed: number = 0.5;

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
    
    // Audio affects rotation speed
    this.rotationSpeed = 0.3 + audio.treble * 1.0;
    this.rotationY += this.rotationSpeed * dt;
    
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
    
    // Create depth map from brightness
    const depthMap = this.createDepthMap(frame);
    
    // Draw 3D wireframe mesh
    this.drawWireframeMesh(depthMap, audio);
  }
  
  private createDepthMap(imageData: ImageData): number[][] {
    const data = imageData.data;
    const depthMap: number[][] = [];
    
    for (let y = 0; y < this.processHeight; y++) {
      depthMap[y] = [];
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Convert brightness to depth (darker = closer/higher)
        const depth = (255 - gray) / 255;
        depthMap[y][x] = depth;
      }
    }
    
    return depthMap;
  }
  
  private drawWireframeMesh(depthMap: number[][], audio: AudioData): void {
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Scale and depth settings
    const scale = Math.min(width, height) / 50;
    const depthScale = 100 + audio.bass * 100;
    
    const baseHue = (this.time * 60) % 360;
    
    // Draw horizontal lines
    for (let y = 0; y < this.processHeight; y++) {
      const points: Array<{x: number, y: number, z: number}> = [];
      
      for (let x = 0; x < this.processWidth; x++) {
        const depth = depthMap[y][x];
        
        // 3D position (before rotation)
        const x3d = (x - this.processWidth / 2) * scale;
        const y3d = (y - this.processHeight / 2) * scale;
        const z3d = depth * depthScale;
        
        // Apply Y-axis rotation
        const cosY = Math.cos(this.rotationY);
        const sinY = Math.sin(this.rotationY);
        const rotatedX = x3d * cosY - z3d * sinY;
        const rotatedZ = x3d * sinY + z3d * cosY;
        
        // Project to 2D (perspective)
        const perspective = 400;
        const projectedX = centerX + (rotatedX * perspective) / (perspective + rotatedZ);
        const projectedY = centerY + (y3d * perspective) / (perspective + rotatedZ);
        
        points.push({ x: projectedX, y: projectedY, z: rotatedZ });
      }
      
      // Draw line connecting points
      if (points.length > 1) {
        const hue = (baseHue + y * 5) % 360;
        const color = hslToHex(hue, 80, 60);
        const alpha = 0.6 + (audio.beat ? 0.3 : 0);
        
        this.graphics.lineStyle(2, color, alpha);
        this.graphics.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          this.graphics.lineTo(points[i].x, points[i].y);
        }
      }
    }
    
    // Draw vertical lines
    for (let x = 0; x < this.processWidth; x++) {
      const points: Array<{x: number, y: number, z: number}> = [];
      
      for (let y = 0; y < this.processHeight; y++) {
        const depth = depthMap[y][x];
        
        const x3d = (x - this.processWidth / 2) * scale;
        const y3d = (y - this.processHeight / 2) * scale;
        const z3d = depth * depthScale;
        
        const cosY = Math.cos(this.rotationY);
        const sinY = Math.sin(this.rotationY);
        const rotatedX = x3d * cosY - z3d * sinY;
        const rotatedZ = x3d * sinY + z3d * cosY;
        
        const perspective = 400;
        const projectedX = centerX + (rotatedX * perspective) / (perspective + rotatedZ);
        const projectedY = centerY + (y3d * perspective) / (perspective + rotatedZ);
        
        points.push({ x: projectedX, y: projectedY, z: rotatedZ });
      }
      
      if (points.length > 1) {
        const hue = (baseHue + x * 5 + 60) % 360;
        const color = hslToHex(hue, 80, 60);
        const alpha = 0.6 + (audio.beat ? 0.3 : 0);
        
        this.graphics.lineStyle(2, color, alpha);
        this.graphics.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          this.graphics.lineTo(points[i].x, points[i].y);
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

