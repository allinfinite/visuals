import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

export class WaveCurves implements Pattern {
  public name = 'Wave Curves';
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
    // Don't clear - let trails build up
    this.graphics.clear();

    const numWaves = 8;
    const points = 100;

    for (let wave = 0; wave < numWaves; wave++) {
      const yBase = (wave / numWaves) * this.context.height;
      const hue = (wave * 45 + this.time * 20) % 360;
      const alpha = 0.3 + audio.spectrum[wave * 4] * 0.5;

      const wavePoints: { x: number; y: number }[] = [];

      for (let i = 0; i <= points; i++) {
        const x = (i / points) * this.context.width;
        const progress = i / points;

        // Multiple sine waves deformed by frequency bands
        let y = yBase;
        
        // Main wave
        y += Math.sin(progress * Math.PI * 4 + this.time * 2) * 
          (20 + audio.spectrum[Math.floor(wave * 2)] * 40);
        
        // Secondary wave
        y += Math.sin(progress * Math.PI * 8 + this.time * 3) * 
          (10 + audio.spectrum[Math.floor(wave * 3)] * 20);
        
        // Tertiary modulation
        y += Math.sin(progress * Math.PI * 16 + this.time * 1.5) * 
          (5 + audio.spectrum[Math.floor(wave * 4)] * 10);

        wavePoints.push({ x, y });
      }

      // Draw wave as smooth curve
      this.graphics.lineStyle(
        2 + (audio.beat ? 1 : 0),
        this.hslToHex(hue, 80, 50 + audio.mid * 30),
        alpha
      );

      this.graphics.moveTo(wavePoints[0].x, wavePoints[0].y);
      
      // Use quadratic curves for smooth lines
      for (let i = 1; i < wavePoints.length - 1; i++) {
        const curr = wavePoints[i];
        const next = wavePoints[i + 1];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        
        this.graphics.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      
      // Final point
      const last = wavePoints[wavePoints.length - 1];
      this.graphics.lineTo(last.x, last.y);
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

