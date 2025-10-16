import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { clamp } from '../utils/math';

interface ChladniNode {
  x: number;
  y: number;
  amplitude: number;
  phase: number;
}

export class Cymatics implements Pattern {
  public name = 'Cymatics';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private modeM: number = 3; // Horizontal mode number
  private modeN: number = 2; // Vertical mode number
  private frequency: number = 5; // Base oscillation frequency
  private resolution: number = 40; // Grid resolution
  private nodes: ChladniNode[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initializeNodes();
  }

  private initializeNodes(): void {
    const { width, height } = this.context;
    this.nodes = [];

    for (let i = 0; i <= this.resolution; i++) {
      for (let j = 0; j <= this.resolution; j++) {
        const x = (i / this.resolution) * width;
        const y = (j / this.resolution) * height;
        
        this.nodes.push({
          x,
          y,
          amplitude: 0,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  private calculateChladniPattern(x: number, y: number, time: number, audio: AudioData): number {
    // Normalize coordinates to [-1, 1]
    const nx = (x / this.context.width) * 2 - 1;
    const ny = (y / this.context.height) * 2 - 1;

    // Chladni plate equation: sin(m*pi*x) * sin(n*pi*y) + sin(n*pi*x) * sin(m*pi*y)
    const m = this.modeM + audio.bass * 2;
    const n = this.modeN + audio.treble * 2;

    const term1 = Math.sin(m * Math.PI * nx) * Math.sin(n * Math.PI * ny);
    const term2 = Math.sin(n * Math.PI * nx) * Math.sin(m * Math.PI * ny);
    
    // Add temporal oscillation
    const oscillation = Math.sin(time * this.frequency);
    
    return (term1 + term2) * oscillation;
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Change modes based on audio
    if (audio.beat) {
      this.modeM = Math.floor(2 + audio.spectrum[0] * 6);
      this.modeN = Math.floor(2 + audio.spectrum[8] * 6);
    }

    // Adjust frequency based on audio
    this.frequency = 3 + audio.rms * 10;

    // Update node amplitudes based on Chladni pattern
    this.nodes.forEach((node) => {
      const pattern = this.calculateChladniPattern(node.x, node.y, this.time, audio);
      node.amplitude = clamp(Math.abs(pattern), 0, 1);
    });

    // Mouse interaction - disturb the pattern
    if (input.isDown) {
      this.nodes.forEach((node) => {
        const dx = node.x - input.x;
        const dy = node.y - input.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 150) {
          node.amplitude += (1 - dist / 150) * 0.5;
          node.phase += 0.1;
        }
      });
    }

    // Click changes mode dramatically
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.modeM = Math.floor(Math.random() * 8) + 1;
        this.modeN = Math.floor(Math.random() * 8) + 1;
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw nodal lines (where amplitude is near zero)
    for (let i = 0; i < this.resolution; i++) {
      for (let j = 0; j < this.resolution; j++) {
        const idx = i * (this.resolution + 1) + j;
        const node = this.nodes[idx];

        if (!node) continue;

        // Color based on amplitude (nodal lines are darker)
        const isNodalLine = node.amplitude < 0.2;
        
        if (isNodalLine) {
          // Nodal lines - where sand would collect
          const brightness = 200 + audio.rms * 55;
          const color = (brightness << 16) | (brightness << 8) | brightness;
          const alpha = 0.8 + audio.bass * 0.2;

          this.graphics.beginFill(color, alpha);
          this.graphics.drawCircle(node.x, node.y, 3 + (audio.beat ? 2 : 0));
          this.graphics.endFill();
        } else {
          // Vibrating regions
          const hue = (this.time * 50 + node.amplitude * 180) % 360;
          const color = this.hslToHex(hue, 70, 30 + node.amplitude * 40);
          const size = node.amplitude * 2 * (1 + audio.rms * 0.5);

          this.graphics.beginFill(color, 0.3 + node.amplitude * 0.4);
          this.graphics.drawCircle(node.x, node.y, size);
          this.graphics.endFill();
        }
      }
    }

    // Draw connecting lines along nodal patterns
    this.graphics.lineStyle(1, 0xffffff, 0.2 + audio.rms * 0.3);

    for (let i = 0; i < this.resolution; i++) {
      for (let j = 0; j < this.resolution; j++) {
        const idx = i * (this.resolution + 1) + j;
        const node = this.nodes[idx];
        
        if (!node || node.amplitude > 0.2) continue;

        // Connect to adjacent nodal points
        const rightIdx = i * (this.resolution + 1) + j + 1;
        const downIdx = (i + 1) * (this.resolution + 1) + j;

        if (j < this.resolution && this.nodes[rightIdx]?.amplitude < 0.2) {
          this.graphics.moveTo(node.x, node.y);
          this.graphics.lineTo(this.nodes[rightIdx].x, this.nodes[rightIdx].y);
        }

        if (i < this.resolution && this.nodes[downIdx]?.amplitude < 0.2) {
          this.graphics.moveTo(node.x, node.y);
          this.graphics.lineTo(this.nodes[downIdx].x, this.nodes[downIdx].y);
        }
      }
    }

    // Note: Mode indicators would require Text object, skipped for simplicity
  }

  private hslToHex(h: number, s: number, l: number): number {
    // Clamp inputs to valid ranges
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
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

    const red = Math.max(0, Math.min(255, Math.round((r + m) * 255)));
    const green = Math.max(0, Math.min(255, Math.round((g + m) * 255)));
    const blue = Math.max(0, Math.min(255, Math.round((b + m) * 255)));

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

