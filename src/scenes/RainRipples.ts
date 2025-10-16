import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
}

export class RainRipples implements Pattern {
  public name = 'Rain Ripples';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private ripples: Ripple[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn raindrops based on treble energy
    const dropRate = audio.treble * 15;
    if (Math.random() < dropRate * dt) {
      this.ripples.push({
        x: randomRange(0, this.context.width),
        y: randomRange(0, this.context.height),
        radius: 0,
        maxRadius: randomRange(30, 80),
        life: 1,
      });
    }

    // Spawn ripples on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05) {
        for (let i = 0; i < 3; i++) {
          this.ripples.push({
            x: click.x + randomRange(-20, 20),
            y: click.y + randomRange(-20, 20),
            radius: 0,
            maxRadius: randomRange(50, 120),
            life: 1,
          });
        }
      }
    });

    // Update ripples
    this.ripples = this.ripples.filter((ripple) => {
      ripple.radius += 60 * dt * (1 + audio.bass * 0.5);
      ripple.life -= dt * 0.8;
      return ripple.life > 0 && ripple.radius < ripple.maxRadius;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    this.graphics.clear();

    this.ripples.forEach((ripple) => {
      const progress = ripple.radius / ripple.maxRadius;
      const alpha = ripple.life * (1 - progress) * 0.5;
      
      // Draw expanding circle
      this.graphics.lineStyle(
        2 - progress,
        0x4499ff,
        alpha * (0.5 + audio.mid * 0.5)
      );
      this.graphics.drawCircle(ripple.x, ripple.y, ripple.radius);

      // Inner ripple
      if (ripple.radius > 10) {
        this.graphics.lineStyle(
          1.5 - progress * 0.5,
          0x88bbff,
          alpha * 0.6
        );
        this.graphics.drawCircle(ripple.x, ripple.y, ripple.radius * 0.5);
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

