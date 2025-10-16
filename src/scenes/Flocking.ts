import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
}

export class Flocking implements Pattern {
  public name = 'Flocking Creatures';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private boids: Boid[] = [];
  private time: number = 0;

  private params = {
    separationDist: 25,
    alignmentDist: 50,
    cohesionDist: 50,
    separationForce: 1.5,
    alignmentForce: 1.0,
    cohesionForce: 0.5,
    maxSpeed: 3,
    maxForce: 0.1,
  };

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initBoids(150); // More boids for better effect
  }

  private initBoids(count: number): void {
    for (let i = 0; i < count; i++) {
      this.boids.push({
        x: randomRange(0, this.context.width),
        y: randomRange(0, this.context.height),
        vx: randomRange(-2, 2),
        vy: randomRange(-2, 2),
        hue: randomRange(180, 240), // Blue-ish
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn boids on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.boids.length < 500) {
        const count = Math.floor(audio.rms * 20) + 5;
        for (let i = 0; i < count; i++) {
          this.boids.push({
            x: click.x + randomRange(-20, 20),
            y: click.y + randomRange(-20, 20),
            vx: randomRange(-2, 2),
            vy: randomRange(-2, 2),
            hue: audio.centroid * 360,
          });
        }
      }
    });

    // Update boids
    this.boids.forEach((boid) => {
      const [sx, sy] = this.separation(boid);
      const [ax, ay] = this.alignment(boid);
      const [cx, cy] = this.cohesion(boid);

      // Apply forces with audio modulation
      const audioMod = 1 + audio.bass;
      boid.vx += sx * this.params.separationForce * audioMod;
      boid.vy += sy * this.params.separationForce * audioMod;
      boid.vx += ax * this.params.alignmentForce;
      boid.vy += ay * this.params.alignmentForce;
      boid.vx += cx * this.params.cohesionForce;
      boid.vy += cy * this.params.cohesionForce;

      // Limit speed
      const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
      const maxSpeed = this.params.maxSpeed * (1 + audio.mid);
      if (speed > maxSpeed) {
        boid.vx = (boid.vx / speed) * maxSpeed;
        boid.vy = (boid.vy / speed) * maxSpeed;
      }

      // Update position
      boid.x += boid.vx;
      boid.y += boid.vy;

      // Wrap around screen
      if (boid.x < 0) boid.x = this.context.width;
      if (boid.x > this.context.width) boid.x = 0;
      if (boid.y < 0) boid.y = this.context.height;
      if (boid.y > this.context.height) boid.y = 0;
    });

    this.draw(audio);
  }

  private separation(boid: Boid): [number, number] {
    let steerX = 0;
    let steerY = 0;
    let count = 0;

    this.boids.forEach((other) => {
      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < this.params.separationDist) {
        steerX += dx / dist;
        steerY += dy / dist;
        count++;
      }
    });

    if (count > 0) {
      steerX /= count;
      steerY /= count;
    }

    return [steerX, steerY];
  }

  private alignment(boid: Boid): [number, number] {
    let avgVx = 0;
    let avgVy = 0;
    let count = 0;

    this.boids.forEach((other) => {
      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < this.params.alignmentDist) {
        avgVx += other.vx;
        avgVy += other.vy;
        count++;
      }
    });

    if (count > 0) {
      avgVx /= count;
      avgVy /= count;
      return [avgVx - boid.vx, avgVy - boid.vy];
    }

    return [0, 0];
  }

  private cohesion(boid: Boid): [number, number] {
    let centerX = 0;
    let centerY = 0;
    let count = 0;

    this.boids.forEach((other) => {
      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < this.params.cohesionDist) {
        centerX += other.x;
        centerY += other.y;
        count++;
      }
    });

    if (count > 0) {
      centerX /= count;
      centerY /= count;
      return [(centerX - boid.x) * 0.01, (centerY - boid.y) * 0.01];
    }

    return [0, 0];
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    this.graphics.clear();

    this.boids.forEach((boid) => {
      const angle = Math.atan2(boid.vy, boid.vx);
      const size = 6 + audio.treble * 4;
      const alpha = 0.7 + audio.rms * 0.3;

      // Draw triangle pointing in direction of movement
      const x1 = boid.x + Math.cos(angle) * size;
      const y1 = boid.y + Math.sin(angle) * size;
      const x2 = boid.x + Math.cos(angle + 2.5) * size * 0.5;
      const y2 = boid.y + Math.sin(angle + 2.5) * size * 0.5;
      const x3 = boid.x + Math.cos(angle - 2.5) * size * 0.5;
      const y3 = boid.y + Math.sin(angle - 2.5) * size * 0.5;

      this.graphics.beginFill(this.hslToHex(boid.hue, 70, 60), alpha);
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      this.graphics.lineTo(x3, y3);
      this.graphics.lineTo(x1, y1);
      this.graphics.endFill();
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
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

