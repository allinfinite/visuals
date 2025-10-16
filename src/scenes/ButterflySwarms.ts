import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { noise2D } from '../utils/noise';

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  wingPhase: number;
  wingSpeed: number;
  size: number;
  hue: number;
  swarmId: number;
}

export class ButterflySwarms implements Pattern {
  public name = 'Butterfly Swarms';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private butterflies: Butterfly[] = [];
  private time: number = 0;
  private swarmCenters: { x: number; y: number }[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize swarm centers
    this.initSwarmCenters();

    // Create butterflies
    for (let i = 0; i < 80; i++) {
      this.spawnButterfly();
    }
  }

  private initSwarmCenters(): void {
    const { width, height } = this.context;
    for (let i = 0; i < 3; i++) {
      this.swarmCenters.push({
        x: randomRange(width * 0.2, width * 0.8),
        y: randomRange(height * 0.2, height * 0.8),
      });
    }
  }

  private spawnButterfly(): void {
    const swarmId = Math.floor(randomRange(0, this.swarmCenters.length));
    const center = this.swarmCenters[swarmId];

    this.butterflies.push({
      x: center.x + randomRange(-100, 100),
      y: center.y + randomRange(-100, 100),
      vx: randomRange(-30, 30),
      vy: randomRange(-30, 30),
      targetX: center.x,
      targetY: center.y,
      wingPhase: randomRange(0, Math.PI * 2),
      wingSpeed: randomRange(8, 15),
      size: randomRange(8, 20),
      hue: swarmId * 120 + randomRange(-30, 30), // Each swarm has similar colors
      swarmId,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Move swarm centers with audio
    this.swarmCenters.forEach((center, idx) => {
      const angle = this.time * 0.5 + idx * Math.PI * 0.66;
      const radius = 100 + audio.bass * 200;
      center.x = this.context.width / 2 + Math.cos(angle) * radius;
      center.y = this.context.height / 2 + Math.sin(angle) * radius;

      // Noise-based movement
      const noiseX = noise2D(center.x * 0.001, this.time * 0.3 + idx);
      const noiseY = noise2D(center.y * 0.001, this.time * 0.3 + idx + 100);
      center.x += noiseX * 50 * dt;
      center.y += noiseY * 50 * dt;

      // Keep in bounds
      center.x = Math.max(100, Math.min(this.context.width - 100, center.x));
      center.y = Math.max(100, Math.min(this.context.height - 100, center.y));
    });

    // Update butterflies
    this.butterflies.forEach((b) => {
      const center = this.swarmCenters[b.swarmId];

      // Flocking behavior
      // 1. Cohesion - move towards swarm center
      const cohesionX = (center.x - b.x) * 0.5;
      const cohesionY = (center.y - b.y) * 0.5;

      // 2. Separation - avoid others
      let separationX = 0;
      let separationY = 0;
      let neighborCount = 0;

      this.butterflies.forEach((other) => {
        if (other !== b && other.swarmId === b.swarmId) {
          const dx = b.x - other.x;
          const dy = b.y - other.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 30 && dist > 0) {
            separationX += dx / dist;
            separationY += dy / dist;
            neighborCount++;
          }
        }
      });

      if (neighborCount > 0) {
        separationX /= neighborCount;
        separationY /= neighborCount;
      }

      // 3. Noise-based wandering
      const noiseX = noise2D(b.x * 0.01, this.time + b.swarmId);
      const noiseY = noise2D(b.y * 0.01, this.time + b.swarmId + 100);

      // Combine forces
      b.vx += (cohesionX * 0.3 + separationX * 2 + noiseX * 50) * dt;
      b.vy += (cohesionY * 0.3 + separationY * 2 + noiseY * 50) * dt;

      // Audio influence - scatter on beat
      if (audio.beat) {
        b.vx += (Math.random() - 0.5) * 100;
        b.vy += (Math.random() - 0.5) * 100;
      }

      // Speed limit with audio boost
      const maxSpeed = 100 + audio.rms * 100;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > maxSpeed) {
        b.vx = (b.vx / speed) * maxSpeed;
        b.vy = (b.vy / speed) * maxSpeed;
      }

      // Apply velocity
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Wrap around screen
      if (b.x < -50) b.x = this.context.width + 50;
      if (b.x > this.context.width + 50) b.x = -50;
      if (b.y < -50) b.y = this.context.height + 50;
      if (b.y > this.context.height + 50) b.y = -50;

      // Wing flapping (faster when moving faster)
      b.wingPhase += b.wingSpeed * dt * (0.5 + speed / maxSpeed);
    });

    // Mouse attraction
    if (input.isDown || input.isDragging) {
      this.butterflies.forEach((b) => {
        const dx = input.x - b.x;
        const dy = input.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 200 && dist > 0) {
          b.vx += (dx / dist) * 30 * dt;
          b.vy += (dy / dist) * 30 * dt;
        }
      });
    }

