import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

export class FlowerOfLife implements Pattern {
  public name = 'Flower of Life';
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

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;
    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    this.graphics.clear();

    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;
    const baseRadius = 60 + audio.bass * 40;
    const rings = 3;

    // Draw layered circles
    for (let ring = 0; ring <= rings; ring++) {
      const circleCount = ring === 0 ? 1 : ring * 6;
      
      for (let i = 0; i < circleCount; i++) {
        let x = centerX;
        let y = centerY;

        if (ring > 0) {
          const angle = (i / circleCount) * Math.PI * 2;
          const distance = ring * baseRadius;
          x = centerX + Math.cos(angle) * distance;
          y = centerY + Math.sin(angle) * distance;
        }

        // Vibrate to bass
        const vibration = Math.sin(this.time * 5 + i) * audio.bass * 5;
        const radius = baseRadius + vibration;

        // Draw circle outline
        const alpha = 0.6 + audio.treble * 0.3;
        this.graphics.lineStyle(
          2 + (audio.beat ? 1 : 0),
          this.hslToHex((ring * 60 + this.time * 20) % 360, 70, 50 + audio.mid * 30),
          alpha
        );
        this.graphics.drawCircle(x, y, radius);
      }
    }
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

