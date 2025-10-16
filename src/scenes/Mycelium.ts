import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  generation: number;
}

export class Mycelium implements Pattern {
  public name = 'Mycelium Growth';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private branches: Branch[] = [];
  private time: number = 0;
  private maxBranches: number = 3000; // Increased from 1000 to allow more growth

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initGrowth();
  }

  private initGrowth(): void {
    // Start from center with multiple initial branches for immediate visibility
    for (let i = 0; i < 8; i++) {
      this.branches.push({
        x: this.context.width / 2,
        y: this.context.height / 2,
        angle: (i / 8) * Math.PI * 2 + Math.random() * 0.3,
        length: 25, // Increased from 15 for more visible growth
        generation: 0,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn new growth from clicks
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.branches.length < this.maxBranches) {
        for (let i = 0; i < 10; i++) { // Increased from 5 to 10 branches per click
          this.branches.push({
            x: click.x,
            y: click.y,
            angle: Math.random() * Math.PI * 2,
            length: 20, // Increased from 12 for more visibility
            generation: 0,
          });
        }
      }
    });

    // Grow branches - constant base rate + audio reactive boost
    const baseGrowthRate = 15; // Always growing
    const audioBoost = audio.rms * 30; // Audio adds extra growth
    const totalGrowthRate = baseGrowthRate + audioBoost;
    
    // Multiple growth attempts per frame for faster expansion
    const growthAttempts = Math.ceil(totalGrowthRate * dt);
    
    for (let attempt = 0; attempt < growthAttempts; attempt++) {
      if (this.branches.length >= this.maxBranches) break;
      
      // Pick a random existing branch to grow from
      const parent = this.branches[Math.floor(Math.random() * this.branches.length)];
      
      // Constrained angle variation (mycelium characteristic)
      const angleVariation = randomRange(-0.6, 0.6);
      const newAngle = parent.angle + angleVariation;
      
      const newX = parent.x + Math.cos(parent.angle) * parent.length;
      const newY = parent.y + Math.sin(parent.angle) * parent.length;

      // Check bounds
      if (newX > 0 && newX < this.context.width && newY > 0 && newY < this.context.height) {
        // Occasionally branch in multiple directions for more organic spread
        const branchCount = Math.random() < 0.3 ? 2 : 1;
        
        for (let b = 0; b < branchCount; b++) {
          const branchAngle = newAngle + (b > 0 ? randomRange(-1, 1) : 0);
          this.branches.push({
            x: newX,
            y: newY,
            angle: branchAngle,
            length: parent.length * randomRange(0.85, 1.15),
            generation: parent.generation + 1,
          });
        }
      }
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    this.graphics.clear();

    this.branches.forEach((branch, index) => {
      const endX = branch.x + Math.cos(branch.angle) * branch.length;
      const endY = branch.y + Math.sin(branch.angle) * branch.length;

      // Color based on generation
      const hue = (branch.generation * 20 + this.time * 10) % 120 + 200; // Blue-green
      const alpha = 0.6 + audio.mid * 0.3; // Increased base alpha
      const width = Math.max(2, 5 - branch.generation * 0.1) * (audio.beat ? 1.5 : 1); // Thicker branches (4→5, 1.5→2)

      // Draw branch with glow
      this.graphics.lineStyle(width + 2, this.hslToHex(hue, 80, 40), alpha * 0.3);
      this.graphics.moveTo(branch.x, branch.y);
      this.graphics.lineTo(endX, endY);
      
      this.graphics.lineStyle(width, this.hslToHex(hue, 70, 55), alpha);
      this.graphics.moveTo(branch.x, branch.y);
      this.graphics.lineTo(endX, endY);

      // More frequent, bigger nodes at branch points
      if (index % 2 === 0) {
        // Outer glow layer
        this.graphics.beginFill(this.hslToHex(hue, 90, 60), 0.2);
        this.graphics.drawCircle(branch.x, branch.y, 12 + audio.treble * 6);
        this.graphics.endFill();
        
        // Glow layer
        this.graphics.beginFill(this.hslToHex(hue, 90, 65), 0.4);
        this.graphics.drawCircle(branch.x, branch.y, 8 + audio.treble * 4);
        this.graphics.endFill();
        
        // Core node (larger)
        this.graphics.beginFill(this.hslToHex(hue, 85, 75), 0.9);
        this.graphics.drawCircle(branch.x, branch.y, 6 + audio.treble * 3);
        this.graphics.endFill();
        
        // Bright center
        this.graphics.beginFill(0xffffff, 0.8);
        this.graphics.drawCircle(branch.x, branch.y, 3 + audio.treble * 1.5);
        this.graphics.endFill();
      }
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
    // Clamp inputs to valid ranges
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

