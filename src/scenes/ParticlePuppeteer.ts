import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  hue: number;
  size: number;
  age: number;
}

export class ParticlePuppeteer implements Pattern {
  public name = 'Particle Puppeteer';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 160;
  private processHeight: number = 120;
  
  // Particles
  private particles: Particle[] = [];
  private maxParticles: number = 2000;
  private spawnRate: number = 10;

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
    
    // Audio controls spawn rate
    this.spawnRate = 5 + audio.rms * 20;
    
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
    
    // Extract edge points
    const edgePoints = this.detectEdges(frame);
    
    // Spawn new particles from edges
    const particlesToSpawn = Math.min(this.spawnRate, edgePoints.length);
    for (let i = 0; i < particlesToSpawn && this.particles.length < this.maxParticles; i++) {
      const point = edgePoints[Math.floor(Math.random() * edgePoints.length)];
      const screenX = (point.x / this.processWidth) * width;
      const screenY = (point.y / this.processHeight) * height;
      
      // Determine hue based on y position (head=purple, feet=red)
      const hue = 270 - (point.y / this.processHeight) * 180;
      
      this.particles.push({
        x: screenX,
        y: screenY,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        targetX: screenX,
        targetY: screenY,
        hue: hue,
        size: 2 + Math.random() * 2,
        age: 0
      });
    }
    
    // Update particles
    this.updateParticles(dt, edgePoints, audio);
    
    // Draw particles
    this.drawParticles();
  }
  
  private detectEdges(imageData: ImageData): Array<{x: number, y: number}> {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const edges: Array<{x: number, y: number}> = [];
    const threshold = 30;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Simple edge detection
        const gx = Math.abs(data[idx] - data[idx + 4]);
        const gy = Math.abs(data[idx] - data[idx + width * 4]);
        
        if (gx + gy > threshold) {
          edges.push({ x, y });
        }
      }
    }
    
    return edges;
  }
  
  private updateParticles(dt: number, edgePoints: Array<{x: number, y: number}>, audio: AudioData): void {
    const { width, height } = this.context;
    const attractionStrength = 0.5 + audio.bass * 1.5;
    const chaos = audio.treble * 0.3;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      
      // Remove old particles
      if (p.age > 5) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Find nearest edge point
      if (edgePoints.length > 0) {
        let nearest = edgePoints[0];
        let minDist = Infinity;
        
        // Sample some edge points
        for (let j = 0; j < Math.min(20, edgePoints.length); j++) {
          const point = edgePoints[Math.floor(Math.random() * edgePoints.length)];
          const px = (point.x / this.processWidth) * width;
          const py = (point.y / this.processHeight) * height;
          const dist = Math.hypot(p.x - px, p.y - py);
          
          if (dist < minDist) {
            minDist = dist;
            nearest = point;
          }
        }
        
        p.targetX = (nearest.x / this.processWidth) * width;
        p.targetY = (nearest.y / this.processHeight) * height;
      }
      
      // Orbit around target
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 5) {
        // Attraction
        p.vx += (dx / dist) * attractionStrength * 100 * dt;
        p.vy += (dy / dist) * attractionStrength * 100 * dt;
        
        // Orbital motion
        p.vx += -dy * 0.5 * dt;
        p.vy += dx * 0.5 * dt;
      }
      
      // Add chaos
      p.vx += (Math.random() - 0.5) * chaos * 100;
      p.vy += (Math.random() - 0.5) * chaos * 100;
      
      // Apply velocity with damping
      p.vx *= 0.95;
      p.vy *= 0.95;
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Wrap around screen
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
    }
  }
  
  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.age / 5);
      const color = hslToHex(p.hue, 80, 60);
      
      this.graphics.beginFill(color, alpha * 0.8);
      this.graphics.drawCircle(p.x, p.y, p.size);
      this.graphics.endFill();
      
      // Draw connection to target
      if (Math.random() < 0.1) {
        this.graphics.lineStyle(1, color, alpha * 0.3);
        this.graphics.moveTo(p.x, p.y);
        this.graphics.lineTo(p.targetX, p.targetY);
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

