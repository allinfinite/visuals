import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface TrailPoint {
  x: number;
  y: number;
  size: number;
  age: number;
  maxAge: number;
  hue: number;
  alpha: number;
}

export class ShadowTrails implements Pattern {
  public name = 'Shadow Trails';
  public container: Container;
  private graphics: Graphics;
  private trailPoints: TrailPoint[] = [];
  private time: number = 0;
  private lastX: number = 0;
  private lastY: number = 0;

  constructor(context: RendererContext) {
    this.lastX = context.width / 2;
    this.lastY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Always track cursor position
    const currentX = input.x;
    const currentY = input.y;
    const velocity = Math.hypot(currentX - this.lastX, currentY - this.lastY);

    // Add trail points when moving or on beat
    if (velocity > 1 || audio.beat) {
      const size = 10 + audio.rms * 30 + (velocity * 0.3);
      const hue = (this.time * 50 + audio.centroid * 180) % 360;
      
      this.trailPoints.push({
        x: currentX,
        y: currentY,
        size,
        age: 0,
        maxAge: 1 + audio.rms * 2,
        hue,
        alpha: 0.8 + audio.bass * 0.2,
      });
    }

    // Auto-generate trails when static (ambient mode)
    if (velocity < 5 && Math.random() < 0.05) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 100;
      const x = currentX + Math.cos(angle) * radius;
      const y = currentY + Math.sin(angle) * radius;
      
      this.trailPoints.push({
        x,
        y,
        size: 15 + audio.rms * 20,
        age: 0,
        maxAge: 0.8,
        hue: (this.time * 80) % 360,
        alpha: 0.5,
      });
    }

    // Update trail points
    this.trailPoints.forEach((point) => {
      point.age += dt;
      
      // Fade out over lifetime
      const lifeRatio = point.age / point.maxAge;
      point.alpha = (1 - lifeRatio) * 0.8;
      point.size *= 0.99; // Shrink slightly
    });

    // Remove expired points
    this.trailPoints = this.trailPoints.filter(p => p.age < p.maxAge);

    // Limit trail length
    if (this.trailPoints.length > 200) {
      this.trailPoints = this.trailPoints.slice(-150);
    }

    this.lastX = currentX;
    this.lastY = currentY;

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    // Draw shadow/trail points
    this.trailPoints.forEach((point) => {
      if (point.alpha < 0.05) return;

      // Shadow color (darker with slight hue)
      const shadowColor = this.hslToHex(point.hue, 40, 10);
      const highlightColor = this.hslToHex(point.hue, 80, 50);

      // Outer shadow glow
      this.graphics.beginFill(shadowColor, point.alpha * 0.3);
      this.graphics.drawCircle(point.x, point.y, point.size * 2);
      this.graphics.endFill();

      // Main shadow
      this.graphics.beginFill(shadowColor, point.alpha * 0.6);
      this.graphics.drawCircle(point.x, point.y, point.size);
      this.graphics.endFill();

      // Highlight
      if (point.age < point.maxAge * 0.3) {
        this.graphics.beginFill(highlightColor, point.alpha * 0.4);
        this.graphics.drawCircle(point.x, point.y, point.size * 0.5);
        this.graphics.endFill();
      }
    });

    // Draw cursor position indicator
    const cursorSize = 5 + Math.sin(this.time * 5) * 2 + audio.rms * 10;
    const cursorHue = (this.time * 100) % 360;
    
    this.graphics.lineStyle(2, this.hslToHex(cursorHue, 80, 60), 0.6 + (audio.beat ? 0.4 : 0));
    this.graphics.drawCircle(this.lastX, this.lastY, cursorSize);
    
    // Crosshair
    this.graphics.moveTo(this.lastX - cursorSize - 5, this.lastY);
    this.graphics.lineTo(this.lastX + cursorSize + 5, this.lastY);
    this.graphics.moveTo(this.lastX, this.lastY - cursorSize - 5);
    this.graphics.lineTo(this.lastX, this.lastY + cursorSize + 5);
  }

  private hslToHex(h: number, s: number, l: number): number {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));

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

    const red = Math.max(0, Math.min(255, Math.round((r + m) * 255)));
    const green = Math.max(0, Math.min(255, Math.round((g + m) * 255)));
    const blue = Math.max(0, Math.min(255, Math.round((b + m) * 255)));

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

