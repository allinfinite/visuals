import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface Star {
  x: number;
  y: number;
  time: number;
  brightness: number;
}

export class Constellations implements Pattern {
  public name = 'Constellations';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private stars: Star[] = [];
  private time: number = 0;
  private maxStars: number = 30;
  private connectionDistance: number = 200;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Add stars on click
    input.clicks.forEach((click) => {
      if (this.stars.length < this.maxStars) {
        this.stars.push({
          x: click.x,
          y: click.y,
          time: this.time,
          brightness: 1,
        });
      }
    });

    // Autonomous star spawning on beats
    if (audio.beat && this.stars.length < this.maxStars && Math.random() < 0.5) {
      this.stars.push({
        x: Math.random() * this.context.width,
        y: Math.random() * this.context.height,
        time: this.time,
        brightness: 0.5 + audio.rms * 0.5,
      });
    }

    // Update star brightness
    this.stars.forEach((star) => {
      const age = this.time - star.time;
      // Twinkle effect
      star.brightness = 0.5 + Math.sin(age * 2 + star.x * 0.1) * 0.3 + audio.treble * 0.2;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    // this.graphics.clear();

    // Draw connections between nearby stars
    for (let i = 0; i < this.stars.length; i++) {
      for (let j = i + 1; j < this.stars.length; j++) {
        const star1 = this.stars[i];
        const star2 = this.stars[j];
        
        const dx = star2.x - star1.x;
        const dy = star2.y - star1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.connectionDistance) {
          const alpha = (1 - dist / this.connectionDistance) * 0.3;
          const glow = audio.beat ? 1.5 : 1;

          this.graphics.lineStyle(
            1 * glow,
            0x8888ff,
            alpha * (0.5 + audio.mid * 0.5)
          );
          this.graphics.moveTo(star1.x, star1.y);
          this.graphics.lineTo(star2.x, star2.y);
        }
      }
    }

    // Draw stars
    this.stars.forEach((star) => {
      const size = 3 + star.brightness * 3 + (audio.beat ? 2 : 0);
      const alpha = 0.7 + star.brightness * 0.3;

      // Glow
      this.graphics.beginFill(0xffffff, alpha * 0.3);
      this.graphics.drawCircle(star.x, star.y, size * 2);
      this.graphics.endFill();

      // Star core
      this.graphics.beginFill(0xffffff, alpha);
      this.graphics.drawCircle(star.x, star.y, size);
      this.graphics.endFill();
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

