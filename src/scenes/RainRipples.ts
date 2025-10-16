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
        maxRadius: randomRange(60, 150), // Increased from 30-80 for larger ripples
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
            maxRadius: randomRange(100, 200), // Increased from 50-120 for much larger click ripples
            life: 1,
          });
        }
      }
    });

    // Update ripples (faster expansion)
    this.ripples = this.ripples.filter((ripple) => {
      ripple.radius += 80 * dt * (1 + audio.bass * 0.5); // Increased from 60 to 80 for faster expansion
      ripple.life -= dt * 0.6; // Decreased from 0.8 to 0.6 for longer lifetime
      return ripple.life > 0 && ripple.radius < ripple.maxRadius;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    this.ripples.forEach((ripple) => {
      const progress = ripple.radius / ripple.maxRadius;
      const alpha = ripple.life * (1 - progress) * 0.9; // Increased from 0.5 to 0.9 for much brighter ripples
      
      // Outer glow layer (new!)
      this.graphics.lineStyle(
        4 - progress * 2,
        0x6699ff,
        alpha * 0.3
      );
      this.graphics.drawCircle(ripple.x, ripple.y, ripple.radius);
      
      // Main expanding circle (brighter)
      this.graphics.lineStyle(
        3 - progress * 1.5, // Increased from 2 for thicker lines
        0x4499ff,
        alpha * (0.7 + audio.mid * 0.3) // Increased base from 0.5 to 0.7
      );
      this.graphics.drawCircle(ripple.x, ripple.y, ripple.radius);

      // Inner ripple (brighter)
      if (ripple.radius > 10) {
        this.graphics.lineStyle(
          2 - progress * 0.5, // Increased from 1.5 for thicker inner ripple
          0x88bbff,
          alpha * 0.8 // Increased from 0.6 to 0.8 for brighter inner ripple
        );
        this.graphics.drawCircle(ripple.x, ripple.y, ripple.radius * 0.5);
      }
      
      // Center splash highlight (new!)
      if (ripple.radius < ripple.maxRadius * 0.3) {
        this.graphics.beginFill(0xaaddff, alpha * 0.6);
        this.graphics.drawCircle(ripple.x, ripple.y, 3);
        this.graphics.endFill();
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

