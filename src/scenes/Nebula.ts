import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { octaveNoise3D } from '../utils/noise';

export class Nebula implements Pattern {
  public name = 'Nebula';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private resolution: number = 8; // Lower = higher quality but slower

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt * 0.2;
    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    // this.graphics.clear();

    // Volume rendering with fractal noise
    const width = this.context.width;
    const height = this.context.height;

    for (let y = 0; y < height; y += this.resolution) {
      for (let x = 0; x < width; x += this.resolution) {
        // Sample 3D noise (x, y, time)
        const noiseScale = 0.003 + audio.bass * 0.001;
        const noiseValue = octaveNoise3D(
          x * noiseScale,
          y * noiseScale,
          this.time,
          4,
          0.5,
          2.0
        );

        // Map noise to color and alpha
        const density = (noiseValue + 1) * 0.5; // 0 to 1
        
        if (density > 0.3) {
          // Color shifts based on harmonic mean (spectral centroid)
          const hue = (density * 180 + audio.centroid * 100 + this.time * 10) % 360;
          const saturation = 70 + audio.mid * 30;
          const lightness = 30 + density * 40 + audio.treble * 20;
          const alpha = (density - 0.3) * 0.4 * (0.5 + audio.rms * 0.5);

          this.graphics.beginFill(this.hslToHex(hue, saturation, lightness), alpha);
          this.graphics.drawRect(x, y, this.resolution, this.resolution);
          this.graphics.endFill();
        }
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

