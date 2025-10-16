import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';

interface GridLight {
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  intensity: number;
  targetIntensity: number;
  hue: number;
  phase: number;
  pulseSpeed: number;
}

export class RadiantGrid implements Pattern {
  public name = 'Radiant Grid';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private lights: GridLight[] = [];
  private time: number = 0;
  private gridCols: number = 16;
  private gridRows: number = 12;
  private cellWidth: number;
  private cellHeight: number;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.cellWidth = this.context.width / this.gridCols;
    this.cellHeight = this.context.height / this.gridRows;

    this.initializeLights();
  }

  private initializeLights(): void {
    for (let i = 0; i < this.gridCols; i++) {
      for (let j = 0; j < this.gridRows; j++) {
        this.lights.push({
          gridX: i,
          gridY: j,
          x: i * this.cellWidth + this.cellWidth / 2,
          y: j * this.cellHeight + this.cellHeight / 2,
          intensity: Math.random() * 0.3,
          targetIntensity: 0.5,
          hue: (i * 30 + j * 20) % 360,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 2 + Math.random() * 3,
        });
      }
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update each light based on audio and position
    this.lights.forEach((light) => {
      // Noise-based movement
      const noiseX = noise2D(light.gridX * 0.3, this.time * 0.5);
      const noiseY = noise2D(light.gridY * 0.3, this.time * 0.5 + 100);
      
      light.x = light.gridX * this.cellWidth + this.cellWidth / 2 + noiseX * 15;
      light.y = light.gridY * this.cellHeight + this.cellHeight / 2 + noiseY * 15;

      // Map audio spectrum to grid position
      const spectrumIndex = Math.floor((light.gridX / this.gridCols) * audio.spectrum.length);
      const spectrumValue = audio.spectrum[spectrumIndex] || 0;

      // Pulse speed based on audio
      light.pulseSpeed = 2 + audio.rms * 5;

      // Intensity based on spectrum + position + beat
      const distFromCenter = Math.hypot(
        light.gridX - this.gridCols / 2,
        light.gridY - this.gridRows / 2
      );
      const maxDist = Math.hypot(this.gridCols / 2, this.gridRows / 2);
      const centerFactor = 1 - (distFromCenter / maxDist);

      light.targetIntensity = 
        spectrumValue * 0.7 +
        audio.rms * 0.3 +
        centerFactor * 0.2 +
        (audio.beat ? 0.5 : 0);

      // Smooth intensity transition
      light.intensity += (light.targetIntensity - light.intensity) * 5 * dt;

      // Pulsing
      const pulse = Math.sin(this.time * light.pulseSpeed + light.phase) * 0.5 + 0.5;
      light.intensity = Math.max(0, Math.min(1, light.intensity * (0.5 + pulse * 0.5)));

      // Hue rotation based on audio
      light.hue = ((light.gridX * 30 + light.gridY * 20) + this.time * 30 + audio.centroid * 180) % 360;

      // Beat response - all lights flash
      if (audio.beat) {
        light.intensity = Math.min(1, light.intensity + 0.4);
      }
    });

    // Mouse interaction - brighten nearby lights
    if (input.isDown || input.isDragging) {
      this.lights.forEach((light) => {
        const dx = light.x - input.x;
        const dy = light.y - input.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 150) {
          light.intensity = Math.min(1, light.intensity + (1 - dist / 150) * 0.5);
        }
      });
    }

    // Click creates ripple effect
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.5) {
        const rippleRadius = age * 600;
        
        this.lights.forEach((light) => {
          const dx = light.x - click.x;
          const dy = light.y - click.y;
          const dist = Math.hypot(dx, dy);
          
          // Ripple wave
          if (Math.abs(dist - rippleRadius) < 50) {
            light.intensity = 1;
            light.hue = (this.time * 100) % 360;
          }
        });
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw connecting lines (grid structure)
    this.graphics.lineStyle(1, 0x444444, 0.1 + audio.rms * 0.2);
    
    this.lights.forEach((light) => {
      // Connect to right neighbor
      const rightNeighbor = this.lights.find(
        l => l.gridX === light.gridX + 1 && l.gridY === light.gridY
      );
      if (rightNeighbor) {
        const avgIntensity = (light.intensity + rightNeighbor.intensity) / 2;
        this.graphics.lineStyle(
          1 + avgIntensity * 2,
          this.hslToHex((light.hue + rightNeighbor.hue) / 2, 70, 50),
          0.2 + avgIntensity * 0.5
        );
        this.graphics.moveTo(light.x, light.y);
        this.graphics.lineTo(rightNeighbor.x, rightNeighbor.y);
      }

      // Connect to bottom neighbor
      const bottomNeighbor = this.lights.find(
        l => l.gridX === light.gridX && l.gridY === light.gridY + 1
      );
      if (bottomNeighbor) {
        const avgIntensity = (light.intensity + bottomNeighbor.intensity) / 2;
        this.graphics.lineStyle(
          1 + avgIntensity * 2,
          this.hslToHex((light.hue + bottomNeighbor.hue) / 2, 70, 50),
          0.2 + avgIntensity * 0.5
        );
        this.graphics.moveTo(light.x, light.y);
        this.graphics.lineTo(bottomNeighbor.x, bottomNeighbor.y);
      }
    });

    // Draw lights
    this.lights.forEach((light) => {
      if (light.intensity < 0.1) return;

      const size = 5 + light.intensity * 20 + (audio.beat ? 5 : 0);
      const color = this.hslToHex(light.hue, 80, 50 + light.intensity * 30);

      // Outer glow
      this.graphics.beginFill(color, light.intensity * 0.2);
      this.graphics.drawCircle(light.x, light.y, size * 2.5);
      this.graphics.endFill();

      // Middle glow
      this.graphics.beginFill(color, light.intensity * 0.5);
      this.graphics.drawCircle(light.x, light.y, size * 1.5);
      this.graphics.endFill();

      // Core
      this.graphics.beginFill(0xffffff, light.intensity * 0.9);
      this.graphics.drawCircle(light.x, light.y, size * 0.6);
      this.graphics.endFill();

      // Ray bursts for high intensity lights
      if (light.intensity > 0.7) {
        const rayCount = 8;
        const rayLength = size * 3;
        
        this.graphics.lineStyle(2, color, light.intensity * 0.4);
        
        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2 + this.time * 2;
          this.graphics.moveTo(light.x, light.y);
          this.graphics.lineTo(
            light.x + Math.cos(angle) * rayLength,
            light.y + Math.sin(angle) * rayLength
          );
        }
      }
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
    // Clamp inputs to valid ranges
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
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

    const red = Math.max(0, Math.min(255, Math.round((r + m) * 255)));
    const green = Math.max(0, Math.min(255, Math.round((g + m) * 255)));
    const blue = Math.max(0, Math.min(255, Math.round((b + m) * 255)));

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

