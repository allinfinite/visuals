import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface FluidCell {
  vx: number;
  vy: number;
  density: number;
  hue: number;
  iridescence: number;
}

export class TorridRush implements Pattern {
  public name = 'Torrid Rush';
  public container: Container;
  private graphics: Graphics;
  private time: number = 0;
  
  // Fluid grid
  private gridWidth: number = 80;
  private gridHeight: number = 60;
  private cells: FluidCell[][] = [];
  private cellSize: number;

  // Fluid parameters
  private viscosity: number = 0.002;

  constructor(context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    const { width, height } = context;
    this.cellSize = Math.min(width / this.gridWidth, height / this.gridHeight);

    this.initGrid();
  }

  private initGrid(): void {
    for (let x = 0; x < this.gridWidth; x++) {
      this.cells[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        this.cells[x][y] = {
          vx: 0,
          vy: 0,
          density: 0,
          hue: 0,
          iridescence: 0,
        };
      }
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Frequency bands create wild, passionate waves
    const bassWave = audio.bass * 500;
    const midWave = audio.mid * 300;
    const trebleWave = audio.treble * 200;

    // Apply audio-driven wave forces across grid
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const cell = this.cells[x][y];
        
        // Chaotic wave patterns
        const waveX = Math.sin(x * 0.1 + this.time * 3 + (audio.beat ? Math.PI : 0)) * bassWave;
        const waveY = Math.cos(y * 0.1 + this.time * 2.5) * midWave;
        const surge = Math.sin((x + y) * 0.05 + this.time * 5) * trebleWave;

        cell.vx += (waveX + surge) * dt;
        cell.vy += (waveY + surge) * dt;

        // Iridescent shimmer
        cell.iridescence = 0.5 + Math.sin(this.time * 8 + x * 0.2 + y * 0.2) * 0.5;
      }
    }

    // Cursor drag triggers turbulent, climactic bursts
    if (input.isDragging) {
      const gridX = Math.floor(input.x / this.cellSize);
      const gridY = Math.floor(input.y / this.cellSize);
      const radius = 5 + Math.floor(audio.rms * 10);
      const burstForce = 1000 + audio.bass * 2000;

      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const nx = gridX + dx;
          const ny = gridY + dy;
          if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const falloff = 1 - dist / radius;
              const angle = Math.atan2(dy, dx);
              this.cells[nx][ny].vx += Math.cos(angle) * burstForce * falloff * dt;
              this.cells[nx][ny].vy += Math.sin(angle) * burstForce * falloff * dt;
              this.cells[nx][ny].density += 100 * falloff;
              this.cells[nx][ny].hue = (audio.centroid * 360) % 360;
            }
          }
        }
      }
    }

    // Autonomous surges on beat
    if (audio.beat) {
      const surgeX = Math.floor(randomRange(this.gridWidth * 0.2, this.gridWidth * 0.8));
      const surgeY = Math.floor(randomRange(this.gridHeight * 0.2, this.gridHeight * 0.8));
      const surgeRadius = 8;
      
      for (let dx = -surgeRadius; dx <= surgeRadius; dx++) {
        for (let dy = -surgeRadius; dy <= surgeRadius; dy++) {
          const nx = surgeX + dx;
          const ny = surgeY + dy;
          if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= surgeRadius) {
              const falloff = 1 - dist / surgeRadius;
              this.cells[nx][ny].density += 80 * falloff;
              this.cells[nx][ny].hue = (this.time * 60 + audio.rms * 180) % 360;
            }
          }
        }
      }
    }

    // Diffuse velocity (simple)
    for (let x = 1; x < this.gridWidth - 1; x++) {
      for (let y = 1; y < this.gridHeight - 1; y++) {
        const cell = this.cells[x][y];
        const avgVx =
          (this.cells[x - 1][y].vx +
            this.cells[x + 1][y].vx +
            this.cells[x][y - 1].vx +
            this.cells[x][y + 1].vx) / 4;
        const avgVy =
          (this.cells[x - 1][y].vy +
            this.cells[x + 1][y].vy +
            this.cells[x][y - 1].vy +
            this.cells[x][y + 1].vy) / 4;

        cell.vx += (avgVx - cell.vx) * this.viscosity;
        cell.vy += (avgVy - cell.vy) * this.viscosity;

        // Decay
        cell.vx *= 0.99;
        cell.vy *= 0.99;
        cell.density *= 0.98;

        // Hue shifts with flow
        cell.hue = (cell.hue + dt * 30 + audio.centroid * 20) % 360;
      }
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw chaotic, iridescent surges
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const cell = this.cells[x][y];
        
        if (cell.density > 0.5) {
          const alpha = Math.min(1, cell.density / 50);
          
          // Iridescent color shift
          const hueShift = cell.iridescence * 60;
          const hue = (cell.hue + hueShift) % 360;
          const color = hslToHex(hue, 80 + audio.treble * 20, 50 + cell.iridescence * 30);
          const glowColor = hslToHex((hue + 30) % 360, 100, 70);

          const px = x * this.cellSize + this.cellSize / 2;
          const py = y * this.cellSize + this.cellSize / 2;
          const size = this.cellSize * (0.8 + cell.iridescence * 0.4 + audio.rms * 0.3);

          // Shimmering glow
          this.graphics.beginFill(glowColor, alpha * 0.4 * cell.iridescence);
          this.graphics.drawCircle(px, py, size * 1.6);
          this.graphics.endFill();

          // Core with iridescent sheen
          this.graphics.beginFill(color, alpha);
          this.graphics.drawCircle(px, py, size);
          this.graphics.endFill();

          // Draw velocity vectors for turbulent effect
          if (Math.abs(cell.vx) > 10 || Math.abs(cell.vy) > 10) {
            const vel = Math.sqrt(cell.vx * cell.vx + cell.vy * cell.vy);
            const lineLength = Math.min(vel * 0.05, this.cellSize * 2);
            this.graphics.lineStyle(2, glowColor, alpha * 0.6);
            this.graphics.moveTo(px, py);
            this.graphics.lineTo(px + (cell.vx / vel) * lineLength, py + (cell.vy / vel) * lineLength);
          }
        }
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

