import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { noise2D } from '../utils/noise';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  heat: number; // 0-1, determines color
}

export class FirePlume implements Pattern {
  public name = 'Fire Plume';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private particles: FireParticle[] = [];
  private time: number = 0;
  private sources: { x: number; y: number }[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Default fire source at bottom center
    this.sources.push({
      x: this.context.width / 2,
      y: this.context.height - 50,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Add fire source on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.sources.length < 5) {
        this.sources.push({ x: click.x, y: click.y });
      }
    });

    // Spawn fire particles from sources
    const spawnRate = 30 + audio.rms * 50;
    const flamHeight = 100 + audio.rms * 150;

    this.sources.forEach((source) => {
      const spawnCount = Math.floor(spawnRate * dt);
      for (let i = 0; i < spawnCount; i++) {
        this.particles.push({
          x: source.x + randomRange(-20, 20),
          y: source.y + randomRange(-10, 10),
          vx: randomRange(-15, 15),
          vy: randomRange(-flamHeight, -flamHeight * 0.5),
          life: 1,
          maxLife: randomRange(0.5, 1.5),
          size: randomRange(8, 25),
          heat: randomRange(0.7, 1),
        });
      }
    });

    // Update particles
    this.particles = this.particles.filter((p) => {
      // Apply velocity with turbulence
      const noiseVal = noise2D(p.x * 0.01, p.y * 0.01 + this.time * 2);
      p.vx += noiseVal * 50 * dt;
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Damping
      p.vx *= 0.98;
      p.vy *= 0.99;

      // Buoyancy
      p.vy -= 20 * dt;

      // Age and cool
      p.life -= dt / p.maxLife;
      p.heat -= dt * 0.5;

      return p.life > 0 && p.heat > 0;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    // this.graphics.clear();

    this.particles.forEach((p) => {
      // Color gradient: white -> yellow -> orange -> red -> black
      let color: number;
      let alpha = p.life * 0.6;

      if (p.heat > 0.8) {
        // White hot
        color = 0xffffff;
      } else if (p.heat > 0.6) {
        // Yellow
        color = 0xffff00;
      } else if (p.heat > 0.4) {
        // Orange
        color = 0xff8800;
      } else if (p.heat > 0.2) {
        // Red
        color = 0xff3300;
      } else {
        // Dark red
        color = 0x660000;
        alpha *= 0.5;
      }

      const size = p.size * p.life * (0.8 + (audio.beat ? 0.4 : 0));

      // Glow
      this.graphics.beginFill(color, alpha * 0.3);
      this.graphics.drawCircle(p.x, p.y, size * 1.5);
      this.graphics.endFill();

      // Core
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(p.x, p.y, size);
      this.graphics.endFill();
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

