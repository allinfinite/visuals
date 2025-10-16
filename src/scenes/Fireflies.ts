import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  phase: number;
  flickerSpeed: number;
  size: number;
  hue: number;
}

export class Fireflies implements Pattern {
  public name = 'Fireflies';
  public container: Container;
  private graphics: Graphics;
  private fireflies: Firefly[] = [];
  private context: RendererContext;
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initFireflies();
  }

  private initFireflies(): void {
    for (let i = 0; i < 100; i++) {
      this.spawnFirefly(
        randomRange(0, this.context.width),
        randomRange(0, this.context.height)
      );
    }
  }

  private spawnFirefly(x: number, y: number): void {
    this.fireflies.push({
      x,
      y,
      vx: 0,
      vy: 0,
      targetX: randomRange(0, this.context.width),
      targetY: randomRange(0, this.context.height),
      phase: Math.random() * Math.PI * 2,
      flickerSpeed: randomRange(2, 4),
      size: randomRange(3, 6),
      hue: randomRange(40, 60), // Yellow-ish
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn clusters on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.fireflies.length < 300) {
        const count = Math.floor(10 * (1 + audio.bass * 2));
        for (let i = 0; i < count; i++) {
          this.spawnFirefly(
            click.x + randomRange(-50, 50),
            click.y + randomRange(-50, 50)
          );
        }
      }
    });
    
    // Autonomous spawning on beats
    if (audio.beat && this.fireflies.length < 200 && Math.random() < 0.3) {
      const x = randomRange(this.context.width * 0.1, this.context.width * 0.9);
      const y = randomRange(this.context.height * 0.1, this.context.height * 0.9);
      const count = Math.floor(5 + audio.bass * 5);
      for (let i = 0; i < count; i++) {
        this.spawnFirefly(
          x + randomRange(-30, 30),
          y + randomRange(-30, 30)
        );
      }
    }

    // Update fireflies
    this.fireflies.forEach((f) => {
      // Blink to beat
      if (audio.beat) {
        f.phase = 0;
      } else {
        f.phase += f.flickerSpeed * dt;
      }

      // Wander behavior
      const dx = f.targetX - f.x;
      const dy = f.targetY - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 20) {
        // Pick new target
        f.targetX = randomRange(0, this.context.width);
        f.targetY = randomRange(0, this.context.height);
      } else {
        // Move toward target
        f.vx += (dx / dist) * 0.5;
        f.vy += (dy / dist) * 0.5;
      }

      // Damping
      f.vx *= 0.95;
      f.vy *= 0.95;

      // Update position
      f.x += f.vx;
      f.y += f.vy;

      // Wrap
      if (f.x < 0) f.x = this.context.width;
      if (f.x > this.context.width) f.x = 0;
      if (f.y < 0) f.y = this.context.height;
      if (f.y > this.context.height) f.y = 0;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    // this.graphics.clear();

    this.fireflies.forEach((f) => {
      // Sine wave flicker
      const brightness = (Math.sin(f.phase) * 0.5 + 0.5) * (0.7 + audio.rms * 0.3);
      const alpha = brightness * 0.8;
      const size = f.size * (0.8 + brightness * 0.4);

      // Glow effect
      this.graphics.beginFill(this.hslToHex(f.hue, 100, 30), alpha * 0.3);
      this.graphics.drawCircle(f.x, f.y, size * 2);
      this.graphics.endFill();

      this.graphics.beginFill(this.hslToHex(f.hue, 100, 80), alpha);
      this.graphics.drawCircle(f.x, f.y, size);
      this.graphics.endFill();
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

