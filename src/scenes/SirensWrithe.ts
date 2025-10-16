import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface CurvePoint {
  x: number;
  y: number;
  controlX: number;
  controlY: number;
}

interface Curve {
  points: CurvePoint[];
  hue: number;
  lifetime: number;
  maxLifetime: number;
  thickness: number;
  tremblePhase: number;
  swell: number;
}

export class SirensWrithe implements Pattern {
  public name = "Siren's Writhe";
  public container: Container;
  private graphics: Graphics;
  private curves: Curve[] = [];
  private time: number = 0;
  private lastDragX: number = 0;
  private lastDragY: number = 0;
  private dragTrail: CurvePoint[] = [];

  constructor(private context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Mouse drag traces provocative, shuddering paths
    if (input.isDragging) {
      const dx = input.x - this.lastDragX;
      const dy = input.y - this.lastDragY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        // Add point to trail with control points for smooth curves
        const controlOffset = 20 + audio.rms * 30;
        const normal = { x: -dy / dist, y: dx / dist };
        
        this.dragTrail.push({
          x: input.x,
          y: input.y,
          controlX: input.x + normal.x * controlOffset,
          controlY: input.y + normal.y * controlOffset,
        });

        this.lastDragX = input.x;
        this.lastDragY = input.y;

        // Create curve when trail is long enough
        if (this.dragTrail.length > 10) {
          this.curves.push({
            points: [...this.dragTrail],
            hue: (audio.centroid * 360) % 360,
            lifetime: 0,
            maxLifetime: 4 + audio.rms * 3,
            thickness: 5 + audio.rms * 10,
            tremblePhase: Math.random() * Math.PI * 2,
            swell: 1,
          });
          this.dragTrail = [this.dragTrail[this.dragTrail.length - 1]];
        }
      }
    } else {
      if (this.dragTrail.length > 2) {
        // Finish curve
        this.curves.push({
          points: [...this.dragTrail],
          hue: (audio.centroid * 360) % 360,
          lifetime: 0,
          maxLifetime: 4 + audio.rms * 3,
          thickness: 5 + audio.rms * 10,
          tremblePhase: Math.random() * Math.PI * 2,
          swell: 1,
        });
      }
      this.dragTrail = [];
      this.lastDragX = input.x;
      this.lastDragY = input.y;
    }

    // Autonomous curve generation based on audio
    if (audio.beat || Math.random() < audio.rms * 0.02) {
      const points: CurvePoint[] = [];
      const startX = Math.random() * this.context.width;
      const startY = Math.random() * this.context.height;
      const segments = 8 + Math.floor(audio.treble * 12);

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 4 + this.time;
        const radius = 50 + t * 100 * audio.rms;
        
        points.push({
          x: startX + Math.cos(angle) * radius,
          y: startY + Math.sin(angle) * radius,
          controlX: startX + Math.cos(angle + 0.5) * radius * 1.2,
          controlY: startY + Math.sin(angle + 0.5) * radius * 1.2,
        });
      }

      this.curves.push({
        points,
        hue: (this.time * 50 + audio.bass * 180) % 360,
        lifetime: 0,
        maxLifetime: 3 + audio.rms * 2,
        thickness: 4 + audio.bass * 8,
        tremblePhase: Math.random() * Math.PI * 2,
        swell: 1,
      });
    }

    // Update curves
    this.curves.forEach((curve) => {
      curve.lifetime += dt;
      curve.tremblePhase += dt * 8;

      // RMS amplitude swells curves
      curve.swell = 1 + audio.rms * 0.5 + Math.sin(curve.tremblePhase) * 0.2;
      curve.thickness = (5 + audio.rms * 10) * curve.swell;

      // Hue shift
      curve.hue = (curve.hue + dt * 15 + audio.centroid * 10) % 360;

      // Shuddering effect - vibrate control points
      curve.points.forEach((point, i) => {
        const tremble = Math.sin(curve.tremblePhase + i * 0.5) * 3 * audio.treble;
        point.controlX += (Math.random() - 0.5) * tremble;
        point.controlY += (Math.random() - 0.5) * tremble;
      });
    });

    // Remove dead curves
    this.curves = this.curves.filter((c) => c.lifetime < c.maxLifetime);

    // Limit count
    if (this.curves.length > 30) {
      this.curves.shift();
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw curves with glossy, flesh-like texture
    this.curves.forEach((curve) => {
      if (curve.points.length < 2) return;

      const alpha = (1 - curve.lifetime / curve.maxLifetime) * 0.9;
      const color = hslToHex(curve.hue, 75, 55);
      const glowColor = hslToHex(curve.hue, 90, 70);
      const highlightColor = hslToHex(curve.hue, 60, 80);

      // Pulsating sheen layer
      const pulse = 1 + Math.sin(this.time * 6 + curve.tremblePhase) * 0.2;
      this.graphics.lineStyle(curve.thickness * 2 * pulse, glowColor, alpha * 0.3);
      this.drawBezierCurve(curve);

      // Main glossy curve
      this.graphics.lineStyle(curve.thickness * curve.swell, color, alpha);
      this.drawBezierCurve(curve);

      // Highlight sheen (wet, glossy surface)
      this.graphics.lineStyle(curve.thickness * 0.4 * curve.swell, highlightColor, alpha * 0.7);
      curve.points.forEach((point, i) => {
        if (i === 0) {
          this.graphics.moveTo(point.x - 2, point.y - 2);
        } else {
          const prev = curve.points[i - 1];
          this.graphics.quadraticCurveTo(
            prev.controlX - 2,
            prev.controlY - 2,
            point.x - 2,
            point.y - 2
          );
        }
      });

      // Trembling glow at curve tips
      const firstPoint = curve.points[0];
      const lastPoint = curve.points[curve.points.length - 1];
      const tipGlow = curve.thickness * 1.5 * (1 + (audio.beat ? 0.5 : 0));
      
      this.graphics.beginFill(0xffffff, alpha * 0.5 * pulse);
      this.graphics.drawCircle(firstPoint.x, firstPoint.y, tipGlow);
      this.graphics.drawCircle(lastPoint.x, lastPoint.y, tipGlow);
      this.graphics.endFill();
    });

    // Draw active drag trail
    if (this.dragTrail.length > 1) {
      const color = hslToHex((audio.centroid * 360) % 360, 80, 60);
      this.graphics.lineStyle(4 + audio.rms * 8, color, 0.8);
      this.dragTrail.forEach((point, i) => {
        if (i === 0) {
          this.graphics.moveTo(point.x, point.y);
        } else {
          const prev = this.dragTrail[i - 1];
          this.graphics.quadraticCurveTo(
            prev.controlX,
            prev.controlY,
            point.x,
            point.y
          );
        }
      });
    }
  }

  private drawBezierCurve(curve: Curve): void {
    curve.points.forEach((point, i) => {
      if (i === 0) {
        this.graphics.moveTo(point.x, point.y);
      } else {
        const prev = curve.points[i - 1];
        this.graphics.quadraticCurveTo(prev.controlX, prev.controlY, point.x, point.y);
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

