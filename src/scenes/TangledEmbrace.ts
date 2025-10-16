import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface ParticlePair {
  // Particle A
  ax: number;
  ay: number;
  avx: number;
  avy: number;
  // Particle B
  bx: number;
  by: number;
  bvx: number;
  bvy: number;
  // Shared properties
  hue: number;
  lifetime: number;
  maxLifetime: number;
  coilPhase: number;
  fusionStrength: number;
}

export class TangledEmbrace implements Pattern {
  public name = 'Tangled Embrace';
  public container: Container;
  private graphics: Graphics;
  private pairs: ParticlePair[] = [];
  private time: number = 0;

  constructor(private context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  private spawnPair(x: number, y: number, hue: number, energy: number): void {
    const angle = Math.random() * Math.PI * 2;
    const separation = 20 + energy * 30;
    
    this.pairs.push({
      ax: x + Math.cos(angle) * separation,
      ay: y + Math.sin(angle) * separation,
      avx: randomRange(-100, 100),
      avy: randomRange(-100, 100),
      bx: x - Math.cos(angle) * separation,
      by: y - Math.sin(angle) * separation,
      bvx: randomRange(-100, 100),
      bvy: randomRange(-100, 100),
      hue,
      lifetime: 0,
      maxLifetime: 3 + energy * 4,
      coilPhase: Math.random() * Math.PI * 2,
      fusionStrength: 0,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Click spawns writhing, fusing pairs
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.spawnPair(
          click.x,
          click.y,
          (audio.centroid * 360) % 360,
          0.8 + audio.bass * 0.2
        );
      }
    });

    // Autonomous spawning on beat
    if (audio.beat) {
      this.spawnPair(
        randomRange(this.context.width * 0.2, this.context.width * 0.8),
        randomRange(this.context.height * 0.2, this.context.height * 0.8),
        (this.time * 60 + audio.rms * 180) % 360,
        0.5 + audio.treble * 0.5
      );
    }

    // Treble energy accelerates frenzied dance
    const danceSpeed = 1 + audio.treble * 3;

    // Update pairs
    this.pairs.forEach((pair) => {
      pair.lifetime += dt;
      pair.coilPhase += dt * 5 * danceSpeed;

      // Distance between particles
      const dx = pair.bx - pair.ax;
      const dy = pair.by - pair.ay;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Coiling attraction force (intertwining)
      const targetDist = 30 + Math.sin(pair.coilPhase) * 20;
      const coilForce = (targetDist - dist) * 5;
      const coilAngle = Math.atan2(dy, dx) + Math.sin(pair.coilPhase * 2) * 0.5;

      // Apply coiling forces
      pair.avx += Math.cos(coilAngle) * coilForce * dt;
      pair.avy += Math.sin(coilAngle) * coilForce * dt;
      pair.bvx -= Math.cos(coilAngle) * coilForce * dt;
      pair.bvy -= Math.sin(coilAngle) * coilForce * dt;

      // Orbital motion (writhing dance)
      const orbitSpeed = danceSpeed * 2;
      const centerX = (pair.ax + pair.bx) / 2;
      const centerY = (pair.ay + pair.by) / 2;

      const angleA = Math.atan2(pair.ay - centerY, pair.ax - centerX);
      const angleB = Math.atan2(pair.by - centerY, pair.bx - centerX);

      pair.avx += Math.cos(angleA + Math.PI / 2) * orbitSpeed;
      pair.avy += Math.sin(angleA + Math.PI / 2) * orbitSpeed;
      pair.bvx += Math.cos(angleB - Math.PI / 2) * orbitSpeed;
      pair.bvy += Math.sin(angleB - Math.PI / 2) * orbitSpeed;

      // Update positions
      pair.ax += pair.avx * dt;
      pair.ay += pair.avy * dt;
      pair.bx += pair.bvx * dt;
      pair.by += pair.bvy * dt;

      // Damping
      pair.avx *= 0.98;
      pair.avy *= 0.98;
      pair.bvx *= 0.98;
      pair.bvy *= 0.98;

      // Fusion strength increases as particles get closer
      if (dist < 40) {
        pair.fusionStrength = Math.min(1, pair.fusionStrength + dt * 2);
      } else {
        pair.fusionStrength = Math.max(0, pair.fusionStrength - dt);
      }

      // Hue shift
      pair.hue = (pair.hue + dt * 20 + audio.centroid * 15) % 360;

      // Boundaries (wrap around)
      if (pair.ax < 0) pair.ax = this.context.width;
      if (pair.ax > this.context.width) pair.ax = 0;
      if (pair.ay < 0) pair.ay = this.context.height;
      if (pair.ay > this.context.height) pair.ay = 0;
      if (pair.bx < 0) pair.bx = this.context.width;
      if (pair.bx > this.context.width) pair.bx = 0;
      if (pair.by < 0) pair.by = this.context.height;
      if (pair.by > this.context.height) pair.by = 0;
    });

    // Remove dead pairs
    this.pairs = this.pairs.filter((p) => p.lifetime < p.maxLifetime);

    // Limit count
    if (this.pairs.length > 50) {
      this.pairs.shift();
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    this.pairs.forEach((pair) => {
      const alpha = 1 - pair.lifetime / pair.maxLifetime;
      const color = hslToHex(pair.hue, 80, 50);
      const glowColor = hslToHex(pair.hue, 100, 70);

      // Draw coiling trajectory (intertwining path)
      const segments = 20;
      this.graphics.lineStyle(2 + audio.rms * 3, glowColor, alpha * 0.5);
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const x = pair.ax * (1 - t) + pair.bx * t + Math.sin(t * Math.PI * 4 + pair.coilPhase) * 15;
        const y = pair.ay * (1 - t) + pair.by * t + Math.cos(t * Math.PI * 4 + pair.coilPhase) * 15;
        
        if (i === 0) {
          this.graphics.moveTo(x, y);
        } else {
          this.graphics.lineTo(x, y);
        }
      }

      // Fusion glow between particles
      if (pair.fusionStrength > 0) {
        const fusionAlpha = pair.fusionStrength * alpha * 0.8;
        this.graphics.lineStyle(10 + audio.bass * 10, 0xffffff, fusionAlpha * 0.3);
        this.graphics.moveTo(pair.ax, pair.ay);
        this.graphics.lineTo(pair.bx, pair.by);
        
        // Pulsing fusion core
        const midX = (pair.ax + pair.bx) / 2;
        const midY = (pair.ay + pair.by) / 2;
        const pulse = 1 + Math.sin(this.time * 10) * 0.5;
        this.graphics.beginFill(0xffffff, fusionAlpha);
        this.graphics.drawCircle(midX, midY, 5 * pair.fusionStrength * pulse);
        this.graphics.endFill();
      }

      // Draw particle A
      const sizeA = 6 + audio.treble * 4 + Math.sin(pair.coilPhase) * 2;
      this.graphics.beginFill(glowColor, alpha * 0.5);
      this.graphics.drawCircle(pair.ax, pair.ay, sizeA * 1.5);
      this.graphics.endFill();
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(pair.ax, pair.ay, sizeA);
      this.graphics.endFill();

      // Draw particle B
      const sizeB = 6 + audio.treble * 4 + Math.cos(pair.coilPhase) * 2;
      this.graphics.beginFill(glowColor, alpha * 0.5);
      this.graphics.drawCircle(pair.bx, pair.by, sizeB * 1.5);
      this.graphics.endFill();
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(pair.bx, pair.by, sizeB);
      this.graphics.endFill();
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

