import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Node {
  x: number;
  y: number;
  energy: number;
}

interface Edge {
  from: Node;
  to: Node;
  pulse: number; // 0-1 position along edge
  active: boolean;
}

export class CircuitPulses implements Pattern {
  public name = 'Circuit Pulses';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initCircuit();
  }

  private initCircuit(): void {
    const { width, height } = this.context;
    const gridSize = 6;
    const spacing = Math.min(width, height) / (gridSize + 1);

    // Create grid of nodes
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        this.nodes.push({
          x: (i + 1) * spacing + randomRange(-20, 20),
          y: (j + 1) * spacing + randomRange(-20, 20),
          energy: 0,
        });
      }
    }

    // Create edges with Manhattan-style routing
    this.nodes.forEach((node, idx) => {
      const row = Math.floor(idx / gridSize);
      const col = idx % gridSize;

      // Connect to right neighbor
      if (col < gridSize - 1) {
        const rightIdx = idx + 1;
        this.edges.push({
          from: node,
          to: this.nodes[rightIdx],
          pulse: 0,
          active: false,
        });
      }

      // Connect to bottom neighbor
      if (row < gridSize - 1) {
        const bottomIdx = idx + gridSize;
        this.edges.push({
          from: node,
          to: this.nodes[bottomIdx],
          pulse: 0,
          active: false,
        });
      }
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Trigger new pulses on beat (more responsive)
    if (audio.beat || audio.rms > 0.7) {
      const randomEdge = this.edges[Math.floor(Math.random() * this.edges.length)];
      if (!randomEdge.active) {
        randomEdge.active = true;
        randomEdge.pulse = 0;
      }
    }

    // Random pulses based on audio energy
    if (Math.random() < audio.rms * 0.05) {
      const randomEdge = this.edges[Math.floor(Math.random() * this.edges.length)];
      if (!randomEdge.active) {
        randomEdge.active = true;
        randomEdge.pulse = 0;
      }
    }

    // Update pulses (faster with audio)
    const speed = 2 + audio.rms * 5 + audio.treble * 2;
    this.edges.forEach((edge) => {
      if (edge.active) {
        edge.pulse += dt * speed;
        if (edge.pulse >= 1) {
          edge.active = false;
          edge.pulse = 0;
          // Energize destination node
          edge.to.energy = 1;
        }
      }
    });

    // Decay node energy
    this.nodes.forEach((node) => {
      node.energy *= 0.95;
    });

    // Handle clicks to add energy
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        // Find nearest node
        let nearest = this.nodes[0];
        let minDist = Infinity;
        this.nodes.forEach((node) => {
          const dist = Math.hypot(node.x - click.x, node.y - click.y);
          if (dist < minDist) {
            minDist = dist;
            nearest = node;
          }
        });
        nearest.energy = 1;
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw edges
    this.edges.forEach((edge) => {
      const alpha = 0.15 + (edge.active ? 0.3 : 0);
      this.graphics.lineStyle(1, 0x00ffff, alpha);
      this.graphics.moveTo(edge.from.x, edge.from.y);
      this.graphics.lineTo(edge.to.x, edge.to.y);

      // Draw traveling pulse
      if (edge.active) {
        const x = edge.from.x + (edge.to.x - edge.from.x) * edge.pulse;
        const y = edge.from.y + (edge.to.y - edge.from.y) * edge.pulse;
        
        // Spark glow
        this.graphics.beginFill(0x00ffff, 0.6);
        this.graphics.drawCircle(x, y, 4);
        this.graphics.endFill();

        this.graphics.beginFill(0xffffff, 0.8);
        this.graphics.drawCircle(x, y, 2);
        this.graphics.endFill();

        // Trail
        const trailLength = 0.15;
        for (let i = 0; i < 5; i++) {
          const trailPos = edge.pulse - (i * trailLength / 5);
          if (trailPos >= 0) {
            const tx = edge.from.x + (edge.to.x - edge.from.x) * trailPos;
            const ty = edge.from.y + (edge.to.y - edge.from.y) * trailPos;
            const trailAlpha = (1 - i / 5) * 0.3;
            this.graphics.beginFill(0x00ffff, trailAlpha);
            this.graphics.drawCircle(tx, ty, 2 - i * 0.3);
            this.graphics.endFill();
          }
        }
      }
    });

    // Draw nodes
    this.nodes.forEach((node) => {
      const baseSize = 3;
      const glowSize = baseSize + node.energy * 8;
      const hue = 180 + audio.centroid * 60;
      
      // Glow
      if (node.energy > 0.1) {
        this.graphics.beginFill(this.hslToHex(hue, 100, 50), node.energy * 0.4);
        this.graphics.drawCircle(node.x, node.y, glowSize);
        this.graphics.endFill();
      }

      // Core
      this.graphics.beginFill(0x00ffff, 0.6 + node.energy * 0.4);
      this.graphics.drawCircle(node.x, node.y, baseSize);
      this.graphics.endFill();
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

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

