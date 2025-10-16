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
  private maxBranches: number = 1000;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initGrowth();
  }

  private initGrowth(): void {
    // Start from center with multiple initial branches for immediate visibility
    for (let i = 0; i < 5; i++) {
      this.branches.push({
        x: this.context.width / 2,
        y: this.context.height / 2,
        angle: (i / 5) * Math.PI * 2 + Math.random() * 0.3,
        length: 15, // Increased from 10 for more visible growth
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
        for (let i = 0; i < 5; i++) { // Increased from 3 to 5 branches per click
          this.branches.push({
            x: click.x,
            y: click.y,
            angle: Math.random() * Math.PI * 2,
            length: 12, // Increased from 8 for more visibility
            generation: 0,
          });
        }
      }
    });

    // Grow branches based on audio energy
    const growthRate = audio.rms * 20;
    
    if (this.branches.length < this.maxBranches && Math.random() < growthRate * dt) {
      // Pick a random existing branch to grow from
      const parent = this.branches[Math.floor(Math.random() * this.branches.length)];
      
      // Constrained angle variation (mycelium characteristic)
      const angleVariation = randomRange(-0.5, 0.5);
      const newAngle = parent.angle + angleVariation;
      
      const newX = parent.x + Math.cos(parent.angle) * parent.length;
      const newY = parent.y + Math.sin(parent.angle) * parent.length;

      // Check bounds
      if (newX > 0 && newX < this.context.width && newY > 0 && newY < this.context.height) {
        this.branches.push({
          x: newX,
          y: newY,
          angle: newAngle,
          length: parent.length * randomRange(0.8, 1.1),
          generation: parent.generation + 1,
        });
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
      const alpha = 0.5 + audio.mid * 0.4; // Increased from 0.3 to 0.5 for visibility
      const width = Math.max(1.5, 4 - branch.generation * 0.1) * (audio.beat ? 1.5 : 1); // Thicker branches (3→4, 1→1.5)

      this.graphics.lineStyle(width, this.hslToHex(hue, 60, 50), alpha);
      this.graphics.moveTo(branch.x, branch.y);
      this.graphics.lineTo(endX, endY);

      // Larger, more frequent nodes at branch points (every 3rd instead of 5th)
      if (index % 3 === 0) {
        // Glow layer (larger, more transparent)
        this.graphics.beginFill(this.hslToHex(hue, 90, 60), 0.3);
        this.graphics.drawCircle(branch.x, branch.y, 8 + audio.treble * 4);
        this.graphics.endFill();
        
        // Core node (much larger - was 2-4px, now 5-9px)
        this.graphics.beginFill(this.hslToHex(hue, 80, 70), 0.8);
        this.graphics.drawCircle(branch.x, branch.y, 5 + audio.treble * 4);
        this.graphics.endFill();
        
        // Bright center
        this.graphics.beginFill(0xffffff, 0.6);
        this.graphics.drawCircle(branch.x, branch.y, 2 + audio.treble * 1);
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

