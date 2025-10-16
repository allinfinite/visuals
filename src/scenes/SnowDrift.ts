import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { noise2D } from '../utils/noise';

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
}

export class SnowDrift implements Pattern {
  public name = 'Snow Drift';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private snowflakes: Snowflake[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize snowflakes
    for (let i = 0; i < 150; i++) {
      this.spawnSnowflake(randomRange(-100, context.height + 100));
    }
  }

  private spawnSnowflake(y?: number): void {
    const { width } = this.context;
    this.snowflakes.push({
      x: randomRange(-100, width + 100),
      y: y !== undefined ? y : -20,
      vx: randomRange(-0.3, 0.3),
      vy: randomRange(10, 30),
      size: randomRange(2, 6),
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-0.5, 0.5),
      alpha: randomRange(0.3, 0.9),
    });
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;

    // Slower fall on quieter audio (gentle = slow tempo)
    const fallSpeed = 0.3 + audio.rms * 0.7;

    // Wind effect based on audio
    const windStrength = audio.bass * 30;

    this.snowflakes.forEach((flake, idx) => {
      // Gravity
      flake.vy += 5 * dt * fallSpeed;
      flake.vy = Math.min(flake.vy, 50);

      // Wind from noise
      const noiseValue = noise2D(flake.x * 0.005, this.time * 0.2);
      flake.vx += noiseValue * windStrength * dt;

      // Drag
      flake.vx *= 0.98;
      flake.vy *= 0.995;

      // Movement
      flake.x += flake.vx * dt;
      flake.y += flake.vy * dt;

      // Rotation
      flake.rotation += flake.rotationSpeed * dt;

      // Wrap around or respawn
      const { width } = this.context;
      if (flake.y > this.context.height + 20) {
        this.snowflakes[idx] = {
          x: randomRange(-100, width + 100),
          y: -20,
          vx: randomRange(-0.3, 0.3),
          vy: randomRange(10, 30),
          size: randomRange(2, 6),
          rotation: randomRange(0, Math.PI * 2),
          rotationSpeed: randomRange(-0.5, 0.5),
          alpha: randomRange(0.3, 0.9),
        };
      }

      // Wrap horizontally
      if (flake.x < -100) flake.x = width + 100;
      if (flake.x > width + 100) flake.x = -100;
    });

    // Add more snowflakes on beat
    if (audio.beat && this.snowflakes.length < 300) {
      for (let i = 0; i < 5; i++) {
        this.spawnSnowflake();
      }
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    this.snowflakes.forEach((flake) => {
      // Simple snowflake shape
      const size = flake.size * (1 + audio.treble * 0.3);
      
      // Glow
      this.graphics.beginFill(0xffffff, flake.alpha * 0.2);
      this.graphics.drawCircle(flake.x, flake.y, size * 1.5);
      this.graphics.endFill();

      // Core
      this.graphics.beginFill(0xffffff, flake.alpha);
      this.graphics.drawCircle(flake.x, flake.y, size);
      this.graphics.endFill();

      // Draw crystalline pattern for larger flakes
      if (flake.size > 3) {
        this.graphics.lineStyle(1, 0xffffff, flake.alpha * 0.6);
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI / 3) + flake.rotation;
          const length = size * 1.2;
          const x1 = flake.x + Math.cos(angle) * size * 0.3;
          const y1 = flake.y + Math.sin(angle) * size * 0.3;
          const x2 = flake.x + Math.cos(angle) * length;
          const y2 = flake.y + Math.sin(angle) * length;
          this.graphics.moveTo(x1, y1);
          this.graphics.lineTo(x2, y2);
        }
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

