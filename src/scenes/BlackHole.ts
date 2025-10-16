import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  hue: number;
  alpha: number;
}

export class BlackHole implements Pattern {
  public name = 'Black Hole';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private particles: Particle[] = [];
  private time: number = 0;
  private centerX: number;
  private centerY: number;
  private accretionBurst: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.centerX = context.width / 2;
    this.centerY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize accretion disk particles
    for (let i = 0; i < 300; i++) {
      this.spawnParticle();
    }
  }

  private spawnParticle(): void {
    const maxRadius = Math.min(this.context.width, this.context.height) * 0.6;
    this.particles.push({
      angle: randomRange(0, Math.PI * 2),
      radius: randomRange(maxRadius * 0.3, maxRadius),
      speed: randomRange(0.5, 2),
      size: randomRange(1, 4),
      hue: randomRange(20, 60), // Orange to yellow
      alpha: randomRange(0.4, 0.9),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update center position based on mouse
    if (input.isDown || input.isDragging) {
      this.centerX += (input.x - this.centerX) * 0.05;
      this.centerY += (input.y - this.centerY) * 0.05;
    }

    // Accretion burst on beat
    if (audio.beat) {
      this.accretionBurst = 1;
    }
    this.accretionBurst *= 0.92;

    // Update particles
    this.particles.forEach((p, idx) => {
      // Orbital motion (faster closer to center)
      const orbitalSpeed = (1 / (p.radius * 0.01)) * p.speed;
      p.angle += orbitalSpeed * dt * (0.5 + audio.rms);

      // Spiral inward
      p.radius -= (50 + audio.bass * 100) * dt;

      // Wobble from audio
      p.radius += Math.sin(this.time * 3 + p.angle * 2) * audio.treble * 10;

      // Respawn if too close to singularity
      if (p.radius < 30) {
        const maxRadius = Math.min(this.context.width, this.context.height) * 0.6;
        this.particles[idx] = {
          angle: randomRange(0, Math.PI * 2),
          radius: randomRange(maxRadius * 0.8, maxRadius),
          speed: randomRange(0.5, 2),
          size: randomRange(1, 4),
          hue: randomRange(20, 60),
          alpha: randomRange(0.4, 0.9),
        };
      }

      // Add burst particles
      if (this.accretionBurst > 0.5 && Math.random() < 0.05) {
        p.hue = randomRange(0, 360);
        p.size *= 1.5;
      }
    });

    // Spawn new particles
    if (this.particles.length < 400 && Math.random() < 0.1) {
      this.spawnParticle();
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    // Event horizon (black circle)
    this.graphics.beginFill(0x000000, 0.3);
    this.graphics.drawCircle(this.centerX, this.centerY, 30 + this.accretionBurst * 20);
    this.graphics.endFill();

    // Singularity ring
    this.graphics.lineStyle(
      2 + this.accretionBurst * 4,
      0xff6600,
      0.6 + this.accretionBurst * 0.4
    );
    this.graphics.drawCircle(this.centerX, this.centerY, 35 + this.accretionBurst * 20);

    // Accretion disk particles
    this.particles.forEach((p) => {
      const x = this.centerX + Math.cos(p.angle) * p.radius;
      const y = this.centerY + Math.sin(p.angle) * p.radius;

      // Distance-based color shift (redshift approaching black hole)
      const distanceFactor = p.radius / (Math.min(this.context.width, this.context.height) * 0.6);
      const hue = p.hue + (1 - distanceFactor) * 20; // Shift towards red
      const color = this.hslToHex(hue, 100, 50 + audio.rms * 20);

      // Particle glow
      const glowSize = p.size * (2 + this.accretionBurst * 2);
      this.graphics.beginFill(color, p.alpha * 0.3);
      this.graphics.drawCircle(x, y, glowSize);
      this.graphics.endFill();

      // Particle core
      this.graphics.beginFill(color, p.alpha);
      this.graphics.drawCircle(x, y, p.size);
      this.graphics.endFill();

      // Motion streak for particles moving fast
      if (distanceFactor < 0.5) {
        const streakAngle = p.angle + Math.PI / 2;
        const streakLength = (1 - distanceFactor) * 15;
        const sx = x - Math.cos(streakAngle) * streakLength;
        const sy = y - Math.sin(streakAngle) * streakLength;
        
        this.graphics.lineStyle(1, color, p.alpha * 0.4);
        this.graphics.moveTo(x, y);
        this.graphics.lineTo(sx, sy);
      }
    });

    // Hawking radiation (particles escaping)
    if (this.accretionBurst > 0.3) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + this.time * 2;
        const dist = 40 + this.accretionBurst * 30;
        const x = this.centerX + Math.cos(angle) * dist;
        const y = this.centerY + Math.sin(angle) * dist;
        
        this.graphics.beginFill(0xffffff, this.accretionBurst * 0.6);
        this.graphics.drawCircle(x, y, 2);
        this.graphics.endFill();
      }
    }
  }

  private hslToHex(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

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

