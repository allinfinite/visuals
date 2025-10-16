import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Stroke {
  points: { x: number; y: number }[];
  color: number;
  alpha: number;
  width: number;
  age: number;
}

export class WatercolorFade implements Pattern {
  public name = 'Watercolor Fade';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private strokes: Stroke[] = [];
  private time: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.lastMouseX = context.width / 2;
    this.lastMouseY = context.height / 2;
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Age and fade strokes
    this.strokes.forEach((stroke) => {
      stroke.age += dt;
      stroke.alpha = Math.max(0, 1 - stroke.age / 5); // Fade over 5 seconds
    });

    // Remove old strokes
    this.strokes = this.strokes.filter((stroke) => stroke.alpha > 0.01);

    // Mouse painting
    if (input.isDragging || input.isDown) {
      const dx = input.x - this.lastMouseX;
      const dy = input.y - this.lastMouseY;
      const distance = Math.hypot(dx, dy);

      if (distance > 5) {
        // Create new stroke or add to existing
        if (this.strokes.length === 0 || this.strokes[this.strokes.length - 1].points.length > 50) {
          // New stroke
          const hue = (this.time * 30 + audio.centroid * 180) % 360;
          this.strokes.push({
            points: [{ x: input.x, y: input.y }],
            color: this.hslToHex(hue, 70 + audio.mid * 30, 50 + audio.treble * 20),
            alpha: 1,
            width: 10 + audio.rms * 40,
            age: 0,
          });
        } else {
          // Add to current stroke
          const currentStroke = this.strokes[this.strokes.length - 1];
          currentStroke.points.push({ x: input.x, y: input.y });
          currentStroke.width = 10 + audio.rms * 40; // Update width with audio
        }
      }

      this.lastMouseX = input.x;
      this.lastMouseY = input.y;
    }

    // Autonomous painting on beat
    if (audio.beat && Math.random() < 0.4) {
      const { width, height } = this.context;
      const hue = (this.time * 50 + audio.bass * 180) % 360;
      const points: { x: number; y: number }[] = [];
      
      // Create flowing curve
      const startX = randomRange(width * 0.2, width * 0.8);
      const startY = randomRange(height * 0.2, height * 0.8);
      const segments = 20 + Math.floor(audio.rms * 30);
      
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 * (1 + Math.sin(this.time + i * 0.1));
        const radius = 50 + i * 3;
        points.push({
          x: startX + Math.cos(angle) * radius,
          y: startY + Math.sin(angle) * radius,
        });
      }
      
      this.strokes.push({
        points,
        color: this.hslToHex(hue, 80, 60),
        alpha: 1,
        width: 8 + audio.rms * 30,
        age: 0,
      });
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw all strokes
    this.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      // Watercolor effect - draw multiple layers with decreasing opacity
      const layers = 5;
      for (let layer = 0; layer < layers; layer++) {
        const layerAlpha = stroke.alpha * (0.15 - layer * 0.02);
        const layerWidth = stroke.width * (1 + layer * 0.4);
        
        // Slightly blur by offsetting
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetY = (Math.random() - 0.5) * 2;

        this.graphics.lineStyle(layerWidth, stroke.color, layerAlpha);
        
        // Draw smooth curve through points
        this.graphics.moveTo(stroke.points[0].x + offsetX, stroke.points[0].y + offsetY);
        
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          this.graphics.quadraticCurveTo(
            stroke.points[i].x + offsetX,
            stroke.points[i].y + offsetY,
            xc + offsetX,
            yc + offsetY
          );
        }
        
        // Last point
        const last = stroke.points[stroke.points.length - 1];
        this.graphics.lineTo(last.x + offsetX, last.y + offsetY);
      }

      // Pigment diffusion - splatter effect around stroke
      if (audio.rms > 0.5 && stroke.age < 0.5) {
        const splatters = Math.floor(stroke.points.length * 0.1);
        for (let i = 0; i < splatters; i++) {
          const point = stroke.points[Math.floor(Math.random() * stroke.points.length)];
          const offsetDist = randomRange(5, 25);
          const offsetAngle = randomRange(0, Math.PI * 2);
          
          const splatterX = point.x + Math.cos(offsetAngle) * offsetDist;
          const splatterY = point.y + Math.sin(offsetAngle) * offsetDist;
          const splatterSize = randomRange(2, 8);
          
          this.graphics.beginFill(stroke.color, stroke.alpha * 0.2);
          this.graphics.drawCircle(splatterX, splatterY, splatterSize);
          this.graphics.endFill();
        }
      }
    });

    // Paper texture on low activity
    if (this.strokes.length === 0) {
      const { width, height } = this.context;
      const textX = width / 2;
      const textY = height / 2;
      
      // Draw a subtle hint
      this.graphics.lineStyle(2, 0xCCCCCC, 0.15);
      this.graphics.drawCircle(textX, textY, 50 + Math.sin(this.time * 2) * 10);
    }
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

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

