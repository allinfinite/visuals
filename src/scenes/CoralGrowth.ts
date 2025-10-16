import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  thickness: number;
  depth: number;
  maxDepth: number;
  age: number;
  growing: boolean;
  hue: number;
}

export class CoralGrowth implements Pattern {
  public name = 'Coral Growth';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private branches: Branch[] = [];
  private time: number = 0;
  private growthSpeed: number = 50; // pixels per second

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Start with a base branch at the bottom
    this.spawnRootBranch(context.width / 2, context.height - 50);
  }

  private spawnRootBranch(x: number, y: number): void {
    this.branches.push({
      x,
      y,
      angle: -Math.PI / 2, // Grow upward
      length: 0,
      thickness: 8,
      depth: 0,
      maxDepth: 6,
      age: 0,
      growing: true,
      hue: randomRange(180, 220), // Blue-green coral colors
    });
  }

  private spawnChildBranch(parent: Branch, angleOffset: number): void {
    const endX = parent.x + Math.cos(parent.angle) * parent.length;
    const endY = parent.y + Math.sin(parent.angle) * parent.length;

    const childAngle = parent.angle + angleOffset + randomRange(-0.2, 0.2);
    const childThickness = parent.thickness * randomRange(0.6, 0.8);

    this.branches.push({
      x: endX,
      y: endY,
      angle: childAngle,
      length: 0,
      thickness: Math.max(1, childThickness),
      depth: parent.depth + 1,
      maxDepth: parent.maxDepth,
      age: 0,
      growing: true,
      hue: (parent.hue + randomRange(-10, 10) + 360) % 360,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Growth speed affected by audio
    const audioGrowthMultiplier = 1 + audio.rms * 2 + (audio.beat ? 1 : 0);

    // Update branches
    this.branches.forEach((branch) => {
      if (branch.growing) {
        branch.age += dt;
        
        // Target length based on depth
        const targetLength = 40 + (branch.maxDepth - branch.depth) * 15;
        
        // Grow the branch
        if (branch.length < targetLength) {
          branch.length += this.growthSpeed * dt * audioGrowthMultiplier;
        } else {
          branch.length = targetLength;
          branch.growing = false;

          // Spawn child branches when growth complete
          if (branch.depth < branch.maxDepth) {
            const branchCount = Math.floor(randomRange(2, 4));
            
            for (let i = 0; i < branchCount; i++) {
              const angleSpread = Math.PI * 0.6; // 108 degrees total spread
              const angleOffset = -angleSpread / 2 + (i / (branchCount - 1)) * angleSpread;
              this.spawnChildBranch(branch, angleOffset);
            }
          }
        }
      }
    });

    // Click spawns new coral at location
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.spawnRootBranch(click.x, click.y);
      }
    });

    // Beat spawns new coral polyps
    if (audio.beat && Math.random() < 0.2) {
      this.spawnRootBranch(
        randomRange(this.context.width * 0.2, this.context.width * 0.8),
        randomRange(this.context.height * 0.5, this.context.height - 50)
      );
    }

    // Limit total branches
    if (this.branches.length > 500) {
      // Remove oldest branches
      this.branches = this.branches.slice(-400);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw branches from deepest to shallowest (back to front)
    const sortedBranches = [...this.branches].sort((a, b) => b.depth - a.depth);

    sortedBranches.forEach((branch) => {
      if (branch.length < 1) return;

      const endX = branch.x + Math.cos(branch.angle) * branch.length;
      const endY = branch.y + Math.sin(branch.angle) * branch.length;

      // Color gradient from base to tip
      const depthFactor = branch.depth / branch.maxDepth;
      const lightness = 40 + depthFactor * 30; // Lighter at tips
      const saturation = 70 - depthFactor * 20; // Less saturated at tips
      
      const baseColor = this.hslToHex(branch.hue, saturation, lightness);
      const tipColor = this.hslToHex(branch.hue + 10, saturation - 10, lightness + 15);

      // Draw branch with gradient effect (simulate with segments)
      const segments = Math.max(3, Math.floor(branch.length / 10));
      
      for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        
        const x1 = branch.x + Math.cos(branch.angle) * branch.length * t1;
        const y1 = branch.y + Math.sin(branch.angle) * branch.length * t1;
        const x2 = branch.x + Math.cos(branch.angle) * branch.length * t2;
        const y2 = branch.y + Math.sin(branch.angle) * branch.length * t2;
        
        const thickness1 = branch.thickness * (1 - t1 * 0.5);
        const thickness2 = branch.thickness * (1 - t2 * 0.5);
        
        // Interpolate color
        const segmentColor = this.lerpColor(baseColor, tipColor, t1);
        const alpha = 0.8 + audio.rms * 0.2;

        this.graphics.lineStyle((thickness1 + thickness2) / 2, segmentColor, alpha);
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
      }

      // Draw polyp at tip (if fully grown and is a leaf node)
      if (!branch.growing && branch.depth === branch.maxDepth) {
        const polypSize = 3 + audio.bass * 3;
        const polypColor = this.hslToHex(branch.hue + 20, 90, 70);
        
        // Polyp tentacles
        const tentacleCount = 8;
        for (let i = 0; i < tentacleCount; i++) {
          const tentacleAngle = (i / tentacleCount) * Math.PI * 2 + this.time * 2;
          const tentacleLength = polypSize * 2;
          
          this.graphics.lineStyle(1, polypColor, 0.6);
          this.graphics.moveTo(endX, endY);
          this.graphics.lineTo(
            endX + Math.cos(tentacleAngle) * tentacleLength,
            endY + Math.sin(tentacleAngle) * tentacleLength
          );
        }

        // Polyp body
        this.graphics.beginFill(polypColor, 0.8);
        this.graphics.drawCircle(endX, endY, polypSize);
        this.graphics.endFill();

        // Bright center
        this.graphics.beginFill(0xffffff, 0.6 + audio.treble * 0.4);
        this.graphics.drawCircle(endX, endY, polypSize * 0.4);
        this.graphics.endFill();
      }

      // Growing tip glow
      if (branch.growing) {
        const glowSize = branch.thickness * (1 + audio.rms * 0.5);
        const glowColor = this.hslToHex(branch.hue, 100, 80);
        
        this.graphics.beginFill(glowColor, 0.4);
        this.graphics.drawCircle(endX, endY, glowSize);
        this.graphics.endFill();
      }
    });
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

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

