import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { curlNoise2D } from '../utils/noise';
import { randomRange } from '../utils/math';

interface FieldLine {
  points: { x: number; y: number }[];
  hue: number;
  life: number;
}

export class MagneticLines implements Pattern {
  public name = 'Magnetic Lines';
  public container: Container;
  private graphics: Graphics;
  private lines: FieldLine[] = [];
  private context: RendererContext;
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initLines();
  }

  private initLines(): void {
    const gridSize = 30;
    for (let i = 0; i < gridSize; i++) {
      const x = Math.random() * this.context.width;
      const y = Math.random() * this.context.height;
      this.lines.push({
        points: [{ x, y }],
        hue: Math.random() * 360,
        life: 1,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn lines on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.lines.length < 50) {
        for (let i = 0; i < 5; i++) {
          this.lines.push({
            points: [{ x: click.x, y: click.y }],
            hue: audio.centroid * 360,
            life: 1,
          });
        }
      }
    });
    
    // Autonomous spawning based on beat
    if (audio.beat && this.lines.length < 40 && Math.random() < 0.5) {
      const x = randomRange(this.context.width * 0.2, this.context.width * 0.8);
      const y = randomRange(this.context.height * 0.2, this.context.height * 0.8);
      for (let i = 0; i < 3; i++) {
        this.lines.push({
          points: [{ x, y }],
          hue: audio.centroid * 360,
          life: 1,
        });
      }
    }

    // Update lines
    this.lines.forEach((line) => {
      const last = line.points[line.points.length - 1];

      // Apply magnetic field (curl noise + cursor attraction)
      const [noiseX, noiseY] = curlNoise2D(
        last.x * 0.003,
        last.y * 0.003 + this.time * 0.1
      );

      // Cursor creates magnetic pole
      const dx = input.x - last.x;
      const dy = input.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let magneticX = noiseX * 5;
      let magneticY = noiseY * 5;

      if (dist > 1 && dist < 300) {
        const force = (1 / dist) * 100;
        magneticX += (dx / dist) * force;
        magneticY += (dy / dist) * force;
      }

      // Modulate by audio
      const curvature = 1 + audio.centroid * 2;
      const newX = last.x + magneticX * curvature;
      const newY = last.y + magneticY * curvature;

      line.points.push({ x: newX, y: newY });

      // Limit points
      if (line.points.length > 150) {
        line.points.shift();
      }

      // Update hue
      line.hue += audio.treble * 50 * dt;
      line.hue %= 360;
    });

    // Remove old lines occasionally
    if (this.lines.length > 40) {
      this.lines.shift();
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    this.graphics.clear();

    this.lines.forEach((line) => {
      if (line.points.length < 2) return;

      const brightness = 50 + audio.bass * 30;
      const alpha = 0.4 + audio.mid * 0.4;

      this.graphics.lineStyle(
        1 + (audio.beat ? 2 : 0),
        this.hslToHex(line.hue, 70, brightness),
        alpha
      );
      this.graphics.moveTo(line.points[0].x, line.points[0].y);
      
      for (let i = 1; i < line.points.length; i++) {
        const point = line.points[i];
        this.graphics.lineTo(point.x, point.y);
      }
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

