import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface GlowSprite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
  pulsePhase: number;
  intensity: number;
}

export class CarnalGlow implements Pattern {
  public name = 'Carnal Glow';
  public container: Container;
  private graphics: Graphics;
  private sprites: GlowSprite[] = [];
  private time: number = 0;

  // Color palette (crimson, violet, amber)
  private colorPalette = [
    { h: 0, s: 80, l: 50 },    // Crimson
    { h: 280, s: 70, l: 55 },  // Violet
    { h: 35, s: 90, l: 55 },   // Amber
  ];

  constructor(private context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize sprites
    for (let i = 0; i < 30; i++) {
      this.spawnSprite(
        randomRange(context.width * 0.2, context.width * 0.8),
        randomRange(context.height * 0.2, context.height * 0.8),
        Math.floor(Math.random() * 3)
      );
    }
  }

  private spawnSprite(x: number, y: number, colorIndex: number): void {
    const palette = this.colorPalette[colorIndex % this.colorPalette.length];
    
    this.sprites.push({
      x,
      y,
      vx: randomRange(-50, 50),
      vy: randomRange(-50, 50),
      size: randomRange(20, 60),
      hue: palette.h,
      alpha: randomRange(0.3, 0.8),
      pulsePhase: Math.random() * Math.PI * 2,
      intensity: randomRange(0.5, 1.0),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Beat syncs feverish pulsing intensity
    const beatBoost = audio.beat ? 0.5 : 0;
    const feverIntensity = 0.5 + audio.rms * 0.5 + beatBoost;

    // Mouse movement shifts sultry gradients
    const mouseInfluence = 100;

    // Update sprites
    this.sprites.forEach((sprite) => {
      // Pulsing phase (feverish throb)
      sprite.pulsePhase += dt * 8 * (1 + audio.rms);
      const pulse = 1 + Math.sin(sprite.pulsePhase) * 0.4 * feverIntensity;

      // Mouse attraction (sultry draw)
      const dx = input.x - sprite.x;
      const dy = input.y - sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < mouseInfluence && dist > 0) {
        const force = (mouseInfluence - dist) / mouseInfluence;
        sprite.vx += (dx / dist) * force * 100 * dt;
        sprite.vy += (dy / dist) * force * 100 * dt;
      }

      // Drift motion (molten flow)
      const driftX = Math.sin(this.time * 0.5 + sprite.y * 0.01) * 30;
      const driftY = Math.cos(this.time * 0.4 + sprite.x * 0.01) * 30;
      sprite.vx += driftX * dt;
      sprite.vy += driftY * dt;

      // Update position
      sprite.x += sprite.vx * dt;
      sprite.y += sprite.vy * dt;

      // Friction
      sprite.vx *= 0.95;
      sprite.vy *= 0.95;

      // Boundaries (wrap)
      if (sprite.x < -50) sprite.x = this.context.width + 50;
      if (sprite.x > this.context.width + 50) sprite.x = -50;
      if (sprite.y < -50) sprite.y = this.context.height + 50;
      if (sprite.y > this.context.height + 50) sprite.y = -50;

      // Size pulsates with audio
      sprite.size = (20 + audio.bass * 40) * pulse;

      // Intensity throbs with beat
      sprite.intensity = 0.5 + audio.rms * 0.5 + beatBoost;

      // Color shifts based on mouse position
      const mouseDist = Math.sqrt(
        Math.pow(input.x - sprite.x, 2) + Math.pow(input.y - sprite.y, 2)
      );
      const colorShift = (mouseDist / this.context.width) * 120;
      sprite.hue = (sprite.hue + colorShift * dt + audio.centroid * 10) % 360;
    });

    // Spawn new sprites on beat
    if (audio.beat && this.sprites.length < 60) {
      this.spawnSprite(
        randomRange(this.context.width * 0.2, this.context.width * 0.8),
        randomRange(this.context.height * 0.2, this.context.height * 0.8),
        Math.floor(Math.random() * 3)
      );
    }

    // Remove excess sprites
    while (this.sprites.length > 60) {
      this.sprites.shift();
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Sort sprites by size (draw largest first for depth)
    const sorted = [...this.sprites].sort((a, b) => b.size - a.size);

    // Draw additive-blended gaussian-blurred sprites
    sorted.forEach((sprite) => {
      const color = hslToHex(sprite.hue, 75 + audio.treble * 25, 50 + audio.rms * 20);
      const glowColor = hslToHex((sprite.hue + 20) % 360, 90, 70);

      // Sweat-drenched sheen effect (multiple blur layers)
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const layerSize = sprite.size * (1 + i * 0.4);
        const layerAlpha = (sprite.alpha * sprite.intensity) / (i + 1) * 0.3;

        this.graphics.beginFill(glowColor, layerAlpha);
        this.graphics.drawCircle(sprite.x, sprite.y, layerSize);
        this.graphics.endFill();
      }

      // Core glow (molten center)
      const coreAlpha = sprite.alpha * sprite.intensity * 0.8;
      this.graphics.beginFill(color, coreAlpha);
      this.graphics.drawCircle(sprite.x, sprite.y, sprite.size * 0.6);
      this.graphics.endFill();

      // Highlight (wet sheen)
      const highlightPulse = 1 + Math.sin(sprite.pulsePhase * 2) * 0.3;
      this.graphics.beginFill(0xffffff, coreAlpha * 0.5 * highlightPulse);
      this.graphics.drawCircle(
        sprite.x - sprite.size * 0.2,
        sprite.y - sprite.size * 0.2,
        sprite.size * 0.3
      );
      this.graphics.endFill();

      // Feverish pulse ring (on beat)
      if (audio.beat) {
        const ringSize = sprite.size * 1.5 * highlightPulse;
        this.graphics.lineStyle(3, 0xffffff, coreAlpha * 0.6);
        this.graphics.drawCircle(sprite.x, sprite.y, ringSize);
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

