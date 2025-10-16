import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';
import { randomRange } from '../utils/math';

interface Arc {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  life: number;
  maxLife: number;
  segments: { x: number; y: number }[];
  hue: number;
  intensity: number;
}

export class PlasmaArcs implements Pattern {
  public name = 'Plasma Arcs';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private arcs: Arc[] = [];
  private time: number = 0;
  private nodes: { x: number; y: number; active: boolean }[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initNodes();
  }

  private initNodes(): void {
    // Create grid of potential arc endpoints
    for (let i = 0; i < 8; i++) {
      this.nodes.push({
        x: randomRange(this.context.width * 0.1, this.context.width * 0.9),
        y: randomRange(this.context.height * 0.1, this.context.height * 0.9),
        active: false,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn arcs on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05) {
        // Find nearest node
        const nearestNode = this.nodes.reduce((closest, node) => {
          const dist = Math.sqrt(
            Math.pow(node.x - click.x, 2) + Math.pow(node.y - click.y, 2)
          );
          return dist < closest.dist ? { node, dist } : closest;
        }, { node: this.nodes[0], dist: Infinity });

        this.createArc(click.x, click.y, nearestNode.node.x, nearestNode.node.y, audio);
      }
    });

    // Autonomous arc spawning between random nodes
    if (audio.beat && Math.random() < 0.4 && this.arcs.length < 10) {
      const node1 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      const node2 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      if (node1 !== node2) {
        this.createArc(node1.x, node1.y, node2.x, node2.y, audio);
      }
    }

    // Update arcs
    this.arcs = this.arcs.filter((arc) => {
      arc.life -= dt;
      
      // Update segments with noise displacement
      arc.segments.forEach((seg, i) => {
        if (i > 0 && i < arc.segments.length - 1) {
          const noiseVal = noise2D(seg.x * 0.01 + this.time, seg.y * 0.01);
          seg.x += noiseVal * 2;
          seg.y += noiseVal * 2;
        }
      });

      return arc.life > 0;
    });

    this.draw(audio);
  }

  private createArc(startX: number, startY: number, endX: number, endY: number, audio: AudioData): void {
    const segments: { x: number; y: number }[] = [];
    const numSegments = 20;

    // Create arc path with Perlin displacement
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      
      // Add perpendicular displacement
      const perpX = -(endY - startY);
      const perpY = endX - startX;
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
      
      const displacement = Math.sin(t * Math.PI) * 30 * (1 + audio.bass);
      
      segments.push({
        x: x + (perpX / perpLen) * displacement,
        y: y + (perpY / perpLen) * displacement,
      });
    }

    this.arcs.push({
      startX,
      startY,
      endX,
      endY,
      life: 1,
      maxLife: 1,
      segments,
      hue: (audio.centroid * 360 + this.time * 50) % 360,
      intensity: 0.5 + audio.rms * 0.5,
    });
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    this.graphics.clear();

    // Draw nodes
    this.nodes.forEach((node) => {
      const size = 4 + audio.treble * 4;
      this.graphics.beginFill(0x00ffff, 0.5);
      this.graphics.drawCircle(node.x, node.y, size);
      this.graphics.endFill();
    });

    // Draw arcs
    this.arcs.forEach((arc) => {
      const alpha = arc.life * arc.intensity;
      
      // Outer glow
      this.graphics.lineStyle(
        8 * arc.intensity,
        this.hslToHex(arc.hue, 100, 50),
        alpha * 0.3
      );
      
      this.graphics.moveTo(arc.segments[0].x, arc.segments[0].y);
      for (let i = 1; i < arc.segments.length; i++) {
        this.graphics.lineTo(arc.segments[i].x, arc.segments[i].y);
      }

      // Core arc
      this.graphics.lineStyle(
        2 * arc.intensity,
        this.hslToHex(arc.hue, 100, 80),
        alpha
      );
      
      this.graphics.moveTo(arc.segments[0].x, arc.segments[0].y);
      for (let i = 1; i < arc.segments.length; i++) {
        this.graphics.lineTo(arc.segments[i].x, arc.segments[i].y);
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

