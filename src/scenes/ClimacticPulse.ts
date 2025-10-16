import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface Pulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  intensity: number;
  lifetime: number;
  maxLifetime: number;
  hue: number;
  contracting: boolean;
  contractionPhase: number;
}

export class ClimacticPulse implements Pattern {
  public name = 'Climactic Pulse';
  public container: Container;
  private graphics: Graphics;
  private pulses: Pulse[] = [];
  private time: number = 0;
  private lastBeat: number = 0;

  constructor(private context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  private spawnPulse(x: number, y: number, intensity: number, hue: number): void {
    this.pulses.push({
      x,
      y,
      radius: 0,
      maxRadius: 100 + intensity * 200,
      intensity,
      lifetime: 0,
      maxLifetime: 2 + intensity * 3,
      hue,
      contracting: false,
      contractionPhase: 0,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Beat detection drives convulsive waves
    if (audio.beat && this.time - this.lastBeat > 0.2) {
      this.lastBeat = this.time;
      const centerX = this.context.width / 2;
      const centerY = this.context.height / 2;
      
      // Explosive epicenter at center
      this.spawnPulse(
        centerX + (Math.random() - 0.5) * 100,
        centerY + (Math.random() - 0.5) * 100,
        0.8 + audio.bass * 0.2,
        (this.time * 50 + audio.centroid * 180) % 360
      );
    }

    // Click ignites explosive epicenters
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.spawnPulse(
          click.x,
          click.y,
          1.0,
          (audio.centroid * 360) % 360
        );
        
        // Multiple contracting spasms
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            this.spawnPulse(
              click.x + (Math.random() - 0.5) * 50,
              click.y + (Math.random() - 0.5) * 50,
              0.6,
              (audio.centroid * 360 + i * 60) % 360
            );
          }, i * 100);
        }
      }
    });

    // Autonomous pulsing based on RMS
    if (Math.random() < audio.rms * 0.05) {
      this.spawnPulse(
        Math.random() * this.context.width,
        Math.random() * this.context.height,
        0.3 + audio.rms * 0.4,
        (this.time * 80 + audio.bass * 180) % 360
      );
    }

    // Update pulses
    this.pulses.forEach((pulse) => {
      pulse.lifetime += dt;
      const progress = pulse.lifetime / pulse.maxLifetime;

      if (!pulse.contracting) {
        // Expand with contracting spasms
        const spasm = Math.sin(this.time * 15 + pulse.x * 0.01) * 0.15;
        pulse.radius = pulse.maxRadius * Math.pow(progress, 0.5) * (1 + spasm);

        // Start contracting at 60% lifetime
        if (progress > 0.6) {
          pulse.contracting = true;
          pulse.contractionPhase = 0;
        }
      } else {
        // Contracting phase with intense spasms
        pulse.contractionPhase += dt * 5;
        const contraction = Math.sin(pulse.contractionPhase * Math.PI) * 0.3;
        pulse.radius = pulse.maxRadius * (1 - progress) * (0.8 + contraction);
      }

      // Intensity pulsates
      const throb = Math.sin(this.time * 8 + pulse.lifetime * 10) * 0.3;
      pulse.intensity = Math.max(0, pulse.intensity * (1 + throb * audio.rms));

      // Hue shift
      pulse.hue = (pulse.hue + dt * 30 + audio.centroid * 20) % 360;
    });

    // Remove dead pulses
    this.pulses = this.pulses.filter((p) => p.lifetime < p.maxLifetime && p.radius > 1);

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw radiating distortion waves
    this.pulses.forEach((pulse) => {
      const alpha = (1 - pulse.lifetime / pulse.maxLifetime) * pulse.intensity;
      const color = hslToHex(pulse.hue, 90, 50);
      const glowColor = hslToHex(pulse.hue, 100, 70);

      // Multiple concentric rings for convulsive effect
      for (let i = 0; i < 3; i++) {
        const offset = i * 15 + Math.sin(this.time * 5 + i) * 10;
        const ringRadius = pulse.radius + offset;
        const ringAlpha = alpha * (1 - i * 0.3) * (0.5 + audio.bass * 0.5);

        // Outer glow
        this.graphics.lineStyle(8 + audio.rms * 10, glowColor, ringAlpha * 0.3);
        this.graphics.drawCircle(pulse.x, pulse.y, ringRadius);

        // Inner ring
        this.graphics.lineStyle(3 + audio.treble * 5, color, ringAlpha);
        this.graphics.drawCircle(pulse.x, pulse.y, ringRadius);
      }

      // Epicenter core (explosive)
      if (pulse.lifetime < 0.5) {
        const coreSize = 20 * (1 - pulse.lifetime / 0.5) * pulse.intensity;
        this.graphics.beginFill(0xffffff, alpha * 0.8);
        this.graphics.drawCircle(pulse.x, pulse.y, coreSize);
        this.graphics.endFill();

        // Radiating rays
        const rayCount = 8;
        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2 + this.time * 2;
          const rayLength = pulse.radius * 0.3;
          this.graphics.lineStyle(2, glowColor, alpha * 0.6);
          this.graphics.moveTo(pulse.x, pulse.y);
          this.graphics.lineTo(
            pulse.x + Math.cos(angle) * rayLength,
            pulse.y + Math.sin(angle) * rayLength
          );
        }
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

