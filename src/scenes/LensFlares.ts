import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Flare {
  x: number;
  y: number;
  intensity: number;
  hue: number;
  size: number;
  rayCount: number;
  rotation: number;
  rotationSpeed: number;
  pulse: number;
}

export class LensFlares implements Pattern {
  public name = 'Lens Flares';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private flares: Flare[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize a few flares
    for (let i = 0; i < 5; i++) {
      this.spawnFlare(
        randomRange(context.width * 0.2, context.width * 0.8),
        randomRange(context.height * 0.2, context.height * 0.8)
      );
    }
  }

  private spawnFlare(x: number, y: number): void {
    this.flares.push({
      x,
      y,
      intensity: randomRange(0.6, 1),
      hue: randomRange(0, 360),
      size: randomRange(40, 100),
      rayCount: Math.floor(randomRange(6, 16)),
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-0.5, 0.5),
      pulse: randomRange(0, Math.PI * 2),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update existing flares
    this.flares.forEach((flare, idx) => {
      // Rotate
      flare.rotation += flare.rotationSpeed * dt;

      // Pulse with audio
      flare.pulse += (2 + audio.rms * 5) * dt;
      const pulseValue = Math.sin(flare.pulse) * 0.5 + 0.5;
      flare.intensity = 0.6 + pulseValue * 0.4 + audio.bass * 0.3;

      // Size pulsates
      const baseSize = 40 + audio.rms * 60;
      flare.size = baseSize + Math.sin(flare.pulse * 2) * 20;

      // Hue shift
      flare.hue = (flare.hue + dt * 20 + audio.centroid * 50) % 360;

      // Beat boost
      if (audio.beat) {
        flare.intensity = Math.min(1.5, flare.intensity + 0.5);
        flare.size *= 1.3;
      }

      // Move slightly with noise
      const driftX = Math.sin(this.time * 0.3 + idx) * 50 * dt;
      const driftY = Math.cos(this.time * 0.4 + idx) * 50 * dt;
      flare.x += driftX;
      flare.y += driftY;

      // Keep in bounds
      flare.x = Math.max(50, Math.min(this.context.width - 50, flare.x));
      flare.y = Math.max(50, Math.min(this.context.height - 50, flare.y));
    });

    // Spawn new flare on beat if not too many
    if (audio.beat && this.flares.length < 12 && Math.random() < 0.5) {
      this.spawnFlare(
        randomRange(this.context.width * 0.2, this.context.width * 0.8),
        randomRange(this.context.height * 0.2, this.context.height * 0.8)
      );
    }

    // Click spawns flare
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.spawnFlare(click.x, click.y);
      }
    });

    // Drag spawns trail of flares
    if (input.isDragging && Math.random() < 0.1) {
      this.spawnFlare(input.x, input.y);
    }

    // Remove excess flares (keep strongest)
    if (this.flares.length > 15) {
      this.flares.sort((a, b) => b.intensity - a.intensity);
      this.flares = this.flares.slice(0, 12);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    this.flares.forEach((flare) => {
      const color = this.hslToHex(flare.hue, 100, 60);
      const glowRadius = flare.size * flare.intensity;

      // Multiple bloom rings (largest to smallest)
      const ringCount = 5;
      for (let i = ringCount; i >= 0; i--) {
        const ringSize = glowRadius * (1 + i * 0.4);
        const ringAlpha = (flare.intensity * 0.15) / (i + 1);
        
        this.graphics.beginFill(color, ringAlpha);
        this.graphics.drawCircle(flare.x, flare.y, ringSize);
        this.graphics.endFill();
      }

      // Central bright core
      this.graphics.beginFill(0xffffff, flare.intensity * 0.9);
      this.graphics.drawCircle(flare.x, flare.y, flare.size * 0.3);
      this.graphics.endFill();

      // Colored core
      this.graphics.beginFill(color, flare.intensity * 0.8);
      this.graphics.drawCircle(flare.x, flare.y, flare.size * 0.5);
      this.graphics.endFill();

      // Ray bursts
      const rayLength = glowRadius * (1.5 + audio.treble * 0.5);
      const rayThickness = 2 + flare.intensity * 3;
      
      for (let i = 0; i < flare.rayCount; i++) {
        const angle = (i / flare.rayCount) * Math.PI * 2 + flare.rotation;
        const rayAlpha = flare.intensity * 0.6;

        // Main ray
        this.graphics.lineStyle(rayThickness, color, rayAlpha);
        this.graphics.moveTo(flare.x, flare.y);
        this.graphics.lineTo(
          flare.x + Math.cos(angle) * rayLength,
          flare.y + Math.sin(angle) * rayLength
        );

        // Bright core of ray
        this.graphics.lineStyle(rayThickness * 0.4, 0xffffff, rayAlpha * 1.2);
        this.graphics.moveTo(flare.x, flare.y);
        this.graphics.lineTo(
          flare.x + Math.cos(angle) * rayLength * 0.7,
          flare.y + Math.sin(angle) * rayLength * 0.7
        );

        // Alternate rays (thinner, between main rays)
        if (i % 2 === 0) {
          const altAngle = angle + (Math.PI / flare.rayCount);
          const altLength = rayLength * 0.6;
          
          this.graphics.lineStyle(rayThickness * 0.5, color, rayAlpha * 0.5);
          this.graphics.moveTo(flare.x, flare.y);
          this.graphics.lineTo(
            flare.x + Math.cos(altAngle) * altLength,
            flare.y + Math.sin(altAngle) * altLength
          );
        }
      }

      // Hexagonal aperture shape (lens effect)
      if (flare.intensity > 0.7) {
        const hexSize = flare.size * 0.8;
        const hexAlpha = (flare.intensity - 0.7) * 0.3;
        
        this.graphics.lineStyle(2, color, hexAlpha);
        this.graphics.beginFill(color, hexAlpha * 0.2);
        
        for (let i = 0; i <= 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + flare.rotation * 0.5;
          const x = flare.x + Math.cos(angle) * hexSize;
          const y = flare.y + Math.sin(angle) * hexSize;
          
          if (i === 0) {
            this.graphics.moveTo(x, y);
          } else {
            this.graphics.lineTo(x, y);
          }
        }
        this.graphics.endFill();
      }

      // Chromatic aberration rings (RGB offset)
      if (audio.rms > 0.5) {
        const offset = audio.rms * 5;
        const ringSize = flare.size * 1.2;
        
        this.graphics.lineStyle(2, 0xff0000, 0.3);
        this.graphics.drawCircle(flare.x - offset, flare.y, ringSize);
        
        this.graphics.lineStyle(2, 0x00ff00, 0.3);
        this.graphics.drawCircle(flare.x, flare.y, ringSize);
        
        this.graphics.lineStyle(2, 0x0000ff, 0.3);
        this.graphics.drawCircle(flare.x + offset, flare.y, ringSize);
      }
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

