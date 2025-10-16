import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Ribbon {
  points: { x: number; y: number }[];
  hue: number;
  width: number;
  targetX: number;
  targetY: number;
}

export class RibbonTrails implements Pattern {
  public name = 'Ribbon Trails';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private ribbons: Ribbon[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initRibbons();
  }

  private initRibbons(): void {
    for (let i = 0; i < 5; i++) {
      this.spawnRibbon();
    }
  }

  private spawnRibbon(): void {
    this.ribbons.push({
      points: [{
        x: randomRange(0, this.context.width),
        y: randomRange(0, this.context.height),
      }],
      hue: randomRange(0, 360),
      width: randomRange(5, 15),
      targetX: randomRange(0, this.context.width),
      targetY: randomRange(0, this.context.height),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn ribbons on click or autonomously
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.ribbons.length < 15) {
        this.ribbons.push({
          points: [{ x: click.x, y: click.y }],
          hue: audio.centroid * 360,
          width: 10 + audio.bass * 10,
          targetX: click.x,
          targetY: click.y,
        });
      }
    });

    // Autonomous spawning
    if (this.ribbons.length < 10 && Math.random() < 0.02) {
      this.spawnRibbon();
    }

    // Update ribbons
    this.ribbons.forEach((ribbon) => {
      const last = ribbon.points[ribbon.points.length - 1];

      // Follow cursor if nearby, otherwise follow target
      const distToCursor = Math.sqrt(
        Math.pow(input.x - last.x, 2) + Math.pow(input.y - last.y, 2)
      );

      let targetX = ribbon.targetX;
      let targetY = ribbon.targetY;

      if (distToCursor < 200) {
        targetX = input.x;
        targetY = input.y;
      } else if (Math.abs(last.x - ribbon.targetX) < 20 && Math.abs(last.y - ribbon.targetY) < 20) {
        // Reached target, pick new one
        ribbon.targetX = randomRange(0, this.context.width);
        ribbon.targetY = randomRange(0, this.context.height);
      }

      // Smooth following with spline-like motion
      const dx = targetX - last.x;
      const dy = targetY - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        const speed = 2 + audio.rms * 3;
        const newX = last.x + (dx / dist) * speed;
        const newY = last.y + (dy / dist) * speed;

        ribbon.points.push({ x: newX, y: newY });

        // Limit points
        if (ribbon.points.length > 100) {
          ribbon.points.shift();
        }
      }

      // Width modulated by amplitude
      ribbon.width = 5 + audio.rms * 15;
      ribbon.hue += audio.treble * 20 * dt;
      ribbon.hue %= 360;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    this.graphics.clear();

    this.ribbons.forEach((ribbon) => {
      if (ribbon.points.length < 2) return;

      const alpha = 0.3 + audio.mid * 0.4;

      // Draw ribbon as tapered spline
      for (let i = 1; i < ribbon.points.length; i++) {
        const prev = ribbon.points[i - 1];
        const curr = ribbon.points[i];
        const progress = i / ribbon.points.length;
        const width = ribbon.width * (1 - progress * 0.5) * (0.8 + audio.bass * 0.4);

        this.graphics.lineStyle(width, this.hslToHex(ribbon.hue, 80, 60), alpha);
        this.graphics.moveTo(prev.x, prev.y);
        this.graphics.lineTo(curr.x, curr.y);
      }
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

