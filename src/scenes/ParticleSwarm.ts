import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { curlNoise2D } from '../utils/noise';
import { clamp, lerp } from '../utils/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number; // Previous position for verlet
  py: number;
  life: number;
  maxLife: number;
  hue: number;
}

export class ParticleSwarm implements Pattern {
  public name = 'Particle Swarm';
  public container: Container;
  private graphics: Graphics;
  private particles: Particle[] = [];
  private context: RendererContext;

  private params = {
    count: 2000,
    maxSpeed: 3,
    attractionStrength: 0.5,
    noiseScale: 0.003,
    noiseStrength: 0.2,
    damping: 0.98,
    spawnRadius: 200,
    particleSize: 2,
    colorSpeed: 0.1,
  };

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initParticles();
  }

  private initParticles(): void {
    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;

    for (let i = 0; i < this.params.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.params.spawnRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      this.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        px: x,
        py: y,
        life: 1,
        maxLife: 1,
        hue: Math.random() * 360,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    const time = performance.now() / 1000;

    this.particles.forEach((p) => {
      // Store previous position (Verlet integration)
      const oldX = p.x;
      const oldY = p.y;

      // Calculate velocity from position difference
      p.vx = p.x - p.px;
      p.vy = p.y - p.py;

      // Apply curl noise for flow field
      const [noiseX, noiseY] = curlNoise2D(
        p.x * this.params.noiseScale,
        p.y * this.params.noiseScale + time * 0.1
      );
      p.vx += noiseX * this.params.noiseStrength * audio.mid * 2;
      p.vy += noiseY * this.params.noiseStrength * audio.mid * 2;

      // Attraction/repulsion to cursor
      const dx = input.x - p.x;
      const dy = input.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        const force = input.isDown ? -1 : 1; // Repel when clicked
        const strength = this.params.attractionStrength * (1 + audio.bass);
        p.vx += (dx / dist) * strength * force;
        p.vy += (dy / dist) * strength * force;
      }

      // Limit speed
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = this.params.maxSpeed * (1 + audio.rms);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      // Apply damping
      p.vx *= this.params.damping;
      p.vy *= this.params.damping;

      // Update position
      p.px = oldX;
      p.py = oldY;
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around screen
      if (p.x < 0) p.x = this.context.width;
      if (p.x > this.context.width) p.x = 0;
      if (p.y < 0) p.y = this.context.height;
      if (p.y > this.context.height) p.y = 0;

      // Update color based on audio
      p.hue += this.params.colorSpeed * audio.centroid * 100;
      p.hue %= 360;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    // this.graphics.clear();

    this.particles.forEach((p) => {
      const brightness = lerp(0.3, 1, audio.rms);
      const saturation = lerp(50, 100, audio.mid);
      const alpha = 0.6 + audio.treble * 0.4;
      
      // Beat pulse
      const size = audio.beat 
        ? this.params.particleSize * 1.5 
        : this.params.particleSize;

      this.graphics.beginFill(this.hslToHex(p.hue, saturation, brightness * 50), alpha);
      this.graphics.drawCircle(p.x, p.y, size);
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