    // Spawn more on beat
    if (audio.beat && this.butterflies.length < 150) {
      for (let i = 0; i < 3; i++) {
        this.spawnButterfly();
      }
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    this.butterflies.forEach((b) => {
      const wingOpen = Math.abs(Math.sin(b.wingPhase)) * (0.7 + audio.treble * 0.3);
      const angle = Math.atan2(b.vy, b.vx);

      // Body
      this.graphics.lineStyle(3, 0x000000, 0.8);
      this.graphics.moveTo(b.x, b.y);
      const bodyEnd = { x: b.x + Math.cos(angle) * b.size * 0.8, y: b.y + Math.sin(angle) * b.size * 0.8 };
      this.graphics.lineTo(bodyEnd.x, bodyEnd.y);

      // Wings
      const wingAngle1 = angle + Math.PI / 2;
      const wingAngle2 = angle - Math.PI / 2;

      // Left wings
      const leftWingSpan = b.size * 1.5 * wingOpen;
      this.graphics.beginFill(this.hslToHex(b.hue, 80, 60), 0.7);
      this.graphics.drawEllipse(
        b.x + Math.cos(wingAngle1) * leftWingSpan * 0.5,
        b.y + Math.sin(wingAngle1) * leftWingSpan * 0.5,
        leftWingSpan,
        b.size * 0.8
      );
      this.graphics.endFill();

      // Right wings
      const rightWingSpan = b.size * 1.5 * wingOpen;
      this.graphics.beginFill(this.hslToHex(b.hue + 20, 80, 65), 0.7);
      this.graphics.drawEllipse(
        b.x + Math.cos(wingAngle2) * rightWingSpan * 0.5,
        b.y + Math.sin(wingAngle2) * rightWingSpan * 0.5,
        rightWingSpan,
        b.size * 0.8
      );
      this.graphics.endFill();

      // Wing patterns (dots)
      if (wingOpen > 0.3) {
        this.graphics.beginFill(0xffffff, 0.6);
        this.graphics.drawCircle(
          b.x + Math.cos(wingAngle1) * leftWingSpan * 0.3,
          b.y + Math.sin(wingAngle1) * leftWingSpan * 0.3,
          b.size * 0.15
        );
        this.graphics.drawCircle(
          b.x + Math.cos(wingAngle2) * rightWingSpan * 0.3,
          b.y + Math.sin(wingAngle2) * rightWingSpan * 0.3,
          b.size * 0.15
        );
        this.graphics.endFill();
      }
    });

    // Draw swarm center indicators (subtle)
    this.swarmCenters.forEach((center, idx) => {
      const pulseSize = 10 + Math.sin(this.time * 2 + idx) * 5;
      this.graphics.beginFill(this.hslToHex(idx * 120, 70, 50), 0.1 + audio.rms * 0.1);
      this.graphics.drawCircle(center.x, center.y, pulseSize + audio.bass * 30);
      this.graphics.endFill();
    });
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

