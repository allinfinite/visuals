import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Point {
  x: number;
  y: number;
}

interface Sigil {
  points: Point[];
  centerX: number;
  centerY: number;
  age: number;
  maxAge: number;
  color: number;
  glow: number;
  rotation: number;
  scale: number;
  alpha: number;
}

export class SigilGlyphs implements Pattern {
  public name = 'Sigil Glyphs';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private sigils: Sigil[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  private generateSigil(x: number, y: number, complexity: number): Sigil {
    const points: Point[] = [];
    const pointCount = Math.floor(randomRange(5, complexity));
    const radius = randomRange(30, 80);

    // Generate points in a circular arrangement with variation
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2 + randomRange(-0.3, 0.3);
      const dist = radius * randomRange(0.3, 1);
      
      points.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      });
    }

    // Add some random interior points
    const interiorPoints = Math.floor(pointCount * 0.5);
    for (let i = 0; i < interiorPoints; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const dist = radius * randomRange(0, 0.6);
      
      points.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      });
    }

    return {
      points,
      centerX: x,
      centerY: y,
      age: 0,
      maxAge: randomRange(8, 15),
      color: this.hslToHex(randomRange(0, 360), 80, 60),
      glow: randomRange(0.5, 1),
      rotation: randomRange(0, Math.PI * 2),
      scale: 0,
      alpha: 0,
    };
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn sigil on click
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        const complexity = 8 + audio.rms * 8;
        this.sigils.push(this.generateSigil(click.x, click.y, complexity));
      }
    });

    // Auto-spawn sigils on beat
    if (audio.beat && Math.random() < 0.3) {
      const x = randomRange(this.context.width * 0.2, this.context.width * 0.8);
      const y = randomRange(this.context.height * 0.2, this.context.height * 0.8);
      const complexity = 10;
      this.sigils.push(this.generateSigil(x, y, complexity));
    }

    // Update sigils
    this.sigils.forEach((sigil) => {
      sigil.age += dt;

      // Lifecycle animation
      const lifeProgress = sigil.age / sigil.maxAge;

      if (lifeProgress < 0.2) {
        // Fade in and grow
        sigil.alpha = lifeProgress / 0.2;
        sigil.scale = lifeProgress / 0.2;
      } else if (lifeProgress < 0.8) {
        // Stable
        sigil.alpha = 1;
        sigil.scale = 1 + Math.sin(this.time * 2) * 0.1;
      } else {
        // Fade out
        const fadeProgress = (lifeProgress - 0.8) / 0.2;
        sigil.alpha = 1 - fadeProgress;
        sigil.scale = 1 + fadeProgress * 0.5;
      }

      // Gentle rotation
      sigil.rotation += (0.1 + audio.rms * 0.3) * dt;

      // Glow pulsates
      sigil.glow = 0.5 + Math.sin(this.time * 3 + sigil.age) * 0.3 + audio.bass * 0.4;

      // Color shift
      const baseHue = this.hexToHsl(sigil.color).h;
      const newHue = (baseHue + dt * 20 + audio.centroid * 30) % 360;
      sigil.color = this.hslToHex(newHue, 80, 60);
    });

    // Remove expired sigils
    this.sigils = this.sigils.filter(s => s.age < s.maxAge);

    // Limit total sigils
    if (this.sigils.length > 20) {
      this.sigils = this.sigils.slice(-15);
    }

    this.draw(audio);
  }

  private draw(_audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    this.sigils.forEach((sigil) => {
      if (sigil.alpha < 0.01) return;

      // Draw glow
      this.graphics.beginFill(sigil.color, sigil.alpha * 0.2 * sigil.glow);
      for (let i = 0; i < sigil.points.length; i++) {
        const point = this.transformPoint(sigil.points[i], sigil);
        this.graphics.drawCircle(point.x, point.y, 20 * sigil.scale);
      }
      this.graphics.endFill();

      // Draw connecting lines (create sigil pattern)
      this.graphics.lineStyle(2 * sigil.scale, sigil.color, sigil.alpha * 0.8);

      // Connect all points to create intricate pattern
      for (let i = 0; i < sigil.points.length; i++) {
        const point1 = this.transformPoint(sigil.points[i], sigil);
        
        // Connect to next point in sequence
        const nextIdx = (i + 1) % sigil.points.length;
        const point2 = this.transformPoint(sigil.points[nextIdx], sigil);
        
        this.graphics.moveTo(point1.x, point1.y);
        this.graphics.lineTo(point2.x, point2.y);

        // Also connect to point across (creates star patterns)
        if (sigil.points.length > 4) {
          const acrossIdx = (i + Math.floor(sigil.points.length / 2)) % sigil.points.length;
          const point3 = this.transformPoint(sigil.points[acrossIdx], sigil);
          
          this.graphics.lineStyle(1 * sigil.scale, sigil.color, sigil.alpha * 0.4);
          this.graphics.moveTo(point1.x, point1.y);
          this.graphics.lineTo(point3.x, point3.y);
          this.graphics.lineStyle(2 * sigil.scale, sigil.color, sigil.alpha * 0.8);
        }
      }

      // Draw points (nodes)
      for (let i = 0; i < sigil.points.length; i++) {
        const point = this.transformPoint(sigil.points[i], sigil);
        const nodeSize = 4 * sigil.scale;

        // Outer glow
        this.graphics.beginFill(sigil.color, sigil.alpha * 0.5 * sigil.glow);
        this.graphics.drawCircle(point.x, point.y, nodeSize * 2);
        this.graphics.endFill();

        // Node
        this.graphics.beginFill(sigil.color, sigil.alpha);
        this.graphics.drawCircle(point.x, point.y, nodeSize);
        this.graphics.endFill();

        // Core
        this.graphics.beginFill(0xffffff, sigil.alpha * 0.8);
        this.graphics.drawCircle(point.x, point.y, nodeSize * 0.4);
        this.graphics.endFill();
      }

      // Draw center symbol
      const centerSize = 6 * sigil.scale;
      this.graphics.beginFill(0xffffff, sigil.alpha * sigil.glow);
      this.graphics.drawCircle(sigil.centerX, sigil.centerY, centerSize);
      this.graphics.endFill();

      this.graphics.lineStyle(2 * sigil.scale, sigil.color, sigil.alpha);
      this.graphics.drawCircle(sigil.centerX, sigil.centerY, centerSize * 2);
    });
  }

  private transformPoint(point: Point, sigil: Sigil): Point {
    // Apply rotation and scale
    const cos = Math.cos(sigil.rotation);
    const sin = Math.sin(sigil.rotation);
    
    const rotatedX = point.x * cos - point.y * sin;
    const rotatedY = point.x * sin + point.y * cos;

    return {
      x: sigil.centerX + rotatedX * sigil.scale,
      y: sigil.centerY + rotatedY * sigil.scale,
    };
  }

  private hslToHex(h: number, s: number, l: number): number {
    // Clamp inputs to valid ranges
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

  private hexToHsl(hex: number): { h: number; s: number; l: number } {
    const r = ((hex >> 16) & 0xff) / 255;
    const g = ((hex >> 8) & 0xff) / 255;
    const b = (hex & 0xff) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;

      return { h: h * 360, s: s * 100, l: l * 100 };
    }

    return { h: 0, s: 0, l: l * 100 };
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

