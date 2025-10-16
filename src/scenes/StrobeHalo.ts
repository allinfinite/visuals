import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface Pulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  hue: number;
  thickness: number;
}

export class StrobeHalo implements Pattern {
  public name = 'Strobe Halo';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private pulses: Pulse[] = [];
  private time: number = 0;
  private lastBeatTime: number = 0;
  private centerX: number;
  private centerY: number;

  constructor(context: RendererContext) {
    this.context = context;
    this.centerX = context.width / 2;
    this.centerY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  private spawnPulse(x: number, y: number, audio: AudioData, isManual: boolean = false): void {
    const intensity = isManual ? 1 : audio.rms;
    const bassBoost = audio.bass * 2;

    this.pulses.push({
      x,
      y,
      radius: 0,
      maxRadius: 300 + bassBoost * 400 + (isManual ? 200 : 0),
      speed: 200 + intensity * 400 + bassBoost * 200,
      alpha: 0.9,
      hue: (this.time * 100 + audio.centroid * 180) % 360,
      thickness: 4 + intensity * 8 + (isManual ? 6 : 0),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Move center based on audio (breathing effect)
    const breatheX = Math.sin(this.time * 0.5) * 30;
    const breatheY = Math.cos(this.time * 0.7) * 30;
    this.centerX = this.context.width / 2 + breatheX + audio.centroid * 50 - 25;
    this.centerY = this.context.height / 2 + breatheY + audio.bass * 50 - 25;

    // Spawn pulse on beat
    if (audio.beat && this.time - this.lastBeatTime > 0.1) {
      this.lastBeatTime = this.time;
      
      // Spawn multiple pulses for stronger beats
      const pulseCount = Math.floor(1 + audio.rms * 3);
      for (let i = 0; i < pulseCount; i++) {
        const angleOffset = (i / pulseCount) * Math.PI * 2;
        const offsetDist = i * 20;
        const x = this.centerX + Math.cos(angleOffset) * offsetDist;
        const y = this.centerY + Math.sin(angleOffset) * offsetDist;
        this.spawnPulse(x, y, audio);
      }
    }

    // Autonomous spawning when no beats
    if (this.time - this.lastBeatTime > 1.5) {
      const autoSpawnChance = 0.02;
      if (Math.random() < autoSpawnChance) {
        this.spawnPulse(this.centerX, this.centerY, audio);
      }
    }

    // Click spawns pulse
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.spawnPulse(click.x, click.y, audio, true);
      }
    });

    // Mouse drag creates continuous pulses
    if (input.isDragging && Math.random() < 0.3) {
      this.spawnPulse(input.x, input.y, audio, true);
    }

    // Update pulses
    this.pulses.forEach((pulse) => {
      pulse.radius += pulse.speed * dt;
      
      // Fade out as it expands
      const progress = pulse.radius / pulse.maxRadius;
      pulse.alpha = 0.9 * (1 - progress);

      // Thickness decreases as it expands
      pulse.thickness *= 0.99;
    });

    // Remove dead pulses
    this.pulses = this.pulses.filter(p => p.radius < p.maxRadius && p.alpha > 0.01);

    // Limit pulse count
    if (this.pulses.length > 50) {
      this.pulses = this.pulses.slice(-50);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw all pulses
    this.pulses.forEach((pulse) => {
      const color = this.hslToHex(pulse.hue, 80, 60);
      
      // Outer glow
      this.graphics.lineStyle(pulse.thickness * 2, color, pulse.alpha * 0.2);
      this.graphics.drawCircle(pulse.x, pulse.y, pulse.radius);

      // Main ring
      this.graphics.lineStyle(pulse.thickness, color, pulse.alpha * 0.8);
      this.graphics.drawCircle(pulse.x, pulse.y, pulse.radius);

      // Inner bright ring
      this.graphics.lineStyle(pulse.thickness * 0.5, 0xffffff, pulse.alpha);
      this.graphics.drawCircle(pulse.x, pulse.y, pulse.radius);

      // Add radial lines for strobe effect (only on strong pulses)
      if (pulse.thickness > 8) {
        const rayCount = 12;
        this.graphics.lineStyle(2, color, pulse.alpha * 0.5);
        
        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2;
          const innerRadius = pulse.radius - 20;
          const outerRadius = pulse.radius + 20;
          
          this.graphics.moveTo(
            pulse.x + Math.cos(angle) * innerRadius,
            pulse.y + Math.sin(angle) * innerRadius
          );
          this.graphics.lineTo(
            pulse.x + Math.cos(angle) * outerRadius,
            pulse.y + Math.sin(angle) * outerRadius
          );
        }
      }
    });

    // Draw central glow
    const glowSize = 20 + audio.rms * 40 + (audio.beat ? 30 : 0);
    const glowHue = (this.time * 80) % 360;
    
    this.graphics.beginFill(this.hslToHex(glowHue, 100, 70), 0.4 + audio.rms * 0.3);
    this.graphics.drawCircle(this.centerX, this.centerY, glowSize);
    this.graphics.endFill();

    this.graphics.beginFill(0xffffff, 0.8 + (audio.beat ? 0.2 : 0));
    this.graphics.drawCircle(this.centerX, this.centerY, glowSize * 0.5);
    this.graphics.endFill();
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

