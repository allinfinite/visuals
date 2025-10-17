import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface VoronoiCell {
  siteX: number;
  siteY: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  hue: number;
  exploding: boolean;
  explosionAge: number;
}

export class VoronoiShatter implements Pattern {
  public name = 'Voronoi Shatter';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 80;
  private processHeight: number = 60;
  
  // Voronoi cells
  private cells: VoronoiCell[] = [];
  private cellCount: number = 50;
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
    
    // Initialize cells
    this.initializeCells();
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;
    
    // Audio affects cell count
    this.cellCount = Math.floor(40 + audio.rms * 30);
    
    this.draw(dt, audio);
  }

  private draw(dt: number, audio: AudioData): void {
    this.graphics.clear();
    
    const { width, height } = this.context;
    
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
    
    // Detect motion
    const motionMap = this.detectMotion(frame);
    
    // Update cells
    this.updateCells(frame, motionMap, dt, audio);
    
    // Draw Voronoi diagram
    this.drawVoronoiDiagram(width, height, audio);
    
    this.previousFrame = frame;
  }
  
  private initializeCells(): void {
    const { width, height } = this.context;
    
    for (let i = 0; i < this.cellCount; i++) {
      this.cells.push({
        siteX: Math.random() * width,
        siteY: Math.random() * height,
        vx: 0,
        vy: 0,
        r: 0,
        g: 0,
        b: 0,
        hue: Math.random() * 360,
        exploding: false,
        explosionAge: 0
      });
    }
  }
  
  private detectMotion(frame: ImageData): boolean[][] {
    const motion: boolean[][] = [];
    
    if (!this.previousFrame) {
      for (let y = 0; y < this.processHeight; y++) {
        motion[y] = new Array(this.processWidth).fill(false);
      }
      return motion;
    }
    
    const current = frame.data;
    const previous = this.previousFrame.data;
    const threshold = 40;
    
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
  
  private updateCells(frame: ImageData, motionMap: boolean[][], dt: number, _audio: AudioData): void {
    const { width, height } = this.context;
    const data = frame.data;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    // Add/remove cells to match target count
    while (this.cells.length < this.cellCount) {
      this.cells.push({
        siteX: Math.random() * width,
        siteY: Math.random() * height,
        vx: 0,
        vy: 0,
        r: 0,
        g: 0,
        b: 0,
        hue: Math.random() * 360,
        exploding: false,
        explosionAge: 0
      });
    }
    while (this.cells.length > this.cellCount) {
      this.cells.pop();
    }
    
    // Update each cell
    for (const cell of this.cells) {
      // Sample color from webcam at cell position
      const gridX = Math.floor(cell.siteX / scaleX);
      const gridY = Math.floor(cell.siteY / scaleY);
      
      if (gridX >= 0 && gridX < this.processWidth && gridY >= 0 && gridY < this.processHeight) {
        const idx = (gridY * this.processWidth + gridX) * 4;
        
        // Smoothly update color
        cell.r = cell.r * 0.9 + data[idx] * 0.1;
        cell.g = cell.g * 0.9 + data[idx + 1] * 0.1;
        cell.b = cell.b * 0.9 + data[idx + 2] * 0.1;
        
        // Check if motion at this cell
        const hasMotion = motionMap[gridY]?.[gridX] || false;
        
        if (hasMotion && !cell.exploding && Math.random() < 0.1) {
          // Trigger explosion
          cell.exploding = true;
          cell.explosionAge = 0;
          cell.vx = (Math.random() - 0.5) * 500;
          cell.vy = (Math.random() - 0.5) * 500;
        }
      }
      
      // Update explosion
      if (cell.exploding) {
        cell.explosionAge += dt;
        
        // Apply velocity
        cell.siteX += cell.vx * dt;
        cell.siteY += cell.vy * dt;
        
        // Damping
        cell.vx *= 0.95;
        cell.vy *= 0.95;
        
        // Wrap around
        if (cell.siteX < 0) cell.siteX = width;
        if (cell.siteX > width) cell.siteX = 0;
        if (cell.siteY < 0) cell.siteY = height;
        if (cell.siteY > height) cell.siteY = 0;
        
        // Reset after explosion
        if (cell.explosionAge > 1) {
          cell.exploding = false;
          cell.explosionAge = 0;
        }
      } else {
        // Gentle drift
        cell.siteX += Math.sin(this.time + cell.hue) * 20 * dt;
        cell.siteY += Math.cos(this.time + cell.hue) * 20 * dt;
      }
      
      // Update hue
      cell.hue = (this.time * 30 + cell.siteX * 0.1) % 360;
    }
  }
  
  private drawVoronoiDiagram(width: number, height: number, audio: AudioData): void {
    // Simple Voronoi by checking each pixel
    const step = 4; // Pixel sampling rate
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        // Find closest cell
        let closestCell = this.cells[0];
        let minDist = Infinity;
        
        for (const cell of this.cells) {
          const dist = Math.hypot(x - cell.siteX, y - cell.siteY);
          if (dist < minDist) {
            minDist = dist;
            closestCell = cell;
          }
        }
        
        // Draw cell color
        if (closestCell) {
          const r = Math.floor(closestCell.r);
          const g = Math.floor(closestCell.g);
          const b = Math.floor(closestCell.b);
          const color = (r << 16) | (g << 8) | b;
          
          const alpha = closestCell.exploding ? 0.5 + closestCell.explosionAge * 0.5 : 0.7;
          
          this.graphics.beginFill(color, alpha);
          this.graphics.drawRect(x, y, step, step);
          this.graphics.endFill();
        }
      }
    }
    
    // Draw cell sites
    for (const cell of this.cells) {
      const color = hslToHex(cell.hue, 80, 60);
      const size = cell.exploding ? 5 + cell.explosionAge * 5 : 3;
      const alpha = cell.exploding ? 1 : 0.8;
      
      // Site marker
      this.graphics.lineStyle(2, color, alpha);
      this.graphics.beginFill(color, alpha * 0.8);
      this.graphics.drawCircle(cell.siteX, cell.siteY, size);
      this.graphics.endFill();
      
      // Explosion effect
      if (cell.exploding) {
        const radius = cell.explosionAge * 30;
        this.graphics.lineStyle(2, color, (1 - cell.explosionAge) * 0.5);
        this.graphics.drawCircle(cell.siteX, cell.siteY, radius);
      }
    }
    
    // Draw edges between cells
    if (audio.beat) {
      const edgeColor = hslToHex((this.time * 60) % 360, 80, 60);
      this.graphics.lineStyle(1, edgeColor, 0.3);
      
      for (let i = 0; i < this.cells.length; i++) {
        for (let j = i + 1; j < this.cells.length; j++) {
          const c1 = this.cells[i];
          const c2 = this.cells[j];
          const dist = Math.hypot(c1.siteX - c2.siteX, c1.siteY - c2.siteY);
          
          // Draw edge if cells are close
          if (dist < 150) {
            this.graphics.moveTo(c1.siteX, c1.siteY);
            this.graphics.lineTo(c2.siteX, c2.siteY);
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

