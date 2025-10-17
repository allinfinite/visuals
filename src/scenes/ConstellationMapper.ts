import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface FeaturePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string; // 'head', 'center', 'leftHand', 'rightHand', etc.
}

interface OrbitingParticle {
  x: number;
  y: number;
  angle: number;
  distance: number;
  speed: number;
  size: number;
  hue: number;
  pointIndex: number;
}

export class ConstellationMapper implements Pattern {
  public name = 'Constellation Mapper';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 80;
  private processHeight: number = 60;
  
  // Feature points
  private featurePoints: FeaturePoint[] = [];
  private orbitingParticles: OrbitingParticle[] = [];
  private maxParticles: number = 150;

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
    
    // Extract feature points
    const newFeaturePoints = this.extractFeaturePoints(frame);
    
    // Update feature points with smoothing
    this.updateFeaturePoints(newFeaturePoints, dt);
    
    // Update orbiting particles
    this.updateOrbitingParticles(dt, audio);
    
    // Draw connections between feature points
    this.drawConstellationLines(audio);
    
    // Draw feature points as stars
    this.drawFeatureStars(audio);
    
    // Draw orbiting particles
    this.drawOrbitingParticles();
  }
  
  private extractFeaturePoints(imageData: ImageData): FeaturePoint[] {
    const { width, height } = this.context;
    const data = imageData.data;
    const threshold = 120;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    
    const points: FeaturePoint[] = [];
    
    // Find topmost point (head)
    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (gray < threshold) {
          points.push({
            x: x * scaleX,
            y: y * scaleY,
            vx: 0,
            vy: 0,
            type: 'head'
          });
          break;
        }
      }
      if (points.length > 0) break;
    }
    
    // Find center of mass
    let sumX = 0, sumY = 0, count = 0;
    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (gray < threshold) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }
    
    if (count > 0) {
      points.push({
        x: (sumX / count) * scaleX,
        y: (sumY / count) * scaleY,
        vx: 0,
        vy: 0,
        type: 'center'
      });
    }
    
    // Find leftmost and rightmost points (hands)
    let leftmost: {x: number, y: number} | null = null;
    let rightmost: {x: number, y: number} | null = null;
    
    for (let y = 0; y < this.processHeight; y++) {
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (gray < threshold) {
          if (!leftmost || x < leftmost.x) leftmost = {x, y};
          if (!rightmost || x > rightmost.x) rightmost = {x, y};
        }
      }
    }
    
    if (leftmost) {
      points.push({
        x: leftmost.x * scaleX,
        y: leftmost.y * scaleY,
        vx: 0,
        vy: 0,
        type: 'leftHand'
      });
    }
    
    if (rightmost) {
      points.push({
        x: rightmost.x * scaleX,
        y: rightmost.y * scaleY,
        vx: 0,
        vy: 0,
        type: 'rightHand'
      });
    }
    
    // Find bottom points (feet)
    for (let y = this.processHeight - 1; y >= 0; y--) {
      for (let x = 0; x < this.processWidth; x++) {
        const idx = (y * this.processWidth + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (gray < threshold) {
          points.push({
            x: x * scaleX,
            y: y * scaleY,
            vx: 0,
            vy: 0,
            type: 'foot'
          });
          break;
        }
      }
      if (points.length >= 5) break;
    }
    
    return points;
  }
  
  private updateFeaturePoints(newPoints: FeaturePoint[], dt: number): void {
    // Smooth transition to new points
    if (this.featurePoints.length === 0) {
      this.featurePoints = newPoints;
      return;
    }
    
    // Match old points to new points by type
    for (let i = 0; i < this.featurePoints.length; i++) {
      const oldPoint = this.featurePoints[i];
      const newPoint = newPoints.find(p => p.type === oldPoint.type);
      
      if (newPoint) {
        const dx = newPoint.x - oldPoint.x;
        const dy = newPoint.y - oldPoint.y;
        oldPoint.vx = dx * 5;
        oldPoint.vy = dy * 5;
        oldPoint.x += oldPoint.vx * dt;
        oldPoint.y += oldPoint.vy * dt;
      }
    }
    
    // Add new points that don't have matches
    for (const newPoint of newPoints) {
      if (!this.featurePoints.find(p => p.type === newPoint.type)) {
        this.featurePoints.push(newPoint);
      }
    }
  }
  
  private updateOrbitingParticles(dt: number, audio: AudioData): void {
    // Spawn new particles
    while (this.orbitingParticles.length < this.maxParticles && this.featurePoints.length > 0) {
      const pointIndex = Math.floor(Math.random() * this.featurePoints.length);
      const point = this.featurePoints[pointIndex];
      
      this.orbitingParticles.push({
        x: point.x,
        y: point.y,
        angle: Math.random() * Math.PI * 2,
        distance: 20 + Math.random() * 80,
        speed: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 2,
        hue: (this.time * 50 + pointIndex * 60) % 360,
        pointIndex: pointIndex
      });
    }
    
    // Update particles
    const speedMultiplier = 1 + audio.treble * 2;
    
    for (let i = this.orbitingParticles.length - 1; i >= 0; i--) {
      const particle = this.orbitingParticles[i];
      
      if (particle.pointIndex < this.featurePoints.length) {
        const point = this.featurePoints[particle.pointIndex];
        
        // Orbit
        particle.angle += particle.speed * speedMultiplier * dt;
        particle.x = point.x + Math.cos(particle.angle) * particle.distance;
        particle.y = point.y + Math.sin(particle.angle) * particle.distance;
      } else {
        // Remove if point no longer exists
        this.orbitingParticles.splice(i, 1);
      }
    }
  }
  
  private drawConstellationLines(audio: AudioData): void {
    const baseHue = (this.time * 30) % 360;
    const beat = audio.beat ? 1.5 : 1;
    
    // Draw lines between all feature points
    for (let i = 0; i < this.featurePoints.length; i++) {
      for (let j = i + 1; j < this.featurePoints.length; j++) {
        const p1 = this.featurePoints[i];
        const p2 = this.featurePoints[j];
        
        const color = hslToHex((baseHue + i * 40 + j * 20) % 360, 80, 60);
        const alpha = 0.4 + audio.mid * 0.3;
        
        this.graphics.lineStyle(1 * beat, color, alpha);
        this.graphics.moveTo(p1.x, p1.y);
        this.graphics.lineTo(p2.x, p2.y);
      }
    }
  }
  
  private drawFeatureStars(audio: AudioData): void {
    const baseHue = (this.time * 30) % 360;
    
    for (let i = 0; i < this.featurePoints.length; i++) {
      const point = this.featurePoints[i];
      const color = hslToHex((baseHue + i * 50) % 360, 90, 70);
      const size = 5 + (audio.beat ? 3 : 0);
      
      // Star burst
      this.graphics.lineStyle(2, color, 0.9);
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x1 = point.x + Math.cos(angle) * size;
        const y1 = point.y + Math.sin(angle) * size;
        const x2 = point.x + Math.cos(angle) * (size * 2);
        const y2 = point.y + Math.sin(angle) * (size * 2);
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
      }
      
      // Center glow
      this.graphics.beginFill(color, 0.8);
      this.graphics.drawCircle(point.x, point.y, size);
      this.graphics.endFill();
    }
  }
  
  private drawOrbitingParticles(): void {
    for (const particle of this.orbitingParticles) {
      const color = hslToHex(particle.hue, 80, 60);
      
      this.graphics.beginFill(color, 0.7);
      this.graphics.drawCircle(particle.x, particle.y, particle.size);
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

