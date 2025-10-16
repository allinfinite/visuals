import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { hslToHex, lerpColor, darkenColor } from '../utils/color';

interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
  twinkleSpeed: number;
}

export class DayNightCycle implements Pattern {
  public name = 'Day Night Cycle';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private cyclePosition: number = 0; // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
  private cycleSpeed: number = 0.05; // Cycles per second
  private stars: Star[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize stars
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: randomRange(0, context.width),
        y: randomRange(0, context.height * 0.6), // Upper portion
        size: randomRange(1, 3),
        twinkle: randomRange(0, Math.PI * 2),
        twinkleSpeed: randomRange(2, 5),
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Cycle speed controlled by audio
    const audioSpeedMultiplier = 1 + audio.rms * 2;
    this.cyclePosition += this.cycleSpeed * dt * audioSpeedMultiplier;
    this.cyclePosition %= 1; // Wrap around

    // Beat jumps forward in time
    if (audio.beat) {
      this.cyclePosition += 0.02;
      this.cyclePosition %= 1;
    }

    // Click sets time of day
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.cyclePosition = click.x / this.context.width;
      }
    });

    // Update star twinkle
    this.stars.forEach((star) => {
      star.twinkle += star.twinkleSpeed * dt;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    const { width, height } = this.context;

    // Determine sky colors based on cycle position
    const skyColors = this.getSkyColors(this.cyclePosition, audio);

    // Draw gradient sky
    const gradientSteps = 50;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const color = lerpColor(skyColors.top, skyColors.bottom, t);
      const y = t * height;
      const barHeight = height / gradientSteps;

      this.graphics.beginFill(color, 0.3); // Lower alpha for trails
      this.graphics.drawRect(0, y, width, barHeight);
      this.graphics.endFill();
    }

    // Draw sun/moon
    this.drawCelestialBody(audio);

    // Draw stars (visible at night)
    const nightness = this.getNightness(this.cyclePosition);
    if (nightness > 0.3) {
      this.stars.forEach((star) => {
        const twinkle = Math.abs(Math.sin(star.twinkle)) * 0.5 + 0.5;
        const alpha = nightness * twinkle * (0.6 + audio.treble * 0.4);

        this.graphics.beginFill(0xffffff, alpha);
        this.graphics.drawCircle(star.x, star.y, star.size);
        this.graphics.endFill();

        // Star glow
        if (twinkle > 0.7) {
          this.graphics.beginFill(0xffffff, alpha * 0.3);
          this.graphics.drawCircle(star.x, star.y, star.size * 3);
          this.graphics.endFill();
        }
      });
    }

    // Draw horizon line
    const horizonY = height * 0.7;
    const horizonColor = this.getHorizonColor(this.cyclePosition, audio);
    this.graphics.lineStyle(2, horizonColor, 0.5 + audio.rms * 0.3);
    this.graphics.moveTo(0, horizonY);
    this.graphics.lineTo(width, horizonY);

    // Ground with darker color
    this.graphics.beginFill(darkenColor(skyColors.bottom, 60), 0.3);
    this.graphics.drawRect(0, horizonY, width, height - horizonY);
    this.graphics.endFill();
  }

  private getSkyColors(cycle: number, audio: AudioData): { top: number; bottom: number } {
    // Audio shifts hue
    const hueShift = audio.centroid * 60;

    if (cycle < 0.2 || cycle > 0.8) {
      // Night
      return {
        top: hslToHex(240 + hueShift, 60, 10),
        bottom: hslToHex(250 + hueShift, 50, 20),
      };
    } else if (cycle < 0.3) {
      // Sunrise
      const t = (cycle - 0.2) / 0.1;
      return {
        top: lerpColor(
          hslToHex(240 + hueShift, 60, 10),
          hslToHex(200 + hueShift, 70, 50),
          t
        ),
        bottom: lerpColor(
          hslToHex(250 + hueShift, 50, 20),
          hslToHex(30 + hueShift, 80, 50),
          t
        ),
      };
    } else if (cycle < 0.7) {
      // Day
      return {
        top: hslToHex(200 + hueShift, 70, 50 + audio.rms * 20),
        bottom: hslToHex(190 + hueShift, 60, 65 + audio.rms * 15),
      };
    } else {
      // Sunset
      const t = (cycle - 0.7) / 0.1;
      return {
        top: lerpColor(
          hslToHex(200 + hueShift, 70, 50),
          hslToHex(240 + hueShift, 60, 10),
          t
        ),
        bottom: lerpColor(
          hslToHex(30 + hueShift, 80, 50),
          hslToHex(250 + hueShift, 50, 20),
          t
        ),
      };
    }
  }

  private drawCelestialBody(audio: AudioData): void {
    const { width, height } = this.context;
    
    // Position based on cycle (arc across sky)
    const angle = (this.cyclePosition - 0.25) * Math.PI; // -90° to +90°
    const radius = width * 0.4;
    const centerX = width / 2 + Math.cos(angle) * radius;
    const centerY = height * 0.3 + Math.sin(angle) * radius * 0.5;

    const isDay = this.cyclePosition > 0.25 && this.cyclePosition < 0.75;
    const size = 40 + audio.bass * 20;

    if (isDay) {
      // Sun
      const sunColor = hslToHex(45 + audio.centroid * 30, 100, 60);

      // Sun glow
      this.graphics.beginFill(sunColor, 0.2 + audio.rms * 0.2);
      this.graphics.drawCircle(centerX, centerY, size * 3);
      this.graphics.endFill();

      // Sun body
      this.graphics.beginFill(sunColor, 0.9);
      this.graphics.drawCircle(centerX, centerY, size);
      this.graphics.endFill();

      // Sun core
      this.graphics.beginFill(0xffffff, 0.7);
      this.graphics.drawCircle(centerX, centerY, size * 0.6);
      this.graphics.endFill();

      // Sun rays
      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        const rayAngle = (i / rayCount) * Math.PI * 2 + this.time * 0.5;
        const rayLength = size * (1.5 + Math.sin(this.time * 2 + i) * 0.3);
        
        this.graphics.lineStyle(3, sunColor, 0.6);
        this.graphics.moveTo(centerX, centerY);
        this.graphics.lineTo(
          centerX + Math.cos(rayAngle) * rayLength,
          centerY + Math.sin(rayAngle) * rayLength
        );
      }
    } else {
      // Moon
      const moonColor = hslToHex(200, 10, 80);

      // Moon glow
      this.graphics.beginFill(moonColor, 0.3);
      this.graphics.drawCircle(centerX, centerY, size * 2);
      this.graphics.endFill();

      // Moon body
      this.graphics.beginFill(moonColor, 0.9);
      this.graphics.drawCircle(centerX, centerY, size);
      this.graphics.endFill();

      // Moon craters
      for (let i = 0; i < 3; i++) {
        const craterX = centerX + Math.cos(i * 2) * size * 0.4;
        const craterY = centerY + Math.sin(i * 3) * size * 0.4;
        const craterSize = size * 0.2;

        this.graphics.beginFill(darkenColor(moonColor, 20), 0.5);
        this.graphics.drawCircle(craterX, craterY, craterSize);
        this.graphics.endFill();
      }
    }
  }

  private getNightness(cycle: number): number {
    if (cycle < 0.25 || cycle > 0.75) {
      return 1;
    } else if (cycle < 0.35) {
      return 1 - (cycle - 0.25) / 0.1;
    } else if (cycle < 0.65) {
      return 0;
    } else {
      return (cycle - 0.65) / 0.1;
    }
  }

  private getHorizonColor(cycle: number, audio: AudioData): number {
    const hueShift = audio.centroid * 60;
    
    if (cycle < 0.2 || cycle > 0.8) {
      return hslToHex(230 + hueShift, 40, 30);
    } else if (cycle < 0.3 || cycle > 0.7) {
      return hslToHex(30 + hueShift, 90, 60);
    } else {
      return hslToHex(200 + hueShift, 50, 70);
    }
  }


  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

