import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';

export class OceanWaves implements Pattern {
  public name = 'Ocean Waves';
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
    this.time += dt * (0.5 + audio.rms * 0.5);
    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    const { width, height } = this.context;
    const centerY = height / 2;
    const layers = 8;

    // Draw multiple wave layers for depth
    for (let layer = 0; layer < layers; layer++) {
      const depth = layer / layers; // 0 = front, 1 = back
      const yOffset = centerY + (layer - layers / 2) * 60;
      
      // Wave parameters (more responsive)
      const waveHeight = (40 + audio.bass * 140 + (audio.beat ? 30 : 0)) * (1 - depth * 0.5);
      const frequency = 0.002 + depth * 0.001;
      const speed = 0.3 + depth * 0.2;
      const timeOffset = this.time * speed;

      // Color - darker blue for further waves
      const brightness = 20 + depth * 30;
      const saturation = 80 - depth * 30;
      const hue = 200 + audio.centroid * 40;
      const color = this.hslToHex(hue, saturation, brightness);
      const alpha = 0.4 + depth * 0.3;

      // Draw wave as filled shape
      this.graphics.beginFill(color, alpha);
      this.graphics.moveTo(0, height);

      // Bottom edge
      this.graphics.lineTo(0, yOffset + waveHeight * 2);

      // Wave top
      for (let x = 0; x <= width; x += 10) {
        const noise1 = noise2D(x * frequency, timeOffset + layer);
        const noise2 = noise2D(x * frequency * 2, timeOffset * 1.5 + layer * 10);
        
        const y =
          yOffset +
          Math.sin(x * frequency * 10 + timeOffset * 2) * waveHeight * 0.3 +
          noise1 * waveHeight * 0.4 +
          noise2 * waveHeight * 0.3;

        this.graphics.lineTo(x, y);
      }

      this.graphics.lineTo(width, yOffset + waveHeight * 2);
      this.graphics.lineTo(width, height);
      this.graphics.endFill();

      // Foam highlights on wave crests (front waves only)
      if (layer < 3) {
        this.graphics.lineStyle(2, 0xffffff, (0.3 - layer * 0.1) * (1 + audio.treble * 0.5));
        
        for (let x = 0; x <= width; x += 10) {
          const noise1 = noise2D(x * frequency, timeOffset + layer);
          const noise2 = noise2D(x * frequency * 2, timeOffset * 1.5 + layer * 10);
          
          const y =
            yOffset +
            Math.sin(x * frequency * 10 + timeOffset * 2) * waveHeight * 0.3 +
            noise1 * waveHeight * 0.4 +
            noise2 * waveHeight * 0.3;

          if (x === 0) {
            this.graphics.moveTo(x, y);
          } else {
            this.graphics.lineTo(x, y);
          }
        }
      }

      // Add foam particles on peaks
      if (audio.beat && layer === 0) {
        for (let x = 0; x < width; x += 50) {
          const noise1 = noise2D(x * frequency, timeOffset + layer);
          const peakValue = Math.sin(x * frequency * 10 + timeOffset * 2);
          
          if (peakValue > 0.7 && Math.random() < 0.3) {
            const y =
              yOffset +
              peakValue * waveHeight * 0.3 +
              noise1 * waveHeight * 0.4;

            this.graphics.beginFill(0xffffff, 0.6);
            this.graphics.drawCircle(x, y - 5, 2 + Math.random() * 3);
            this.graphics.endFill();
          }
        }
      }
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
    let r = 0,
      g = 0,
      b = 0;

    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

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

