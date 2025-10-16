import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface PaintStroke {
  points: { x: number; y: number; width: number; pressure: number }[];
  color: number;
  age: number;
  maxAge: number;
  alpha: number;
}

export class AudioPaint implements Pattern {
  public name = 'Audio Paint';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private strokes: PaintStroke[] = [];
  private currentStroke: PaintStroke | null = null;
  private time: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Start new stroke on mouse down
    if (input.isDown && !this.currentStroke) {
      const hue = (this.time * 50 + audio.centroid * 180) % 360;
      this.currentStroke = {
        points: [],
        color: this.hslToHex(hue, 80, 60),
        age: 0,
        maxAge: 10,
        alpha: 1,
      };
    }

    // Add points to current stroke while dragging
    if (input.isDragging && this.currentStroke) {
      const dx = input.x - this.lastMouseX;
      const dy = input.y - this.lastMouseY;
      const velocity = Math.hypot(dx, dy);

      // Stroke width based on RMS and velocity
      const baseWidth = 5 + audio.rms * 40;
      const velocityFactor = Math.max(0.3, 1 - velocity * 0.01);
      const width = baseWidth * velocityFactor;

      // Pressure simulation (varies with audio)
      const pressure = 0.5 + audio.bass * 0.5;

      this.currentStroke.points.push({
        x: input.x,
        y: input.y,
        width,
        pressure,
      });

      // Limit points per stroke for performance
      if (this.currentStroke.points.length > 500) {
        this.currentStroke.points = this.currentStroke.points.slice(-400);
      }
    }

    // Finish stroke on mouse up
    if (!input.isDown && this.currentStroke) {
      if (this.currentStroke.points.length > 2) {
        this.strokes.push(this.currentStroke);
      }
      this.currentStroke = null;
    }

    // Update existing strokes
    this.strokes.forEach((stroke) => {
      stroke.age += dt;
      
      // Fade out old strokes
      const fadeStart = stroke.maxAge * 0.7;
      if (stroke.age > fadeStart) {
        const fadeProgress = (stroke.age - fadeStart) / (stroke.maxAge - fadeStart);
        stroke.alpha = 1 - fadeProgress;
      }
    });

    // Remove expired strokes
    this.strokes = this.strokes.filter(s => s.age < s.maxAge);

    // Auto-paint based on audio (when not dragging)
    if (!input.isDragging && audio.beat && Math.random() < 0.3) {
      this.createAutoPaintStroke(audio);
    }

    // Limit total strokes
    if (this.strokes.length > 50) {
      this.strokes = this.strokes.slice(-40);
    }

    this.lastMouseX = input.x;
    this.lastMouseY = input.y;

    this.draw(audio);
  }

  private createAutoPaintStroke(audio: AudioData): void {
    const hue = (this.time * 80 + audio.centroid * 180) % 360;
    const stroke: PaintStroke = {
      points: [],
      color: this.hslToHex(hue, 80, 60),
      age: 0,
      maxAge: 8,
      alpha: 1,
    };

    // Generate a curved stroke
    const startX = this.context.width * (0.2 + Math.random() * 0.6);
    const startY = this.context.height * (0.2 + Math.random() * 0.6);
    const angle = Math.random() * Math.PI * 2;
    const length = 100 + audio.rms * 200;
    const curvature = (Math.random() - 0.5) * 2;

    const pointCount = 20;
    for (let i = 0; i <= pointCount; i++) {
      const t = i / pointCount;
      const dist = length * t;
      const curveOffset = Math.sin(t * Math.PI) * curvature * 50;
      
      const x = startX + Math.cos(angle) * dist + Math.sin(angle) * curveOffset;
      const y = startY + Math.sin(angle) * dist - Math.cos(angle) * curveOffset;
      
      const width = (5 + audio.rms * 30) * (1 - t * 0.5);
      const pressure = 0.5 + Math.sin(t * Math.PI) * 0.5;

      stroke.points.push({ x, y, width, pressure });
    }

    this.strokes.push(stroke);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    // Draw all strokes
    [...this.strokes, this.currentStroke].forEach((stroke) => {
      if (!stroke || stroke.points.length < 2) return;

      // Draw stroke with variable width
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];

        const avgWidth = (p1.width + p2.width) / 2;
        const avgPressure = (p1.pressure + p2.pressure) / 2;

        // Outer soft edge
        this.graphics.lineStyle(
          avgWidth * 1.5,
          stroke.color,
          stroke.alpha * 0.2 * avgPressure
        );
        this.graphics.moveTo(p1.x, p1.y);
        this.graphics.lineTo(p2.x, p2.y);

        // Main stroke
        this.graphics.lineStyle(
          avgWidth,
          stroke.color,
          stroke.alpha * 0.8 * avgPressure
        );
        this.graphics.moveTo(p1.x, p1.y);
        this.graphics.lineTo(p2.x, p2.y);

        // Core highlight
        const coreColor = this.lightenColor(stroke.color, 30);
        this.graphics.lineStyle(
          avgWidth * 0.4,
          coreColor,
          stroke.alpha * 0.6 * avgPressure
        );
        this.graphics.moveTo(p1.x, p1.y);
        this.graphics.lineTo(p2.x, p2.y);
      }

      // Draw stroke endpoints as dots
      if (stroke.points.length > 0) {
        const firstPoint = stroke.points[0];
        const lastPoint = stroke.points[stroke.points.length - 1];

        // Start cap
        this.graphics.beginFill(stroke.color, stroke.alpha * 0.8);
        this.graphics.drawCircle(firstPoint.x, firstPoint.y, firstPoint.width / 2);
        this.graphics.endFill();

        // End cap
        this.graphics.beginFill(stroke.color, stroke.alpha * 0.8);
        this.graphics.drawCircle(lastPoint.x, lastPoint.y, lastPoint.width / 2);
        this.graphics.endFill();
      }
    });

    // Draw brush indicator at cursor (when active)
    if (this.currentStroke) {
      const brushSize = 5 + audio.rms * 40;
      const hue = (this.time * 50 + audio.centroid * 180) % 360;
      const brushColor = this.hslToHex(hue, 80, 60);

      this.graphics.beginFill(brushColor, 0.3);
      this.graphics.drawCircle(this.lastMouseX, this.lastMouseY, brushSize);
      this.graphics.endFill();

      this.graphics.lineStyle(2, brushColor, 0.8);
      this.graphics.drawCircle(this.lastMouseX, this.lastMouseY, brushSize);
    }
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

  private lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + amount);
    const g = Math.min(255, ((color >> 8) & 0xff) + amount);
    const b = Math.min(255, (color & 0xff) + amount);

    return (r << 16) | (g << 8) | b;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

