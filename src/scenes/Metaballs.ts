import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
}

export class Metaballs implements Pattern {
  public name = 'Liquid Color Blobs';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private balls: Ball[] = [];
  private time: number = 0;
  private resolution: number = 12; // Lower = higher quality but slower

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initBalls();
  }

  private initBalls(): void {
    for (let i = 0; i < 5; i++) {
      this.spawnBall();
    }
  }

  private spawnBall(): void {
    this.balls.push({
      x: randomRange(100, this.context.width - 100),
      y: randomRange(100, this.context.height - 100),
      vx: randomRange(-50, 50),
      vy: randomRange(-50, 50),
      radius: randomRange(40, 80),
      hue: randomRange(0, 360),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn blob on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.balls.length < 12) {
        this.balls.push({
          x: click.x,
          y: click.y,
          vx: randomRange(-30, 30),
          vy: randomRange(-30, 30),
          radius: 50 + audio.bass * 40,
          hue: audio.centroid * 360,
        });
      }
    });

    // Autonomous spawning
    if (this.balls.length < 8 && Math.random() < 0.01) {
      this.spawnBall();
    }

    // Update balls
    this.balls.forEach((ball) => {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Bounce off walls
      if (ball.x < ball.radius || ball.x > this.context.width - ball.radius) {
        ball.vx *= -1;
        ball.x = Math.max(ball.radius, Math.min(this.context.width - ball.radius, ball.x));
      }
      if (ball.y < ball.radius || ball.y > this.context.height - ball.radius) {
        ball.vy *= -1;
        ball.y = Math.max(ball.radius, Math.min(this.context.height - ball.radius, ball.y));
      }

      // Audio modulation
      ball.radius = ball.radius * 0.99 + (40 + audio.bass * 60) * 0.01;
      ball.hue += audio.treble * 50 * dt;
      ball.hue %= 360;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    // this.graphics.clear();

    const width = this.context.width;
    const height = this.context.height;
    const threshold = 1.0;

    // Metaball field calculation with SDF blending
    for (let y = 0; y < height; y += this.resolution) {
      for (let x = 0; x < width; x += this.resolution) {
        let sum = 0;
        let colorSum = { r: 0, g: 0, b: 0 };

        this.balls.forEach((ball) => {
          const dx = x - ball.x;
          const dy = y - ball.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq > 0) {
            const influence = (ball.radius * ball.radius) / distSq;
            sum += influence;

            // Accumulate color
            const rgb = this.hslToRgb(ball.hue, 80, 50);
            colorSum.r += rgb.r * influence;
            colorSum.g += rgb.g * influence;
            colorSum.b += rgb.b * influence;
          }
        });

        if (sum >= threshold) {
          // Normalize color
          colorSum.r /= sum;
          colorSum.g /= sum;
          colorSum.b /= sum;

          const alpha = Math.min(0.6, (sum - threshold) * 0.3) * (0.6 + audio.mid * 0.4);
          const color = (Math.round(colorSum.r) << 16) | 
                       (Math.round(colorSum.g) << 8) | 
                       Math.round(colorSum.b);

          this.graphics.beginFill(color, alpha);
          this.graphics.drawRect(x, y, this.resolution, this.resolution);
          this.graphics.endFill();
        }
      }
    }
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return { r: f(0), g: f(8), b: f(4) };
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

