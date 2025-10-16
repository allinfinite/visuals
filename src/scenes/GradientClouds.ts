import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { octaveNoise2D } from '../utils/noise';

export class GradientClouds implements Pattern {
  public name = 'Gradient Clouds';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private hueOffset: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt * (0.4 + audio.rms * 0.4);
    
    // RMS drives hue rotation (more responsive)
    this.hueOffset += audio.rms * dt * 90 + audio.bass * dt * 30;
    
    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    const { width, height } = this.context;
    const gridSize = 40;
    const rows = Math.ceil(height / gridSize) + 1;
    const cols = Math.ceil(width / gridSize) + 1;

    // Draw cloud blobs as overlapping circles
    for (let layer = 0; layer < 3; layer++) {
      const layerSpeed = 1 + layer * 0.3;
      const layerScale = 0.5 + layer * 0.3;
      const layerAlpha = 0.15 - layer * 0.03;

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const x = j * gridSize;
          const y = i * gridSize;

          // Multiple octaves of noise for cloud-like patterns
          const noise = octaveNoise2D(
            x * 0.003 * layerScale,
            y * 0.003 * layerScale + this.time * layerSpeed,
            4,
            0.5,
            2.0
          );

          // Only draw where noise is above threshold
          if (noise > -0.2) {
            const intensity = (noise + 1) / 2; // Normalize to 0-1
            
            // Color based on position and audio
            const baseHue = (this.hueOffset + i * 10 + j * 5) % 360;
            const saturation = 60 + audio.mid * 40;
            const lightness = 40 + intensity * 30 + audio.treble * 20;
            
            const color = this.hslToHex(baseHue, saturation, lightness);
            const alpha = intensity * layerAlpha * (1 + audio.rms * 0.5);
            
            // Draw soft cloud blob
            const size = gridSize * (0.8 + intensity * 0.7) * (1 + audio.bass * 0.3);
            
            this.graphics.beginFill(color, alpha);
            this.graphics.drawCircle(x, y, size);
            this.graphics.endFill();
          }
        }
      }
    }

    // Add brighter highlights on beat
    if (audio.beat) {
      const highlightCount = 10;
      for (let i = 0; i < highlightCount; i++) {
        const x = (Math.random() * cols) * gridSize;
        const y = (Math.random() * rows) * gridSize;
        
        const noise = octaveNoise2D(x * 0.003, y * 0.003 + this.time, 2);
        if (noise > 0) {
          const hue = (this.hueOffset + Math.random() * 60) % 360;
          const color = this.hslToHex(hue, 80, 70);
          
          this.graphics.beginFill(color, 0.3);
          this.graphics.drawCircle(x, y, gridSize * 1.5);
          this.graphics.endFill();
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

