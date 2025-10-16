import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Star {
  x: number;
  y: number;
  z: number;
  prevZ: number;
}

export class Starfield implements Pattern {
  public name = 'Starfield Zoom';
  public container: Container;
  private graphics: Graphics;
  private stars: Star[] = [];
  private context: RendererContext;
  private speed: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initStars();
  }

  private initStars(): void {
    for (let i = 0; i < 800; i++) {
      this.stars.push({
        x: randomRange(-this.context.width, this.context.width),
        y: randomRange(-this.context.height, this.context.height),
        z: randomRange(0, this.context.width),
        prevZ: 0,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    // Speed controlled by tempo/audio
    this.speed = 2 + audio.rms * 8;
    
    // Beat boost
    if (audio.beat) {
      this.speed *= 2;
    }

    // Update stars
    this.stars.forEach((star) => {
      star.prevZ = star.z;
      star.z -= this.speed;

      if (star.z < 1) {
        star.x = randomRange(-this.context.width, this.context.width);
        star.y = randomRange(-this.context.height, this.context.height);
        star.z = this.context.width;
        star.prevZ = star.z;
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    // this.graphics.clear();

    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;

    this.stars.forEach((star) => {
      // Project 3D to 2D
      const sx = (star.x / star.z) * 200 + centerX;
      const sy = (star.y / star.z) * 200 + centerY;
      const prevSx = (star.x / star.prevZ) * 200 + centerX;
      const prevSy = (star.y / star.prevZ) * 200 + centerY;

      // Skip if off screen
      if (
        sx < 0 || sx > this.context.width ||
        sy < 0 || sy > this.context.height
      ) {
        return;
      }

      // Size based on depth
      const size = (1 - star.z / this.context.width) * 3;
      const alpha = 1 - star.z / this.context.width;

      // Draw trail
      this.graphics.lineStyle(size, 0xffffff, alpha * (0.5 + audio.treble * 0.5));
      this.graphics.moveTo(prevSx, prevSy);
      this.graphics.lineTo(sx, sy);
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

