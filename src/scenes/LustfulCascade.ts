import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  density: number;
  pressure: number;
  hue: number;
  size: number;
  viscosity: number;
}

export class LustfulCascade implements Pattern {
  public name = 'Lustful Cascade';
  public container: Container;
  private graphics: Graphics;
  private particles: FluidParticle[] = [];
  private time: number = 0;
  private maxParticles: number = 300;

  // SPH parameters
  private readonly h: number = 30; // smoothing radius
  private readonly restDensity: number = 1000;
  private readonly gasConstant: number = 2000;
  private readonly gravity: number = 500;
  private baseViscosity: number = 0.5;

  constructor(private context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize some particles
    for (let i = 0; i < 50; i++) {
      this.spawnParticle(
        randomRange(context.width * 0.3, context.width * 0.7),
        randomRange(50, 150),
        randomRange(0, 360)
      );
    }
  }

  private spawnParticle(x: number, y: number, hue: number): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    this.particles.push({
      x,
      y,
      vx: randomRange(-50, 50),
      vy: randomRange(-20, 20),
      density: this.restDensity,
      pressure: 0,
      hue,
      size: randomRange(4, 8),
      viscosity: this.baseViscosity,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Audio-reactive viscosity and throbbing
    this.baseViscosity = 0.3 + audio.bass * 0.7;
    const throb = 1 + Math.sin(this.time * 8 + (audio.beat ? Math.PI : 0)) * 0.3;

    // Spawn particles on drag - glistening trails
    if (input.isDragging && this.particles.length < this.maxParticles) {
      for (let i = 0; i < 3; i++) {
        this.spawnParticle(
          input.x + randomRange(-10, 10),
          input.y + randomRange(-10, 10),
          (this.time * 30 + audio.centroid * 180) % 360
        );
      }
    }

    // Autonomous spawning based on bass
    if (Math.random() < audio.bass * 0.1) {
      const x = randomRange(this.context.width * 0.2, this.context.width * 0.8);
      this.spawnParticle(x, 50, (this.time * 50 + audio.rms * 180) % 360);
    }

    // SPH density calculation
    this.particles.forEach((pi) => {
      pi.density = 0;
      this.particles.forEach((pj) => {
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const r2 = dx * dx + dy * dy;
        const h2 = this.h * this.h;

        if (r2 < h2) {
          const q = Math.sqrt(r2) / this.h;
          const kernel = (1 - q) * (1 - q);
          pi.density += kernel;
        }
      });
      pi.density = Math.max(pi.density, 1);
    });

    // Calculate pressure
    this.particles.forEach((p) => {
      p.pressure = this.gasConstant * (p.density - this.restDensity);
    });

    // Apply forces (SPH)
    this.particles.forEach((pi) => {
      let fx = 0;
      let fy = 0;

      this.particles.forEach((pj) => {
        if (pi === pj) return;

        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const r = Math.sqrt(dx * dx + dy * dy);

        if (r < this.h && r > 0.01) {
          // Pressure force
          const pressureForce =
            -(pi.pressure + pj.pressure) / (2 * pj.density) / r;
          fx += pressureForce * dx;
          fy += pressureForce * dy;

          // Viscosity force (slick, dripping effect)
          const viscosity = this.baseViscosity * (1 + audio.rms * 0.5) * throb;
          const vDiff = ((pj.vx - pi.vx) * dx + (pj.vy - pi.vy) * dy) / (r * r);
          fx += viscosity * vDiff * dx;
          fy += viscosity * vDiff * dy;
        }
      });

      // Gravity (dripping)
      fy += this.gravity * (1 + audio.bass * 0.5);

      // Apply forces
      pi.vx += fx * dt;
      pi.vy += fy * dt;

      // Update position
      pi.x += pi.vx * dt;
      pi.y += pi.vy * dt;

      // Damping
      pi.vx *= 0.99;
      pi.vy *= 0.99;

      // Boundary conditions (bounce)
      if (pi.x < 0) {
        pi.x = 0;
        pi.vx *= -0.5;
      }
      if (pi.x > this.context.width) {
        pi.x = this.context.width;
        pi.vx *= -0.5;
      }
      if (pi.y < 0) {
        pi.y = 0;
        pi.vy *= -0.3;
      }
      if (pi.y > this.context.height) {
        pi.y = this.context.height;
        pi.vy *= -0.3;
        pi.vx *= 0.8; // Spread out on bottom
      }

      // Hue shift
      pi.hue = (pi.hue + dt * 20 + audio.centroid * 10) % 360;
      
      // Size pulsates with audio
      pi.size = 4 + audio.rms * 4 + Math.sin(this.time * 5 + pi.x * 0.01) * 2;
    });

    // Remove particles that are stuck at bottom for too long
    this.particles = this.particles.filter(
      (p) => !(p.y >= this.context.height - 5 && Math.abs(p.vy) < 10 && Math.abs(p.vx) < 10)
    );

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw particles with glistening, quivering effect
    this.particles.forEach((p) => {
      const alpha = Math.min(1, p.density / this.restDensity) * 0.8;
      const color = hslToHex(p.hue, 80 + audio.treble * 20, 50 + audio.rms * 20);
      const glowColor = hslToHex(p.hue, 100, 70);

      // Quivering glow
      const quiver = 1 + Math.sin(this.time * 10 + p.x * 0.1) * 0.2;
      this.graphics.beginFill(glowColor, alpha * 0.3 * quiver);
      this.graphics.drawCircle(p.x, p.y, p.size * 1.8);
      this.graphics.endFill();

      // Core (slick surface)
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(p.x, p.y, p.size);
      this.graphics.endFill();

      // Highlight (wet sheen)
      this.graphics.beginFill(0xffffff, alpha * 0.4);
      this.graphics.drawCircle(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.4);
      this.graphics.endFill();

      // Draw trails for dripping effect
      if (p.vy > 50) {
        this.graphics.lineStyle(2, color, alpha * 0.5);
        this.graphics.moveTo(p.x, p.y);
        this.graphics.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

