import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { hslToHex } from '../utils/color';
import { noise2D } from '../utils/noise';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  originalX: number;
  originalY: number;
  disintegration: number; // 0 = intact, 1 = fully disintegrated
  hue: number;
  alpha: number;
}

export class SilhouetteParticles implements Pattern {
  public name = 'Silhouette Particles';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private particles: Particle[] = [];
  private time: number = 0;
  private silhouetteType: number = 0; // 0-4 different silhouettes
  private disintegrateDirection: number = 1; // 1 = disintegrating, -1 = reforming
  private clickCooldown: number = 0; // Prevent click spam

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.generateSilhouette();
  }

  private generateSilhouette(): void {
    this.particles = [];
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;

    const shapes = [
      this.generateHumanoid,
      this.generateButterfly,
      this.generateBird,
      this.generateHand,
      this.generateTree,
    ];

    shapes[this.silhouetteType % shapes.length].call(this, centerX, centerY);
  }

  private generateHumanoid(centerX: number, centerY: number): void {
    const scale = 150;
    
    // Head
    this.addCircleParticles(centerX, centerY - scale * 0.8, scale * 0.3, 100);
    
    // Body
    this.addRectParticles(centerX, centerY - scale * 0.2, scale * 0.5, scale * 0.8, 200);
    
    // Arms
    this.addRectParticles(centerX - scale * 0.6, centerY - scale * 0.3, scale * 0.4, scale * 0.15, 100);
    this.addRectParticles(centerX + scale * 0.6, centerY - scale * 0.3, scale * 0.4, scale * 0.15, 100);
    
    // Legs
    this.addRectParticles(centerX - scale * 0.2, centerY + scale * 0.5, scale * 0.6, scale * 0.15, 100);
    this.addRectParticles(centerX + scale * 0.2, centerY + scale * 0.5, scale * 0.6, scale * 0.15, 100);
  }

  private generateButterfly(centerX: number, centerY: number): void {
    const scale = 120;
    
    // Body
    this.addRectParticles(centerX, centerY, scale * 0.8, scale * 0.12, 80);
    
    // Wings (left and right, top and bottom)
    this.addEllipseParticles(centerX - scale * 0.4, centerY - scale * 0.3, scale * 0.5, scale * 0.4, 150);
    this.addEllipseParticles(centerX + scale * 0.4, centerY - scale * 0.3, scale * 0.5, scale * 0.4, 150);
    this.addEllipseParticles(centerX - scale * 0.3, centerY + scale * 0.3, scale * 0.4, scale * 0.3, 100);
    this.addEllipseParticles(centerX + scale * 0.3, centerY + scale * 0.3, scale * 0.4, scale * 0.3, 100);
  }

  private generateBird(centerX: number, centerY: number): void {
    const scale = 130;
    
    // Body
    this.addEllipseParticles(centerX, centerY, scale * 0.3, scale * 0.5, 120);
    
    // Head
    this.addCircleParticles(centerX, centerY - scale * 0.6, scale * 0.25, 80);
    
    // Wings (spread)
    this.addTriangleParticles(centerX - scale * 0.7, centerY, scale * 0.8, scale * 0.3, 120);
    this.addTriangleParticles(centerX + scale * 0.7, centerY, scale * 0.8, scale * 0.3, 120);
    
    // Tail
    this.addTriangleParticles(centerX, centerY + scale * 0.6, scale * 0.3, scale * 0.5, 60);
  }

  private generateHand(centerX: number, centerY: number): void {
    const scale = 100;
    
    // Palm
    this.addRectParticles(centerX, centerY, scale * 0.6, scale * 0.8, 200);
    
    // Fingers
    for (let i = 0; i < 5; i++) {
      const fingerX = centerX - scale * 0.25 + i * scale * 0.13;
      const fingerLength = scale * (0.5 + (i === 2 ? 0.2 : i === 1 || i === 3 ? 0.1 : 0));
      this.addRectParticles(fingerX, centerY - scale * 0.4 - fingerLength / 2, fingerLength, scale * 0.1, 40);
    }
  }

  private generateTree(centerX: number, centerY: number): void {
    const scale = 150;
    
    // Trunk
    this.addRectParticles(centerX, centerY + scale * 0.3, scale * 0.8, scale * 0.2, 150);
    
    // Canopy (3 circles)
    this.addCircleParticles(centerX, centerY - scale * 0.3, scale * 0.5, 200);
    this.addCircleParticles(centerX - scale * 0.3, centerY - scale * 0.1, scale * 0.4, 150);
    this.addCircleParticles(centerX + scale * 0.3, centerY - scale * 0.1, scale * 0.4, 150);
  }

  private addCircleParticles(cx: number, cy: number, radius: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      this.particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        originalX: cx + Math.cos(angle) * r,
        originalY: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        size: randomRange(2, 5),
        disintegration: 0,
        hue: randomRange(180, 280), // Blue/purple range
        alpha: 1,
      });
    }
  }

  private addRectParticles(cx: number, cy: number, width: number, height: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const x = cx + (Math.random() - 0.5) * width;
      const y = cy + (Math.random() - 0.5) * height;
      this.particles.push({
        x,
        y,
        originalX: x,
        originalY: y,
        vx: 0,
        vy: 0,
        size: randomRange(2, 5),
        disintegration: 0,
        hue: randomRange(180, 280),
        alpha: 1,
      });
    }
  }

  private addEllipseParticles(cx: number, cy: number, radiusX: number, radiusY: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const x = cx + Math.cos(angle) * r * radiusX;
      const y = cy + Math.sin(angle) * r * radiusY;
      this.particles.push({
        x,
        y,
        originalX: x,
        originalY: y,
        vx: 0,
        vy: 0,
        size: randomRange(2, 5),
        disintegration: 0,
        hue: randomRange(180, 280),
        alpha: 1,
      });
    }
  }

  private addTriangleParticles(cx: number, cy: number, width: number, height: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const sqrtV = Math.sqrt(v);
      
      // Barycentric coordinates for triangle sampling
      const x = cx + (1 - sqrtV) * (-width / 2) + sqrtV * (1 - u) * (width / 2);
      const y = cy + (1 - sqrtV) * height / 2 + sqrtV * u * (-height / 2);
      
      this.particles.push({
        x,
        y,
        originalX: x,
        originalY: y,
        vx: 0,
        vy: 0,
        size: randomRange(2, 5),
        disintegration: 0,
        hue: randomRange(180, 280),
        alpha: 1,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Update cooldown
    if (this.clickCooldown > 0) {
      this.clickCooldown -= dt;
    }

    // Click changes silhouette (with cooldown and smooth transition)
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.clickCooldown <= 0) {
        // Only change if mostly reformed (to avoid jarring mid-explosion change)
        const avgDisintegration = this.particles.reduce((sum, p) => sum + p.disintegration, 0) / this.particles.length;
        if (avgDisintegration < 0.3) {
          this.silhouetteType = (this.silhouetteType + 1) % 5;
          this.generateSilhouette();
          this.clickCooldown = 1.0; // 1 second cooldown
        }
      }
    });

    // Beat toggles disintegration direction (less frequently)
    if (audio.beat && Math.random() < 0.3) {
      this.disintegrateDirection *= -1;
    }

    this.particles.forEach((p) => {
      // Slower, smoother disintegration (reduced from 1.5)
      const disintegrateSpeed = 0.8 * (1 + audio.bass * 0.5);
      if (this.disintegrateDirection > 0) {
        p.disintegration = Math.min(1, p.disintegration + dt * disintegrateSpeed);
      } else {
        p.disintegration = Math.max(0, p.disintegration - dt * disintegrateSpeed * 0.7);
      }

      // Apply forces based on disintegration
      if (p.disintegration > 0) {
        // Noise-based forces
        const noiseForce = noise2D(p.originalX * 0.01, p.originalY * 0.01 + this.time * 0.5);
        const angle = noiseForce * Math.PI * 2;
        
        // Gentler explosion (reduced from 200 to 100)
        const explosionForce = p.disintegration * 100 * (1 + audio.treble * 0.5);
        p.vx += Math.cos(angle) * explosionForce * dt;
        p.vy += Math.sin(angle) * explosionForce * dt;
        
        // Gentler gravity (reduced from 50 to 30)
        p.vy += 30 * p.disintegration * dt;
      } else {
        // Reform to original position
        const returnSpeed = 5;
        p.vx += (p.originalX - p.x) * returnSpeed * dt;
        p.vy += (p.originalY - p.y) * returnSpeed * dt;
      }

      // Apply velocity
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // More friction for calmer movement (0.95 → 0.92)
      p.vx *= 0.92;
      p.vy *= 0.92;

      // Alpha based on disintegration
      p.alpha = 1 - p.disintegration * 0.7;

      // Slower hue shifts (reduced by 2x)
      p.hue = (p.hue + dt * 10 + audio.centroid * 15) % 360;

      // Gentler size pulses (reduced from 0.1/-0.05)
      p.size *= 1 + (audio.beat ? 0.05 : -0.02 * dt);
      p.size = Math.max(1, Math.min(8, p.size));
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    this.particles.forEach((p) => {
      const color = hslToHex(p.hue, 70, 50);
      const glowColor = hslToHex(p.hue, 100, 70);
      
      // Glow
      this.graphics.beginFill(glowColor, p.alpha * 0.3 * (1 + audio.rms * 0.5));
      this.graphics.drawCircle(p.x, p.y, p.size * 2);
      this.graphics.endFill();
      
      // Core particle
      this.graphics.beginFill(color, p.alpha);
      this.graphics.drawCircle(p.x, p.y, p.size);
      this.graphics.endFill();
    });

    // Draw silhouette outline when intact
    const avgDisintegration = this.particles.reduce((sum, p) => sum + p.disintegration, 0) / this.particles.length;
    if (avgDisintegration < 0.3) {
      this.graphics.lineStyle(2, 0xffffff, 0.3 * (1 - avgDisintegration));
      
      // Draw convex hull or bounding shape (simplified)
      const minX = Math.min(...this.particles.map(p => p.x));
      const maxX = Math.max(...this.particles.map(p => p.x));
      const minY = Math.min(...this.particles.map(p => p.y));
      const maxY = Math.max(...this.particles.map(p => p.y));
      
      this.graphics.drawRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

