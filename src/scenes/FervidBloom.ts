import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class FervidBloom implements Pattern {
  public name = 'Fervid Bloom';
  public container: Container;
  private graphics: Graphics;
  private time: number = 0;
  
  // Reaction-diffusion parameters
  private gridWidth: number = 120;
  private gridHeight: number = 80;
  private cellA: number[][] = [];
  private cellB: number[][] = [];
  private nextA: number[][] = [];
  private nextB: number[][] = [];
  
  // Parameters for voluptuous, swelling forms
  private feedRate: number = 0.055;
  private killRate: number = 0.062;
  private diffusionA: number = 1.0;
  private diffusionB: number = 0.5;

  constructor(private context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initGrid();
  }

  private initGrid(): void {
    // Initialize grids
    for (let x = 0; x < this.gridWidth; x++) {
      this.cellA[x] = [];
      this.cellB[x] = [];
      this.nextA[x] = [];
      this.nextB[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        this.cellA[x][y] = 1;
        this.cellB[x][y] = 0;
        this.nextA[x][y] = 1;
        this.nextB[x][y] = 0;
      }
    }

    // Seed initial pattern
    const centerX = Math.floor(this.gridWidth / 2);
    const centerY = Math.floor(this.gridHeight / 2);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = 10;
      const sx = centerX + Math.floor(Math.cos(angle) * radius);
      const sy = centerY + Math.floor(Math.sin(angle) * radius);
      if (sx >= 0 && sx < this.gridWidth && sy >= 0 && sy < this.gridHeight) {
        this.cellB[sx][sy] = 1;
      }
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Audio energy fuels throbbing growth
    const growthRate = 1 + audio.rms * 2;
    this.feedRate = 0.055 - audio.bass * 0.02;
    this.killRate = 0.062 + audio.treble * 0.01;

    // Mouse position warps tendrils
    const mouseGridX = Math.floor((input.x / this.context.width) * this.gridWidth);
    const mouseGridY = Math.floor((input.y / this.context.height) * this.gridHeight);

    // Run multiple iterations for faster growth
    const iterations = Math.floor(1 + growthRate);
    for (let iter = 0; iter < iterations; iter++) {
      // Reaction-diffusion step
      for (let x = 1; x < this.gridWidth - 1; x++) {
        for (let y = 1; y < this.gridHeight - 1; y++) {
          const a = this.cellA[x][y];
          const b = this.cellB[x][y];

          // Laplacian (diffusion)
          const laplaceA =
            this.cellA[x - 1][y] +
            this.cellA[x + 1][y] +
            this.cellA[x][y - 1] +
            this.cellA[x][y + 1] -
            4 * a;

          const laplaceB =
            this.cellB[x - 1][y] +
            this.cellB[x + 1][y] +
            this.cellB[x][y - 1] +
            this.cellB[x][y + 1] -
            4 * b;

          // Reaction
          const reaction = a * b * b;

          // Mouse warping effect (suggestive curvaceous shapes)
          const dx = x - mouseGridX;
          const dy = y - mouseGridY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const warpStrength = dist < 20 ? (1 - dist / 20) * 0.1 : 0;

          // Update
          this.nextA[x][y] = a + (this.diffusionA * laplaceA - reaction + this.feedRate * (1 - a)) * dt * 10 + warpStrength;
          this.nextB[x][y] = b + (this.diffusionB * laplaceB + reaction - (this.killRate + this.feedRate) * b) * dt * 10;

          // Clamp
          this.nextA[x][y] = Math.max(0, Math.min(1, this.nextA[x][y]));
          this.nextB[x][y] = Math.max(0, Math.min(1, this.nextB[x][y]));
        }
      }

      // Swap buffers
      [this.cellA, this.nextA] = [this.nextA, this.cellA];
      [this.cellB, this.nextB] = [this.nextB, this.cellB];
    }

    // Add seeds on beat for pulsating growth
    if (audio.beat) {
      const seedCount = 3 + Math.floor(audio.bass * 5);
      for (let i = 0; i < seedCount; i++) {
        const sx = Math.floor(Math.random() * this.gridWidth);
        const sy = Math.floor(Math.random() * this.gridHeight);
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const nx = sx + dx;
            const ny = sy + dy;
            if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
              this.cellB[nx][ny] = 1;
            }
          }
        }
      }
    }

    // Click adds seeds
    if (input.isDown) {
      const seedX = Math.floor((input.x / this.context.width) * this.gridWidth);
      const seedY = Math.floor((input.y / this.context.height) * this.gridHeight);
      const radius = 3 + Math.floor(audio.rms * 5);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const nx = seedX + dx;
          const ny = seedY + dy;
          if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
            if (dx * dx + dy * dy <= radius * radius) {
              this.cellB[nx][ny] = 1;
            }
          }
        }
      }
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const cellWidth = this.context.width / this.gridWidth;
    const cellHeight = this.context.height / this.gridHeight;

    // Draw voluptuous, swelling forms
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const b = this.cellB[x][y];
        
        if (b > 0.1) {
          // Throbbing color based on concentration
          const hue = (b * 60 + this.time * 20 + audio.centroid * 180) % 360;
          const saturation = 70 + b * 30;
          const lightness = 40 + b * 30 + audio.rms * 20;
          const color = hslToHex(hue, saturation, lightness);

          // Pulsating alpha
          const pulse = 1 + Math.sin(this.time * 5 + x * 0.1 + y * 0.1) * 0.3;
          const alpha = b * 0.9 * pulse;

          // Draw cell with organic, soft edges
          const px = x * cellWidth;
          const py = y * cellHeight;
          const size = cellWidth * (0.8 + b * 0.6 + audio.bass * 0.3);

          // Glow for swelling effect
          this.graphics.beginFill(0xffffff, alpha * 0.2);
          this.graphics.drawCircle(px + cellWidth / 2, py + cellHeight / 2, size * 1.4);
          this.graphics.endFill();

          // Core
          this.graphics.beginFill(color, alpha);
          this.graphics.drawCircle(px + cellWidth / 2, py + cellHeight / 2, size);
          this.graphics.endFill();
        }
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

