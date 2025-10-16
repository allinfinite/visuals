import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { curlNoise2D } from '../utils/noise';

export class VectorFlow implements Pattern {
  public name = 'Vector Flow Field';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt * (0.5 + audio.rms * 1.5);
    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    // this.graphics.clear();

    const gridSize = 30;
    const arrowLength = 15 + audio.bass * 10;

    for (let x = 0; x < this.context.width; x += gridSize) {
      for (let y = 0; y < this.context.height; y += gridSize) {
        // Get flow direction from curl noise
        const [fx, fy] = curlNoise2D(
          x * 0.005,
          y * 0.005 + this.time * 0.1
        );

        const angle = Math.atan2(fy, fx);
        const strength = Math.sqrt(fx * fx + fy * fy);

        // Arrow end point
        const endX = x + Math.cos(angle) * arrowLength * strength;
        const endY = y + Math.sin(angle) * arrowLength * strength;

        // Color based on direction
        const hue = ((angle / Math.PI + 1) * 180 + this.time * 20) % 360;
        const alpha = 0.3 + strength * 0.4 + audio.mid * 0.3;

        // Draw arrow
        this.graphics.lineStyle(1 + audio.treble * 2, this.hslToHex(hue, 70, 60), alpha);
        this.graphics.moveTo(x, y);
        this.graphics.lineTo(endX, endY);

        // Arrow head
        const headSize = 3 + (audio.beat ? 2 : 0);
        const headAngle1 = angle + Math.PI * 0.8;
        const headAngle2 = angle - Math.PI * 0.8;

        this.graphics.lineStyle(1, this.hslToHex(hue, 70, 60), alpha);
        this.graphics.moveTo(endX, endY);
        this.graphics.lineTo(
          endX + Math.cos(headAngle1) * headSize,
          endY + Math.sin(headAngle1) * headSize
        );
        this.graphics.moveTo(endX, endY);
        this.graphics.lineTo(
          endX + Math.cos(headAngle2) * headSize,
          endY + Math.sin(headAngle2) * headSize
        );
      }
    }
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

