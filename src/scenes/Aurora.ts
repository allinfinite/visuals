import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';

export class Aurora implements Pattern {
  public name = 'Aurora Curtain';
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

    const layers = 5;
    const points = 100;

    for (let layer = 0; layer < layers; layer++) {
      const hue = (layer * 40 + audio.centroid * 200) % 360;
      const alpha = (0.15 + audio.spectrum[layer * 5] * 0.3) / layers;
      const yOffset = this.context.height * 0.3 + layer * 20;

      // Generate wave points
      const wavePoints: { x: number; y: number }[] = [];

      for (let i = 0; i <= points; i++) {
        const x = (i / points) * this.context.width;
        const t = this.time * 0.5 + layer * 0.2;
        
        // Layered sine waves with noise
        const wave1 = Math.sin(i * 0.05 + t) * 30;
        const wave2 = Math.sin(i * 0.1 + t * 1.3) * 20;
        const noiseVal = noise2D(i * 0.02, t + layer) * 40;
        
        // Audio modulation
        const audioMod = audio.spectrum[Math.floor((i / points) * 32)] * 50;
        
        const y = yOffset + wave1 + wave2 + noiseVal + audioMod;
        wavePoints.push({ x, y });
      }

      // Draw filled wave band
      this.graphics.beginFill(this.hslToHex(hue, 80, 50), alpha);
      this.graphics.moveTo(wavePoints[0].x, wavePoints[0].y);
      
      for (let i = 1; i < wavePoints.length; i++) {
        this.graphics.lineTo(wavePoints[i].x, wavePoints[i].y);
      }
      
      // Complete the shape
      this.graphics.lineTo(this.context.width, this.context.height);
      this.graphics.lineTo(0, this.context.height);
      this.graphics.lineTo(wavePoints[0].x, wavePoints[0].y);
      this.graphics.endFill();
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

