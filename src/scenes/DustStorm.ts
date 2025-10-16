import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { noise2D } from '../utils/noise';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

export class DustStorm implements Pattern {
  public name = 'Dust Storm';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private particles: Particle[] = [];
  private time: number = 0;
  private windDirection: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize dust particles
    for (let i = 0; i < 400; i++) {
      this.spawnParticle();
    }
  }

  private spawnParticle(): void {
    const { width, height } = this.context;
    this.particles.push({
      x: randomRange(-100, width + 100),
      y: randomRange(-100, height + 100),
      vx: randomRange(-50, 50),
      vy: randomRange(-20, 20),
      size: randomRange(1, 4),
      alpha: randomRange(0.1, 0.4),
      life: 1,
    });
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;

    // Wind direction changes with audio
    this.windDirection += (audio.bass - 0.5) * dt * 2;
    const windStrength = 50 + audio.rms * 150;

    this.particles.forEach((p) => {
      // Brownian motion
      p.vx += (Math.random() - 0.5) * 100 * dt;
      p.vy += (Math.random() - 0.5) * 100 * dt;

      // Wind force
      const windX = Math.cos(this.windDirection) * windStrength;
      const windY = Math.sin(this.windDirection) * windStrength;
      p.vx += windX * dt;
      p.vy += windY * dt;

      // Noise-based turbulence
      const noiseValue = noise2D(p.x * 0.005, p.y * 0.005 + this.time);
      p.vx += noiseValue * 30 * dt;
      p.vy += noiseValue * 30 * dt;

      // Drag
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Movement
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap around
      const { width, height } = this.context;
      if (p.x < -100) p.x = width + 100;
      if (p.x > width + 100) p.x = -100;
      if (p.y < -100) p.y = height + 100;
      if (p.y > height + 100) p.y = -100;

      // Fade based on speed (motion blur)
      const speed = Math.hypot(p.vx, p.vy);
      p.alpha = Math.min(0.6, 0.2 + speed * 0.003) * (0.5 + audio.rms * 0.5);
    });

    // Add more particles on high energy
    if (audio.beat && this.particles.length < 800) {
      for (let i = 0; i < 20; i++) {
        this.spawnParticle();
      }
    }

    // Remove excess particles
    if (this.particles.length > 600 && audio.rms < 0.3) {
      this.particles.splice(0, 10);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    // Draw dust particles with directional blur
    this.particles.forEach((p) => {
      const speed = Math.hypot(p.vx, p.vy);
      const angle = Math.atan2(p.vy, p.vx);

      // Dust color - sandy browns
      const hue = 30 + audio.centroid * 20;
      const color = this.hslToHex(hue, 50 + audio.mid * 30, 40 + audio.treble * 20);

      // Motion blur trail
      if (speed > 50) {
        const trailLength = Math.min(speed * 0.3, 30);
        const steps = 5;
        
        this.graphics.lineStyle(p.size * 0.5, color, p.alpha * 0.3);
        
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const tx = p.x - Math.cos(angle) * trailLength * t;
          const ty = p.y - Math.sin(angle) * trailLength * t;
          
          if (i === 0) {
            this.graphics.moveTo(tx, ty);
          } else {
            this.graphics.lineTo(tx, ty);
          }
        }
      }

      // Particle core
      this.graphics.beginFill(color, p.alpha);
      this.graphics.drawCircle(p.x, p.y, p.size);
      this.graphics.endFill();

      // Brighter center for larger particles
      if (p.size > 2) {
        this.graphics.beginFill(0xFFE4B5, p.alpha * 0.8);
        this.graphics.drawCircle(p.x, p.y, p.size * 0.5);
        this.graphics.endFill();
      }
    });

    // Draw wind direction indicator
    const { width } = this.context;
    const indicatorX = width - 50;
    const indicatorY = 50;
    const arrowLength = 30 + audio.rms * 20;

    this.graphics.lineStyle(2, 0xFFE4B5, 0.3 + audio.bass * 0.4);
    this.graphics.moveTo(indicatorX, indicatorY);
    this.graphics.lineTo(
      indicatorX + Math.cos(this.windDirection) * arrowLength,
      indicatorY + Math.sin(this.windDirection) * arrowLength
    );
    
    // Arrow head
    const headAngle = 0.5;
    const headLength = 10;
    this.graphics.lineTo(
      indicatorX + Math.cos(this.windDirection - headAngle) * (arrowLength - headLength),
      indicatorY + Math.sin(this.windDirection - headAngle) * (arrowLength - headLength)
    );
    this.graphics.moveTo(
      indicatorX + Math.cos(this.windDirection) * arrowLength,
      indicatorY + Math.sin(this.windDirection) * arrowLength
    );
    this.graphics.lineTo(
      indicatorX + Math.cos(this.windDirection + headAngle) * (arrowLength - headLength),
      indicatorY + Math.sin(this.windDirection + headAngle) * (arrowLength - headLength)
    );
  }

  private hslToHex(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

