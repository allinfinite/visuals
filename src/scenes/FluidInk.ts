import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface FluidCell {
  vx: number; // velocity x
  vy: number; // velocity y
  density: number; // ink density
  hue: number;
}

export class FluidInk implements Pattern {
  public name = 'Fluid Ink';
  public container: Container;
  private graphics: Graphics;
  private time: number = 0;

  // Fluid grid
  private gridWidth: number = 60;
  private gridHeight: number = 40;
  private cells: FluidCell[][] = [];
  private cellSize: number;

  // Simulation parameters
  private viscosity: number = 0.001;
  private diffusion: number = 0.0001;
  private dt: number = 0.016;

  // Interaction
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.cellSize = Math.min(
      context.width / this.gridWidth,
      context.height / this.gridHeight
    );

    this.initGrid();
  }

  private initGrid(): void {
    this.cells = [];
    for (let x = 0; x < this.gridWidth; x++) {
      this.cells[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        this.cells[x][y] = {
          vx: 0,
          vy: 0,
          density: 0,
          hue: 200,
        };
      }
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.dt = dt;

    // Inject velocity and dye on click or autonomous
    if (input.isDown) {
      const gridX = Math.floor(input.x / this.cellSize);
      const gridY = Math.floor(input.y / this.cellSize);

      // Calculate mouse velocity
      const velocityX = (input.x - this.lastMouseX) * 10;
      const velocityY = (input.y - this.lastMouseY) * 10;

      this.injectFluid(gridX, gridY, velocityX, velocityY, audio.bass * 100, audio.centroid * 360);
    } else {
      // Autonomous injection based on audio
      if (audio.beat || Math.random() < audio.rms * 0.1) {
        const gridX = Math.floor(randomRange(this.gridWidth * 0.2, this.gridWidth * 0.8));
        const gridY = Math.floor(randomRange(this.gridHeight * 0.2, this.gridHeight * 0.8));
        const angle = Math.random() * Math.PI * 2;
        const force = 50 + audio.rms * 100;
        const velocityX = Math.cos(angle) * force;
        const velocityY = Math.sin(angle) * force;

        this.injectFluid(gridX, gridY, velocityX, velocityY, audio.bass * 80 + 20, audio.centroid * 360);
      }
    }

    this.lastMouseX = input.x;
    this.lastMouseY = input.y;

    // Simulate fluid dynamics
    this.velocityStep(audio);
    this.densityStep(audio);

    this.draw(audio);
  }

  private injectFluid(
    gridX: number,
    gridY: number,
    vx: number,
    vy: number,
    amount: number,
    hue: number
  ): void {
    const radius = 3;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = gridX + dx;
        const y = gridY + dy;
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const falloff = 1 - dist / radius;
            this.cells[x][y].vx += vx * falloff;
            this.cells[x][y].vy += vy * falloff;
            this.cells[x][y].density += amount * falloff;
            this.cells[x][y].hue = hue;
          }
        }
      }
    }
  }

  private velocityStep(audio: AudioData): void {
    // Diffuse velocity (viscosity)
    this.diffuseVelocity(this.viscosity * (1 + audio.rms * 0.5));

    // Project to ensure incompressibility
    this.project();

    // Advect velocity
    this.advectVelocity();

    // Project again
    this.project();
  }

  private densityStep(audio: AudioData): void {
    // Diffuse density
    this.diffuseDensity(this.diffusion * (1 + audio.rms * 2));

    // Advect density
    this.advectDensity();

    // Decay density over time
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.cells[x][y].density *= 0.99;
      }
    }
  }

  private diffuseVelocity(visc: number): void {
    const a = this.dt * visc * this.gridWidth * this.gridHeight;
    this.linearSolveVelocity(a, 1 + 4 * a, 4);
  }

  private diffuseDensity(diff: number): void {
    const a = this.dt * diff * this.gridWidth * this.gridHeight;
    this.linearSolveDensity(a, 1 + 4 * a, 4);
  }

  private linearSolveVelocity(a: number, c: number, iterations: number): void {
    for (let iter = 0; iter < iterations; iter++) {
      for (let x = 1; x < this.gridWidth - 1; x++) {
        for (let y = 1; y < this.gridHeight - 1; y++) {
          this.cells[x][y].vx =
            (this.cells[x][y].vx +
              a *
                (this.cells[x - 1][y].vx +
                  this.cells[x + 1][y].vx +
                  this.cells[x][y - 1].vx +
                  this.cells[x][y + 1].vx)) /
            c;
          this.cells[x][y].vy =
            (this.cells[x][y].vy +
              a *
                (this.cells[x - 1][y].vy +
                  this.cells[x + 1][y].vy +
                  this.cells[x][y - 1].vy +
                  this.cells[x][y + 1].vy)) /
            c;
        }
      }
    }
  }

  private linearSolveDensity(a: number, c: number, iterations: number): void {
    for (let iter = 0; iter < iterations; iter++) {
      for (let x = 1; x < this.gridWidth - 1; x++) {
        for (let y = 1; y < this.gridHeight - 1; y++) {
          this.cells[x][y].density =
            (this.cells[x][y].density +
              a *
                (this.cells[x - 1][y].density +
                  this.cells[x + 1][y].density +
                  this.cells[x][y - 1].density +
                  this.cells[x][y + 1].density)) /
            c;
        }
      }
    }
  }

  private project(): void {
    // Calculate divergence
    const div: number[][] = [];
    const p: number[][] = [];
    for (let x = 0; x < this.gridWidth; x++) {
      div[x] = [];
      p[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        div[x][y] = 0;
        p[x][y] = 0;
      }
    }

    for (let x = 1; x < this.gridWidth - 1; x++) {
      for (let y = 1; y < this.gridHeight - 1; y++) {
        div[x][y] =
          -0.5 *
          (this.cells[x + 1][y].vx -
            this.cells[x - 1][y].vx +
            this.cells[x][y + 1].vy -
            this.cells[x][y - 1].vy) /
          this.gridWidth;
      }
    }

    // Solve for pressure
    for (let iter = 0; iter < 20; iter++) {
      for (let x = 1; x < this.gridWidth - 1; x++) {
        for (let y = 1; y < this.gridHeight - 1; y++) {
          p[x][y] =
            (div[x][y] +
              p[x - 1][y] +
              p[x + 1][y] +
              p[x][y - 1] +
              p[x][y + 1]) /
            4;
        }
      }
    }

    // Subtract pressure gradient
    for (let x = 1; x < this.gridWidth - 1; x++) {
      for (let y = 1; y < this.gridHeight - 1; y++) {
        this.cells[x][y].vx -= 0.5 * this.gridWidth * (p[x + 1][y] - p[x - 1][y]);
        this.cells[x][y].vy -= 0.5 * this.gridWidth * (p[x][y + 1] - p[x][y - 1]);
      }
    }
  }

  private advectVelocity(): void {
    const dt0 = this.dt * Math.max(this.gridWidth, this.gridHeight);
    const newVx: number[][] = [];
    const newVy: number[][] = [];

    for (let x = 0; x < this.gridWidth; x++) {
      newVx[x] = [];
      newVy[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        newVx[x][y] = this.cells[x][y].vx;
        newVy[x][y] = this.cells[x][y].vy;
      }
    }

    for (let x = 1; x < this.gridWidth - 1; x++) {
      for (let y = 1; y < this.gridHeight - 1; y++) {
        let x0 = x - dt0 * this.cells[x][y].vx;
        let y0 = y - dt0 * this.cells[x][y].vy;

        x0 = Math.max(0.5, Math.min(this.gridWidth - 1.5, x0));
        y0 = Math.max(0.5, Math.min(this.gridHeight - 1.5, y0));

        const i0 = Math.floor(x0);
        const i1 = i0 + 1;
        const j0 = Math.floor(y0);
        const j1 = j0 + 1;

        const s1 = x0 - i0;
        const s0 = 1 - s1;
        const t1 = y0 - j0;
        const t0 = 1 - t1;

        newVx[x][y] =
          s0 * (t0 * this.cells[i0][j0].vx + t1 * this.cells[i0][j1].vx) +
          s1 * (t0 * this.cells[i1][j0].vx + t1 * this.cells[i1][j1].vx);

        newVy[x][y] =
          s0 * (t0 * this.cells[i0][j0].vy + t1 * this.cells[i0][j1].vy) +
          s1 * (t0 * this.cells[i1][j0].vy + t1 * this.cells[i1][j1].vy);
      }
    }

    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.cells[x][y].vx = newVx[x][y];
        this.cells[x][y].vy = newVy[x][y];
      }
    }
  }

  private advectDensity(): void {
    const dt0 = this.dt * Math.max(this.gridWidth, this.gridHeight);
    const newDensity: number[][] = [];
    const newHue: number[][] = [];

    for (let x = 0; x < this.gridWidth; x++) {
      newDensity[x] = [];
      newHue[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        newDensity[x][y] = this.cells[x][y].density;
        newHue[x][y] = this.cells[x][y].hue;
      }
    }

    for (let x = 1; x < this.gridWidth - 1; x++) {
      for (let y = 1; y < this.gridHeight - 1; y++) {
        let x0 = x - dt0 * this.cells[x][y].vx;
        let y0 = y - dt0 * this.cells[x][y].vy;

        x0 = Math.max(0.5, Math.min(this.gridWidth - 1.5, x0));
        y0 = Math.max(0.5, Math.min(this.gridHeight - 1.5, y0));

        const i0 = Math.floor(x0);
        const i1 = i0 + 1;
        const j0 = Math.floor(y0);
        const j1 = j0 + 1;

        const s1 = x0 - i0;
        const s0 = 1 - s1;
        const t1 = y0 - j0;
        const t0 = 1 - t1;

        newDensity[x][y] =
          s0 * (t0 * this.cells[i0][j0].density + t1 * this.cells[i0][j1].density) +
          s1 * (t0 * this.cells[i1][j0].density + t1 * this.cells[i1][j1].density);

        newHue[x][y] =
          s0 * (t0 * this.cells[i0][j0].hue + t1 * this.cells[i0][j1].hue) +
          s1 * (t0 * this.cells[i1][j0].hue + t1 * this.cells[i1][j1].hue);
      }
    }

    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.cells[x][y].density = newDensity[x][y];
        this.cells[x][y].hue = newHue[x][y];
      }
    }
  }

  private draw(_audio: AudioData): void {
    this.graphics.clear();

    // Draw fluid as colored circles
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const cell = this.cells[x][y];
        if (cell.density > 0.1) {
          const alpha = Math.min(1, cell.density / 30);
          const color = hslToHex(cell.hue, 70, 50);

          this.graphics.beginFill(color, alpha);
          this.graphics.drawCircle(
            x * this.cellSize + this.cellSize / 2,
            y * this.cellSize + this.cellSize / 2,
            this.cellSize * 0.6
          );
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

