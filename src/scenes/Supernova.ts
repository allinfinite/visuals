import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  life: number;
}

interface Explosion {
  x: number;
  y: number;
  particles: Particle[];
  time: number;
  maxTime: number;
}

export class Supernova implements Pattern {
  public name = 'Supernova';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private explosions: Explosion[] = [];
  private time: number = 0;
  private autoTriggerTimer: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  private createExplosion(x: number, y: number, audio: AudioData): void {
    const particles: Particle[] = [];
    const particleCount = 200 + audio.rms * 300;
    const maxTime = 3 + audio.bass * 2;

    for (let i = 0; i < particleCount; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(50, 400);
      const hue = randomRange(0, 60); // Red, orange, yellow spectrum
      
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomRange(1, 5),
        hue,
        alpha: 1,
        life: 1,
      });
    }

    this.explosions.push({
      x,
      y,
      particles,
      time: 0,
      maxTime,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.autoTriggerTimer += dt;

    // Click to trigger explosion
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.createExplosion(click.x, click.y, audio);
      }
    });

    // Auto-trigger explosions
    const triggerInterval = 8 - audio.rms * 3; // More frequent with audio
    if (this.autoTriggerTimer > triggerInterval || (audio.beat && Math.random() < 0.15)) {
      this.createExplosion(
        randomRange(this.context.width * 0.2, this.context.width * 0.8),
        randomRange(this.context.height * 0.2, this.context.height * 0.8),
        audio
      );
      this.autoTriggerTimer = 0;
    }

    // Update explosions
    this.explosions.forEach((explosion, expIdx) => {
      explosion.time += dt;
      const progress = explosion.time / explosion.maxTime;

      explosion.particles.forEach((p) => {
        // Physics
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Slow down
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Fade out
        p.life = 1 - progress;
        p.alpha = p.life;

        // Expand and fade
        if (progress < 0.2) {
          // Initial burst - particles accelerate
          p.size += dt * 10;
        } else {
          // Cooling - particles shrink
          p.size = Math.max(0.5, p.size - dt * 2);
        }
      });

      // Remove old explosions
      if (explosion.time >= explosion.maxTime) {
        this.explosions.splice(expIdx, 1);
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    this.explosions.forEach((explosion) => {
      const progress = explosion.time / explosion.maxTime;
      
      // Core flash (bright at start)
      if (progress < 0.3) {
        const coreAlpha = (1 - progress / 0.3) * 0.8;
        const coreSize = 30 + (progress / 0.3) * 100;
        
        this.graphics.beginFill(0xffffff, coreAlpha * 0.3);
        this.graphics.drawCircle(explosion.x, explosion.y, coreSize);
        this.graphics.endFill();

        this.graphics.beginFill(0xffff00, coreAlpha);
        this.graphics.drawCircle(explosion.x, explosion.y, coreSize * 0.5);
        this.graphics.endFill();
      }

      // Shockwave ring
      if (progress < 0.5) {
        const ringRadius = (progress / 0.5) * 300;
        const ringAlpha = (1 - progress / 0.5) * 0.6;
        
        this.graphics.lineStyle(3 + (audio.beat ? 2 : 0), 0xffffff, ringAlpha);
        this.graphics.drawCircle(explosion.x, explosion.y, ringRadius);
        
        this.graphics.lineStyle(5, 0xff6600, ringAlpha * 0.5);
        this.graphics.drawCircle(explosion.x, explosion.y, ringRadius * 0.95);
      }

      // Particles
      explosion.particles.forEach((p) => {
        if (p.life <= 0) return;

        const color = this.hslToHex(
          p.hue + progress * 30, // Shift from red to yellow
          100 - progress * 30,
          50 + progress * 30
        );

        // Particle glow
        this.graphics.beginFill(color, p.alpha * 0.3);
        this.graphics.drawCircle(p.x, p.y, p.size * 2);
        this.graphics.endFill();

        // Particle core
        this.graphics.beginFill(color, p.alpha);
        this.graphics.drawCircle(p.x, p.y, p.size);
        this.graphics.endFill();

        // Bright core for hot particles
        if (progress < 0.4 && p.size > 3) {
          this.graphics.beginFill(0xffffff, p.alpha * 0.8);
          this.graphics.drawCircle(p.x, p.y, p.size * 0.4);
          this.graphics.endFill();
        }
      });
    });
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

