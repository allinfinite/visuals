import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
  intensity: number;
}

export class FireSmokeBody implements Pattern {
  public name = 'Fire/Smoke Body';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 80;
  private processHeight: number = 60;
  
  // Fire particles
  private particles: FireParticle[] = [];
  private maxParticles: number = 2000;

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
    
    // Process video frame
    this.videoCtx.drawImage(video, 0, 0, this.processWidth, this.processHeight);
    const frame = this.videoCtx.getImageData(0, 0, this.processWidth, this.processHeight);
    
    // Detect edges for fire emission
    const edges = this.detectEdges(frame);
    
    // Spawn fire particles from edges
    this.spawnFireParticles(edges, audio);
    
    // Update particles
    this.updateParticles(dt, audio);
    
    // Draw particles
    this.drawParticles();
  }
  
  private detectEdges(imageData: ImageData): Array<{x: number, y: number}> {
    const { width, height } = this.context;
    const data = imageData.data;
    const edges: Array<{x: number, y: number}> = [];
    const threshold = 40;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    for (let y = 1; y < this.processHeight - 1; y++) {
      for (let x = 1; x < this.processWidth - 1; x++) {
        const idx = (y * this.processWidth + x) * 4;
        
        // Check if this is an edge pixel
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const grayLeft = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
        const grayRight = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const grayUp = (data[idx - this.processWidth * 4] + data[idx - this.processWidth * 4 + 1] + data[idx - this.processWidth * 4 + 2]) / 3;
        
        const diff = Math.abs(gray - grayLeft) + Math.abs(gray - grayRight) + Math.abs(gray - grayUp);
        
        if (diff > threshold && gray < 150) {
          edges.push({
            x: x * scaleX,
            y: y * scaleY
          });
        }
      }
    }
    
    return edges;
  }
  
  private spawnFireParticles(edges: Array<{x: number, y: number}>, audio: AudioData): void {
    const spawnRate = 10 + audio.rms * 30;
    const intensity = 0.5 + audio.bass * 0.5;
    
    for (let i = 0; i < spawnRate && this.particles.length < this.maxParticles; i++) {
      if (edges.length === 0) break;
      
      const edge = edges[Math.floor(Math.random() * edges.length)];
      
      this.particles.push({
        x: edge.x + (Math.random() - 0.5) * 10,
        y: edge.y,
        vx: (Math.random() - 0.5) * 50,
        vy: -50 - Math.random() * 100, // Rise upward
        age: 0,
        maxAge: 1 + Math.random() * 2,
        size: 3 + Math.random() * 5,
        intensity: intensity
      });
    }
  }
  
  private updateParticles(dt: number, audio: AudioData): void {
    const turbulence = audio.treble * 50;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      
      // Remove old particles
      if (p.age > p.maxAge) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Buoyancy (rise faster as they age and become smoke)
      p.vy -= 80 * dt;
      
      // Turbulence
      p.vx += (Math.random() - 0.5) * turbulence * dt;
      
      // Air resistance
      p.vx *= 0.98;
      p.vy *= 0.98;
      
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  
  private drawParticles(): void {
    // Sort by age (oldest/smoke first, newest/fire last)
    const sorted = [...this.particles].sort((a, b) => b.age - a.age);
    
    for (const p of sorted) {
      const lifeProgress = p.age / p.maxAge;
      
      // Transition from fire to smoke
      let hue: number;
      let saturation: number;
      let lightness: number;
      let alpha: number;
      
      if (lifeProgress < 0.3) {
        // Fire phase: yellow-orange-red
        hue = 60 - lifeProgress * 200; // 60 (yellow) to -40 (red)
        if (hue < 0) hue += 360;
        saturation = 100;
        lightness = 50 + p.intensity * 30;
        alpha = 0.8;
      } else {
        // Smoke phase: gray
        const smokeProgress = (lifeProgress - 0.3) / 0.7;
        hue = 0;
        saturation = 0;
        lightness = 30 + smokeProgress * 40;
        alpha = 0.6 * (1 - smokeProgress);
      }
      
      const color = hslToHex(hue, saturation, lightness);
      
      // Draw particle with glow
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(p.x, p.y, p.size);
      this.graphics.endFill();
      
      // Outer glow for fire
      if (lifeProgress < 0.3) {
        this.graphics.beginFill(color, alpha * 0.3);
        this.graphics.drawCircle(p.x, p.y, p.size * 2);
        this.graphics.endFill();
      }
    }
  }
  
  private drawInstructions(): void {
    const { width, height } = this.context;
    
    // Draw fiery text
    const text = "Enable Webcam";
    const charWidth = 20;
    const textWidth = text.length * charWidth;
    
    for (let i = 0; i < text.length; i++) {
      const hue = 50 - i * 10;
      const color = hslToHex(hue, 100, 60);
      
      this.graphics.beginFill(color, 0.8);
      this.graphics.drawRect((width - textWidth) / 2 + i * charWidth, height / 2 - 15, charWidth - 4, 30);
      this.graphics.endFill();
      
      // Flame effect on top
      for (let j = 0; j < 3; j++) {
        const flameX = (width - textWidth) / 2 + i * charWidth + Math.random() * charWidth;
        const flameY = height / 2 - 20 - j * 5 - Math.random() * 10;
        this.graphics.beginFill(hslToHex(60 - j * 20, 100, 60), 0.5);
        this.graphics.drawCircle(flameX, flameY, 3);
        this.graphics.endFill();
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

