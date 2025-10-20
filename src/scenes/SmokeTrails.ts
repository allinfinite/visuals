import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';
import { randomRange } from '../utils/math';

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

export class SmokeTrails implements Pattern {
  public name = 'Smoke Trails';
  public container: Container;
  private graphics: Graphics;
  private particles: SmokeParticle[] = [];
  private context: RendererContext;
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn particles from cursor when dragging OR autonomously from audio
    let spawnCount = input.isDragging ? Math.floor(5 * (1 + audio.rms * 3)) : 0;
    
    // Autonomous spawning based on audio
    if (!input.isDragging && Math.random() < audio.rms * 0.3) {
      spawnCount = Math.floor(2 + audio.bass * 3);
      const centerX = this.context.width / 2;
      const centerY = this.context.height / 2;
      const radius = 200;
      const angle = this.time * 0.5;
      input = {
        ...input,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    }
    
    for (let i = 0; i < spawnCount; i++) {
      this.particles.push({
        x: input.x + randomRange(-5, 5),
        y: input.y + randomRange(-5, 5),
        vx: randomRange(-1, 1),
        vy: randomRange(-2, 0),
        life: 1,
        maxLife: randomRange(1, 3),
        size: randomRange(10, 30) * (1 + audio.bass),
        alpha: 0.3 + audio.mid * 0.4,
      });
    }

    // Spawn bursts on click (reduced for performance)
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.1 && this.particles.length < 1000) {
        for (let i = 0; i < 10; i++) { // Reduced from 20 to 10
          const angle = (i / 10) * Math.PI * 2;
          const speed = randomRange(50, 150) * audio.rms;
          this.particles.push({
            x: click.x,
            y: click.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: randomRange(2, 4),
            size: randomRange(15, 40),
            alpha: 0.5,
          });
        }
      }
    });

    // Update particles
    this.particles = this.particles.filter((p) => {
      // Apply Perlin noise flow field
      const noiseScale = 0.002;
      const noiseX = noise2D(p.x * noiseScale, p.y * noiseScale + this.time * 0.1);
      const noiseY = noise2D(p.x * noiseScale + 100, p.y * noiseScale + this.time * 0.1);
      
      p.vx += noiseX * 50 * dt * audio.mid;
      p.vy += noiseY * 50 * dt * audio.mid;

      // Apply velocity
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Damping
      p.vx *= 0.95;
      p.vy *= 0.95;

      // Age
      p.life -= dt / p.maxLife;
      p.alpha = p.life * 0.4;

      return p.life > 0;
    });

    this.draw();
  }

  private draw(): void {
    // Don't clear - let trails build up via feedback system
    this.graphics.clear();

    this.particles.forEach((p) => {
      const size = p.size * p.life;
      this.graphics.beginFill(0xdddddd, p.alpha);
      this.graphics.drawCircle(p.x, p.y, size);
      this.graphics.endFill();
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

