import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Bolt {
  segments: { x: number; y: number }[];
  life: number;
  intensity: number;
}

export class Lightning implements Pattern {
  public name = 'Lightning';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private bolts: Bolt[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn lightning on click or beat or randomly based on audio
    if (audio.beat && Math.random() < 0.5) {
      this.createBolt(
        randomRange(0, this.context.width),
        0,
        1 + audio.bass
      );
    }
    
    // Additional random strikes based on audio energy
    if (Math.random() < audio.rms * 0.02) {
      this.createBolt(
        randomRange(this.context.width * 0.2, this.context.width * 0.8),
        randomRange(0, this.context.height * 0.3),
        0.8 + audio.treble
      );
    }

    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05) {
        this.createBolt(click.x, click.y, 1.5);
      }
    });

    // Update bolts
    this.bolts = this.bolts.filter((bolt) => {
      bolt.life -= dt * 2;
      return bolt.life > 0;
    });

    this.draw();
  }

  private createBolt(startX: number, startY: number, intensity: number): void {
    const segments: { x: number; y: number }[] = [{ x: startX, y: startY }];
    
    let x = startX;
    let y = startY;
    const targetY = this.context.height;
    const stepSize = 20;
    const displacement = 30;

    // L-system-like branching
    while (y < targetY) {
      x += randomRange(-displacement, displacement);
      y += stepSize;

      segments.push({ x, y });

      // Random branches
      if (Math.random() < 0.2 && segments.length < 30) {
        const branchX = x;
        const branchY = y;
        
        for (let i = 0; i < 3; i++) {
          const bx = branchX + randomRange(-50, 50);
          const by = branchY + i * stepSize;
          segments.push({ x: bx, y: by });
        }
      }
    }

    this.bolts.push({
      segments,
      life: 1,
      intensity,
    });
  }

  private draw(): void {
    // Don't clear - let trails build up via feedback system
    // this.graphics.clear();

    this.bolts.forEach((bolt) => {
      const alpha = bolt.life;
      const width = 2 * bolt.intensity * bolt.life;

      // Glow layer
      this.graphics.lineStyle(width * 5, 0x88bbff, alpha * 0.2);
      for (let i = 1; i < bolt.segments.length; i++) {
        const prev = bolt.segments[i - 1];
        const curr = bolt.segments[i];
        this.graphics.moveTo(prev.x, prev.y);
        this.graphics.lineTo(curr.x, curr.y);
      }

      // Core bolt
      this.graphics.lineStyle(width, 0xffffff, alpha);
      for (let i = 1; i < bolt.segments.length; i++) {
        const prev = bolt.segments[i - 1];
        const curr = bolt.segments[i];
        this.graphics.moveTo(prev.x, prev.y);
        this.graphics.lineTo(curr.x, curr.y);
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

