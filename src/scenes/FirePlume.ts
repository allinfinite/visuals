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
    
    // Initialize with some fire particles for immediate visibility
    for (let i = 0; i < 50; i++) {
      const source = this.sources[0];
      this.particles.push({
        x: source.x + randomRange(-20, 20),
        y: source.y - randomRange(0, 200),
        vx: randomRange(-15, 15),
        vy: randomRange(-150, -50),
        life: Math.random(),
        maxLife: randomRange(0.8, 2),
        size: randomRange(10, 30),
        heat: randomRange(0.3, 1),
      });
    }
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

    // Spawn fire particles from sources (higher base rate for visibility)
    const baseSpawnRate = 60; // Increased from 30
    const spawnRate = baseSpawnRate + audio.rms * 80; // More audio reactive
    const flameHeight = 150 + audio.rms * 200; // Taller flames (was 100+150)

    this.sources.forEach((source) => {
      const spawnCount = Math.floor(spawnRate * dt);
      for (let i = 0; i < spawnCount; i++) {
        this.particles.push({
          x: source.x + randomRange(-30, 30), // Wider base
          y: source.y + randomRange(-10, 10),
          vx: randomRange(-20, 20), // More horizontal variation
          vy: randomRange(-flameHeight, -flameHeight * 0.5),
          life: 1,
          maxLife: randomRange(0.8, 2.5), // Longer lifetime
          size: randomRange(12, 35), // Larger particles (was 8-25)
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
    this.graphics.clear();

    this.particles.forEach((p) => {
      // Color gradient: white -> yellow -> orange -> red -> dark red
      let color: number;
      let alpha = Math.min(1, p.life * 0.8); // Increased from 0.6 to 0.8

      if (p.heat > 0.8) {
        // White hot
        color = 0xffffff;
        alpha *= 1.0;
      } else if (p.heat > 0.6) {
        // Yellow
        color = 0xffff00;
        alpha *= 0.95;
      } else if (p.heat > 0.4) {
        // Orange
        color = 0xff8800;
        alpha *= 0.9;
      } else if (p.heat > 0.2) {
        // Red
        color = 0xff3300;
        alpha *= 0.8;
      } else {
        // Dark red/smoke
        color = 0x660000;
        alpha *= 0.4;
      }

      const size = p.size * p.life * (0.9 + (audio.beat ? 0.3 : 0));

      // Outer glow (larger, more visible)
      this.graphics.beginFill(color, alpha * 0.2);
      this.graphics.drawCircle(p.x, p.y, size * 2.5);
      this.graphics.endFill();

      // Middle glow
      this.graphics.beginFill(color, alpha * 0.5);
      this.graphics.drawCircle(p.x, p.y, size * 1.5);
      this.graphics.endFill();

      // Core
      this.graphics.beginFill(color, alpha * 0.9);
      this.graphics.drawCircle(p.x, p.y, size);
      this.graphics.endFill();
    });
    
    // Draw fire source indicators (glowing bases)
    this.sources.forEach((source) => {
      const pulseSize = 15 + Math.sin(this.time * 5) * 5;
      const pulseAlpha = 0.3 + Math.sin(this.time * 5) * 0.2;
      
      this.graphics.beginFill(0xff6600, pulseAlpha);
      this.graphics.drawCircle(source.x, source.y, pulseSize);
      this.graphics.endFill();
      
      this.graphics.beginFill(0xffaa00, pulseAlpha * 1.5);
      this.graphics.drawCircle(source.x, source.y, pulseSize * 0.6);
      this.graphics.endFill();
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

