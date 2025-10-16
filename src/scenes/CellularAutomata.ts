import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

export class CellularAutomata implements Pattern {
  public name = 'Cellular Automata';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private gridWidth: number = 80;
  private gridHeight: number = 60;
  private cellSize: number;
  private cells: boolean[][] = [];
  private nextCells: boolean[][] = [];
  private time: number = 0;
  private updateInterval: number = 0.1; // Seconds between updates
  private timeSinceUpdate: number = 0;
  private generation: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.cellSize = Math.min(
      context.width / this.gridWidth,
      context.height / this.gridHeight
    );
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initializeGrid();
    this.randomizeCells(0.3);
  }

  private initializeGrid(): void {
    this.cells = [];
    this.nextCells = [];
    
    for (let y = 0; y < this.gridHeight; y++) {
      this.cells[y] = [];
      this.nextCells[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.cells[y][x] = false;
        this.nextCells[y][x] = false;
      }
    }
  }

  private randomizeCells(density: number): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.cells[y][x] = Math.random() < density;
      }
    }
    this.generation = 0;
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = (x + dx + this.gridWidth) % this.gridWidth;
        const ny = (y + dy + this.gridHeight) % this.gridHeight;
        
        if (this.cells[ny][nx]) count++;
      }
    }
    
    return count;
  }

  private updateCells(): void {
    // Conway's Game of Life rules
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const neighbors = this.countNeighbors(x, y);
        const alive = this.cells[y][x];
        
        if (alive) {
          // Cell survives with 2 or 3 neighbors
          this.nextCells[y][x] = neighbors === 2 || neighbors === 3;
        } else {
          // Dead cell becomes alive with exactly 3 neighbors
          this.nextCells[y][x] = neighbors === 3;
        }
      }
    }
    
    // Swap buffers
    [this.cells, this.nextCells] = [this.nextCells, this.cells];
    this.generation++;
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.timeSinceUpdate += dt;

    // Update speed based on audio
    const speedMultiplier = 1 + audio.rms * 2;
    const adjustedInterval = this.updateInterval / speedMultiplier;

    if (this.timeSinceUpdate >= adjustedInterval) {
      this.updateCells();
      this.timeSinceUpdate = 0;
    }

    // Seed cells on beat
    if (audio.beat && Math.random() < 0.5) {
      const count = Math.floor(5 + audio.bass * 20);
      for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * this.gridWidth);
        const y = Math.floor(Math.random() * this.gridHeight);
        this.cells[y][x] = true;
      }
    }

    // Click to toggle cells or spawn patterns
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        const gridX = Math.floor((click.x / this.context.width) * this.gridWidth);
        const gridY = Math.floor((click.y / this.context.height) * this.gridHeight);
        
        // Spawn a glider pattern
        this.spawnGlider(gridX, gridY);
      }
    });

    // Mouse drag seeds cells
    if (input.isDragging) {
      const gridX = Math.floor((input.x / this.context.width) * this.gridWidth);
      const gridY = Math.floor((input.y / this.context.height) * this.gridHeight);
      
      if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
        this.cells[gridY][gridX] = true;
        // Also activate neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = gridX + dx;
            const ny = gridY + dy;
            if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
              if (Math.random() < 0.5) {
                this.cells[ny][nx] = true;
              }
            }
          }
        }
      }
    }

    // Reset if all cells are dead
    let aliveCount = 0;
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.cells[y][x]) aliveCount++;
      }
    }
    
    if (aliveCount < 10) {
      this.randomizeCells(0.25 + audio.rms * 0.3);
    }

    this.draw(audio);
  }

  private spawnGlider(x: number, y: number): void {
    // Classic glider pattern
    const pattern = [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1],
    ];
    
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const nx = (x + dx) % this.gridWidth;
        const ny = (y + dy) % this.gridHeight;
        if (pattern[dy][dx] === 1) {
          this.cells[ny][nx] = true;
        }
      }
    }
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    const offsetX = (this.context.width - this.gridWidth * this.cellSize) / 2;
    const offsetY = (this.context.height - this.gridHeight * this.cellSize) / 2;

    // Draw cells
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (!this.cells[y][x]) continue;

        const screenX = offsetX + x * this.cellSize;
        const screenY = offsetY + y * this.cellSize;

        // Cell age visualization (count stable neighbors)
        const neighbors = this.countNeighbors(x, y);
        const hue = (neighbors * 40 + this.time * 30 + audio.centroid * 100) % 360;
        const color = this.hslToHex(hue, 80, 60);

        // Glow for cells with many neighbors
        if (neighbors > 5) {
          this.graphics.beginFill(color, 0.3 + audio.rms * 0.3);
          this.graphics.drawRect(
            screenX - this.cellSize * 0.5,
            screenY - this.cellSize * 0.5,
            this.cellSize * 2,
            this.cellSize * 2
          );
          this.graphics.endFill();
        }

        // Main cell
        const alpha = 0.8 + (audio.beat ? 0.2 : 0);
        this.graphics.beginFill(color, alpha);
        this.graphics.drawRect(
          screenX,
          screenY,
          this.cellSize * 0.9,
          this.cellSize * 0.9
        );
        this.graphics.endFill();

        // Bright core for active cells
        if (neighbors === 2 || neighbors === 3) {
          this.graphics.beginFill(0xffffff, 0.5 + audio.treble * 0.3);
          this.graphics.drawRect(
            screenX + this.cellSize * 0.25,
            screenY + this.cellSize * 0.25,
            this.cellSize * 0.4,
            this.cellSize * 0.4
          );
          this.graphics.endFill();
        }
      }
    }

    // Draw generation counter (as visual indicator)
    const genPulse = Math.sin(this.time * 3) * 0.3 + 0.7;
    this.graphics.beginFill(0xffffff, 0.1 + genPulse * 0.1);
    this.graphics.drawCircle(30, 30, 5 + (this.generation % 100) * 0.1);
    this.graphics.endFill();
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

