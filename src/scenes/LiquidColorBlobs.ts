import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  targetRadius: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export class LiquidColorBlobs implements Pattern {
  public name = 'Liquid Color Blobs';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private blobs: Blob[] = [];

  // Metaball threshold
  private threshold: number = 1.0;
  private gridSize: number = 10;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize some blobs
    for (let i = 0; i < 8; i++) {
      this.spawnBlob(
        randomRange(context.width * 0.3, context.width * 0.7),
        randomRange(context.height * 0.3, context.height * 0.7),
        randomRange(0, 360)
      );
    }
  }

  private spawnBlob(x: number, y: number, hue: number): void {
    const radius = randomRange(30, 80);
    this.blobs.push({
      x,
      y,
      vx: randomRange(-50, 50),
      vy: randomRange(-50, 50),
      radius,
      targetRadius: radius,
      hue,
      saturation: randomRange(60, 90),
      lightness: randomRange(40, 60),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn blob on click
    if (input.isDown && this.blobs.length < 20) {
      this.spawnBlob(input.x, input.y, audio.centroid * 360);
    }

    // Autonomous spawning on beat
    if (audio.beat && this.blobs.length < 15) {
      const x = randomRange(this.context.width * 0.2, this.context.width * 0.8);
      const y = randomRange(this.context.height * 0.2, this.context.height * 0.8);
      this.spawnBlob(x, y, (this.time * 50 + audio.bass * 180) % 360);
    }

    // Update blobs
    this.blobs.forEach((blob, i) => {
      // Apply velocity
      blob.x += blob.vx * dt;
      blob.y += blob.vy * dt;

      // Bounce off walls with some damping
      if (blob.x - blob.radius < 0 || blob.x + blob.radius > this.context.width) {
        blob.vx *= -0.8;
        blob.x = Math.max(blob.radius, Math.min(this.context.width - blob.radius, blob.x));
      }
      if (blob.y - blob.radius < 0 || blob.y + blob.radius > this.context.height) {
        blob.vy *= -0.8;
        blob.y = Math.max(blob.radius, Math.min(this.context.height - blob.radius, blob.y));
      }

      // Apply fluid-like attraction to other blobs
      this.blobs.forEach((other, j) => {
        if (i !== j) {
          const dx = other.x - blob.x;
          const dy = other.y - blob.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = blob.radius + other.radius;

          if (dist < minDist * 2) {
            // Attract when close
            const force = (minDist * 2 - dist) * 0.5;
            const angle = Math.atan2(dy, dx);
            blob.vx += Math.cos(angle) * force * dt;
            blob.vy += Math.sin(angle) * force * dt;
          }
        }
      });

      // Attraction to cursor when clicked
      if (input.isDown) {
        const dx = input.x - blob.x;
        const dy = input.y - blob.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const force = (300 - dist) * 0.3;
          const angle = Math.atan2(dy, dx);
          blob.vx += Math.cos(angle) * force * dt;
          blob.vy += Math.sin(angle) * force * dt;
        }
      }

      // Apply friction
      blob.vx *= 0.98;
      blob.vy *= 0.98;

      // Audio reactivity - size pulsing
      blob.targetRadius = 40 + audio.bass * 40 + Math.sin(this.time * 2 + i) * 10;
      blob.radius += (blob.targetRadius - blob.radius) * 3 * dt;

      // Hue shift
      blob.hue = (blob.hue + dt * 10 + audio.centroid * 5) % 360;
    });

    // Remove blobs that are too small
    this.blobs = this.blobs.filter(blob => blob.radius > 10);

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;

    // Draw metaballs using marching squares
    const cols = Math.ceil(width / this.gridSize);
    const rows = Math.ceil(height / this.gridSize);

    // Calculate field values
    const field: number[][] = [];
    const colors: number[][] = [];

    for (let x = 0; x <= cols; x++) {
      field[x] = [];
      colors[x] = [];
      for (let y = 0; y <= rows; y++) {
        const px = x * this.gridSize;
        const py = y * this.gridSize;

        let sum = 0;
        let colorSum = { h: 0, s: 0, l: 0, w: 0 };

        this.blobs.forEach(blob => {
          const dx = px - blob.x;
          const dy = py - blob.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = blob.radius * blob.radius;

          if (distSq < radiusSq * 4) {
            const influence = (radiusSq / (distSq + 1)) * 2;
            sum += influence;

            // Weight color by influence
            colorSum.h += blob.hue * influence;
            colorSum.s += blob.saturation * influence;
            colorSum.l += blob.lightness * influence;
            colorSum.w += influence;
          }
        });

        field[x][y] = sum;

        if (colorSum.w > 0) {
          colors[x][y] = hslToHex(
            colorSum.h / colorSum.w,
            colorSum.s / colorSum.w,
            colorSum.l / colorSum.w
          );
        } else {
          colors[x][y] = 0x000000;
        }
      }
    }

    // Draw metaballs using contour lines
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const px = x * this.gridSize;
        const py = y * this.gridSize;

        // Check if this cell is inside the metaball
        const tl = field[x][y];
        const tr = field[x + 1][y];
        const bl = field[x][y + 1];
        const br = field[x + 1][y + 1];

        const avg = (tl + tr + bl + br) / 4;

        if (avg > this.threshold) {
          const alpha = Math.min(1, (avg - this.threshold) * 0.5);
          const color = colors[x][y];

          // Draw filled cell with gradient-like effect
          this.graphics.beginFill(color, alpha);
          this.graphics.drawRect(px, py, this.gridSize, this.gridSize);
          this.graphics.endFill();

          // Add glow on edges
          if (avg < this.threshold * 2) {
            const glowAlpha = (1 - (avg - this.threshold) / this.threshold) * 0.3;
            this.graphics.lineStyle(2, 0xffffff, glowAlpha);
            this.graphics.drawRect(px, py, this.gridSize, this.gridSize);
          }
        }
      }
    }

      // Draw blob centers (for debugging / visual interest)
    this.blobs.forEach(blob => {
      const color = hslToHex(blob.hue, blob.saturation, blob.lightness);
      this.graphics.beginFill(color, 0.3 + (audio.beat ? 0.4 : 0));
      this.graphics.drawCircle(blob.x, blob.y, 5);
      this.graphics.endFill();
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

