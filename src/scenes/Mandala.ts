import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

export class Mandala implements Pattern {
  public name = 'Mandala';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private seed: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Change seed on click
    if (input.clicks.length > 0) {
      const latest = input.clicks[input.clicks.length - 1];
      const age = (performance.now() - latest.time) / 1000;
      if (age < 0.05) {
        this.seed = Math.random();
      }
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    // this.graphics.clear();

    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;
    const symmetry = 12;
    const layers = 6;

    for (let layer = 0; layer < layers; layer++) {
      const radius = 50 + layer * 60 * (1 + audio.bass * 0.3);
      const hue = (layer * 60 + this.time * 30 + this.seed * 360) % 360;
      const alpha = 0.4 + audio.mid * 0.4;

      for (let i = 0; i < symmetry; i++) {
        const angle = (i / symmetry) * Math.PI * 2 + this.time * 0.5;
        
        // Vibrate to bass
        const vibration = audio.beat ? 10 : 0;
        const x = centerX + Math.cos(angle) * (radius + vibration);
        const y = centerY + Math.sin(angle) * (radius + vibration);

        // Draw petal-like shapes
        const petalSize = 20 + layer * 5 + audio.treble * 10;
        
        this.graphics.beginFill(this.hslToHex(hue, 80, 60), alpha);
        this.graphics.drawCircle(x, y, petalSize);
        this.graphics.endFill();

        // Inner circle
        this.graphics.beginFill(this.hslToHex((hue + 180) % 360, 80, 80), alpha * 1.2);
        this.graphics.drawCircle(x, y, petalSize * 0.5);
        this.graphics.endFill();
      }
    }

    // Center dot
    this.graphics.beginFill(0xffffff, 0.9);
    this.graphics.drawCircle(centerX, centerY, 15 + audio.rms * 20);
    this.graphics.endFill();
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

