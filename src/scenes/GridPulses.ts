import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

export class GridPulses implements Pattern {
  public name = 'Grid Pulses';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private gridSize: number = 40;
  private pulseOrigins: { x: number; y: number; time: number; polarity: number }[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Add pulse origin on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05) {
        this.pulseOrigins.push({
          x: click.x,
          y: click.y,
          time: this.time,
          polarity: 1, // Inverted on click
        });
      }
    });

    // Autonomous pulses on beats
    if (audio.beat && Math.random() < 0.6) {
      this.pulseOrigins.push({
        x: Math.random() * this.context.width,
        y: Math.random() * this.context.height,
        time: this.time,
        polarity: -1,
      });
    }

    // Remove old pulse origins
    this.pulseOrigins = this.pulseOrigins.filter((origin) => {
      return this.time - origin.time < 3;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    // this.graphics.clear();

    const cols = Math.ceil(this.context.width / this.gridSize);
    const rows = Math.ceil(this.context.height / this.gridSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * this.gridSize + this.gridSize / 2;
        const y = row * this.gridSize + this.gridSize / 2;

        // Calculate brightness based on pulse waves
        let brightness = 0.2 + Math.sin(this.time * 2 + col * 0.1 + row * 0.1) * 0.1;

        this.pulseOrigins.forEach((origin) => {
          const age = this.time - origin.time;
          const dx = x - origin.x;
          const dy = y - origin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const waveSpeed = 200 + audio.bass * 100;
          const wavePos = age * waveSpeed;
          const waveDist = Math.abs(dist - wavePos);

          if (waveDist < 50) {
            const intensity = (1 - waveDist / 50) * (1 - age / 3);
            brightness += intensity * origin.polarity;
          }
        });

        // Clamp and apply audio modulation
        brightness = Math.max(0, Math.min(1, brightness));
        brightness *= 0.5 + audio.rms * 0.5;

        // Draw cell
        const size = this.gridSize * 0.4 * (0.8 + brightness * 0.4);
        const hue = (col * 10 + row * 10 + this.time * 20) % 360;
        const alpha = 0.3 + brightness * 0.5;

        if (brightness > 0.1) {
          this.graphics.beginFill(this.hslToHex(hue, 70, 40 + brightness * 40), alpha);
          this.graphics.drawRect(
            x - size / 2,
            y - size / 2,
            size,
            size
          );
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

