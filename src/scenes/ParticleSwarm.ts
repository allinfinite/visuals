import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { curlNoise2D } from '../utils/noise';
import { lerp } from '../utils/math';

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
  private time: number = 0;
  private expansionPhase: number = 0; // 0 = contract, 1 = expand

  private params = {
    count: 800, // Reduced from 2000 for performance
    maxSpeed: 3,
    attractionStrength: 0.5,
    noiseScale: 0.003,
    noiseStrength: 0.2,
    damping: 0.98,
    spawnRadius: 200,
    particleSize: 2,
    colorSpeed: 0.1,
    separationRadius: 15, // Min distance between particles
    separationStrength: 0.3,
    expansionCycleTime: 6, // Seconds per expand/contract cycle
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
    this.time += dt;
    const time = performance.now() / 1000;

    // Update expansion phase (breathing cycle)
    const cycleProgress = (this.time % this.params.expansionCycleTime) / this.params.expansionCycleTime;
    this.expansionPhase = Math.sin(cycleProgress * Math.PI * 2) * 0.5 + 0.5; // 0 to 1 and back

    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;

    this.particles.forEach((p, idx) => {
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

      // Expansion/contraction from center (breathing effect)
      const toCenterX = centerX - p.x;
      const toCenterY = centerY - p.y;
      const centerDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
      
      if (centerDist > 1) {
        // expansionPhase: 0 = contract, 1 = expand
        const expansionForce = (this.expansionPhase - 0.5) * 2; // -1 to 1
        const expansionStrength = 0.4 * (1 + audio.rms * 0.5);
        p.vx -= (toCenterX / centerDist) * expansionStrength * expansionForce;
        p.vy -= (toCenterY / centerDist) * expansionStrength * expansionForce;
      }

      // Separation force (prevent particles from getting too close)
      let separationX = 0;
      let separationY = 0;
      let separationCount = 0;

      // Only check nearby particles (optimization: check every 10th particle)
      for (let i = idx - 50; i < idx + 50; i++) {
        if (i === idx || i < 0 || i >= this.particles.length) continue;
        
        const other = this.particles[i];
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < this.params.separationRadius) {
          separationX += dx / dist;
          separationY += dy / dist;
          separationCount++;
        }
      }

      if (separationCount > 0) {
        p.vx += (separationX / separationCount) * this.params.separationStrength;
        p.vy += (separationY / separationCount) * this.params.separationStrength;
      }

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

      // Update color based on audio and expansion phase
      p.hue += this.params.colorSpeed * audio.centroid * 100;
      p.hue %= 360;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    this.particles.forEach((p) => {
      const brightness = lerp(0.3, 1, audio.rms);
      const saturation = lerp(50, 100, audio.mid);
      const alpha = 0.6 + audio.treble * 0.4;
      
      // Beat pulse + expansion phase size variation
      const expansionSize = 1 + this.expansionPhase * 0.3; // 1.0 to 1.3x size during expansion
      const beatSize = audio.beat ? 1.5 : 1;
      const size = this.params.particleSize * expansionSize * beatSize;

      // Add slight glow during expansion phase
      if (this.expansionPhase > 0.7) {
        this.graphics.beginFill(
          this.hslToHex(p.hue, saturation, brightness * 50), 
          alpha * 0.3
        );
        this.graphics.drawCircle(p.x, p.y, size * 1.5);
        this.graphics.endFill();
      }

      this.graphics.beginFill(this.hslToHex(p.hue, saturation, brightness * 50), alpha);
      this.graphics.drawCircle(p.x, p.y, size);
      this.graphics.endFill();
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

