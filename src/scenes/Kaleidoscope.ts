import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';

export class Kaleidoscope implements Pattern {
  public name = 'Kaleidoscope';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private segments: number = 8;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt * (0.5 + audio.rms * 1.5);
    
    // Change segment count on beat
    if (audio.beat && Math.random() < 0.3) {
      this.segments = 4 + Math.floor(Math.random() * 9); // 4-12 segments
    }

    this.draw(audio, input);
  }

  private draw(audio: AudioData, input: InputState): void {
    // this.graphics.clear(); // Commented for feedback trails

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const segmentAngle = (Math.PI * 2) / this.segments;

    // Draw in all segments with rotation
    for (let seg = 0; seg < this.segments; seg++) {
      // Rotation angle for this segment
      const angle = seg * segmentAngle;

      // Draw pattern in this segment with rotation
      const layers = 5;
      for (let layer = 0; layer < layers; layer++) {
        const radius = 50 + layer * 40;
        const points = 6 + layer * 2;
        
        for (let i = 0; i < points; i++) {
          const pointAngle = angle + (i / points) * segmentAngle;
          const x = centerX + Math.cos(pointAngle) * radius;
          const y = centerY + Math.sin(pointAngle) * radius;

          // Noise-based position offset
          const noiseX = noise2D(x * 0.01, this.time + layer) * 20;
          const noiseY = noise2D(y * 0.01, this.time + layer + 100) * 20;

          // Audio-reactive size and color
          const hue = (layer * 60 + audio.centroid * 120 + this.time * 30) % 360;
          const size = (3 + layer * 2) * (1 + audio.spectrum[i % 32] * 2);
          const alpha = 0.3 + audio.rms * 0.5;

          // Glow
          this.graphics.beginFill(this.hslToHex(hue, 100, 60), alpha * 0.3);
          this.graphics.drawCircle(x + noiseX, y + noiseY, size * 2);
          this.graphics.endFill();

          // Core
          this.graphics.beginFill(this.hslToHex(hue, 100, 70), alpha);
          this.graphics.drawCircle(x + noiseX, y + noiseY, size);
          this.graphics.endFill();
        }
      }

      // Draw lines connecting points for this segment
      const linePoints = 12;
      this.graphics.lineStyle(1 + (audio.beat ? 2 : 0), 0xffffff, 0.2 + audio.mid * 0.3);
      
      for (let i = 0; i < linePoints; i++) {
        const pointAngle = angle + (i / linePoints) * segmentAngle;
        const radius = 80 + Math.sin(this.time + i + seg) * 30;
        const x = centerX + Math.cos(pointAngle) * radius;
        const y = centerY + Math.sin(pointAngle) * radius;
        
        if (i === 0) {
          this.graphics.moveTo(x, y);
        } else {
          this.graphics.lineTo(x, y);
        }
      }
    }

    // Center mandala
    const centerRadius = 20 + audio.bass * 40;
    const centerHue = (this.time * 50) % 360;
    
    this.graphics.beginFill(this.hslToHex(centerHue, 100, 60), 0.5);
    this.graphics.drawCircle(centerX, centerY, centerRadius);
    this.graphics.endFill();
    
    this.graphics.beginFill(0xffffff, 0.8);
    this.graphics.drawCircle(centerX, centerY, centerRadius * 0.5);
    this.graphics.endFill();

    // Mouse interaction - draw pattern at mouse position
    if (input.isDown || input.isDragging) {
      const distToCenter = Math.hypot(input.x - centerX, input.y - centerY);
      if (distToCenter > 50) {
        const hue = (this.time * 100) % 360;
        this.graphics.beginFill(this.hslToHex(hue, 100, 70), 0.4);
        this.graphics.drawCircle(input.x, input.y, 10 + audio.rms * 20);
        this.graphics.endFill();
      }
    }
  }

  private hslToHex(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

