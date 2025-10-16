import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Dot {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  phase: number;
  speed: number;
}

export class MinimalDots implements Pattern {
  public name = 'Minimal Dots';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private dots: Dot[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initDots();
  }

  private initDots(): void {
    for (let i = 0; i < 30; i++) {
      this.spawnDot();
    }
  }

  private spawnDot(): void {
    const x = randomRange(0, this.context.width);
    const y = randomRange(0, this.context.height);
    
    this.dots.push({
      x,
      y,
      targetX: x,
      targetY: y,
      size: randomRange(2, 6),
      phase: Math.random() * Math.PI * 2,
      speed: randomRange(10, 30),
    });
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;

    // BPM-based breathing rate (more dynamic)
    const breathingRate = 0.9 + audio.rms * 0.8 + audio.bass * 0.3;

    // Update dots
    this.dots.forEach((dot) => {
      // Pick new target if reached
      const dx = dot.targetX - dot.x;
      const dy = dot.targetY - dot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        dot.targetX = randomRange(this.context.width * 0.1, this.context.width * 0.9);
        dot.targetY = randomRange(this.context.height * 0.1, this.context.height * 0.9);
      } else {
        // Move towards target
        dot.x += (dx / dist) * dot.speed * dt;
        dot.y += (dy / dist) * dot.speed * dt;
      }

      // Update breathing phase
      dot.phase += breathingRate * dt;
    });

    // Spawn/remove dots to maintain count based on audio
    const targetCount = Math.floor(20 + audio.mid * 30);
    
    if (this.dots.length < targetCount && Math.random() < 0.1) {
      this.spawnDot();
    } else if (this.dots.length > targetCount) {
      this.dots.pop();
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    this.graphics.clear();

    this.dots.forEach((dot) => {
      // Breathing effect
      const breathing = Math.sin(dot.phase) * 0.3 + 0.7;
      const size = dot.size * breathing * (0.8 + audio.rms * 0.4);
      const alpha = 0.4 + breathing * 0.4 + (audio.beat ? 0.2 : 0);

      // Minimal monochrome palette
      const brightness = 0.6 + breathing * 0.4;
      const color = this.hslToHex(0, 0, brightness * 100);

      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(dot.x, dot.y, size);
      this.graphics.endFill();
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
    // Clamp inputs to valid ranges
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
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

