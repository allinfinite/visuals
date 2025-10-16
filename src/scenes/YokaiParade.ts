import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { noise2D } from '../utils/noise';

interface Yokai {
  x: number;
  y: number;
  baseY: number;
  speed: number;
  size: number;
  type: number; // 0-4 different yokai types
  phase: number;
  floatOffset: number;
  hue: number;
  alpha: number;
}

export class YokaiParade implements Pattern {
  public name = 'Yokai Parade';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private yokai: Yokai[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize yokai spirits
    for (let i = 0; i < 15; i++) {
      this.spawnYokai();
    }
  }

  private spawnYokai(): void {
    const { width, height } = this.context;
    this.yokai.push({
      x: randomRange(-100, width + 100),
      y: randomRange(height * 0.2, height * 0.8),
      baseY: randomRange(height * 0.2, height * 0.8),
      speed: randomRange(20, 60),
      size: randomRange(40, 100),
      type: Math.floor(randomRange(0, 5)),
      phase: randomRange(0, Math.PI * 2),
      floatOffset: 0,
      hue: randomRange(0, 360),
      alpha: randomRange(0.4, 0.9),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update yokai positions
    this.yokai.forEach((y, idx) => {
      // Move horizontally (parade march)
      y.x += y.speed * dt * (0.8 + audio.rms * 0.4);

      // Float up and down
      y.floatOffset = Math.sin(this.time * 1.5 + y.phase) * 20;
      y.y = y.baseY + y.floatOffset + Math.sin(this.time * 0.5 + y.phase) * 10;

      // Noise-based wobble
      const noiseVal = noise2D(y.x * 0.005, this.time * 0.5 + idx);
      y.y += noiseVal * 15;

      // Wrap around
      if (y.x > this.context.width + 150) {
        y.x = -150;
        y.baseY = randomRange(this.context.height * 0.2, this.context.height * 0.8);
        y.type = Math.floor(randomRange(0, 5));
        y.hue = randomRange(0, 360);
      }

      // Audio reactivity - bounce on beat
      if (audio.beat) {
        y.floatOffset += 15;
        y.size *= 1.1;
      }

      // Size decay back to normal
      if (y.size > 40) {
        y.size *= 0.98;
      }
    });

    // Spawn more yokai on high energy
    if (audio.beat && Math.random() < 0.3 && this.yokai.length < 25) {
      this.spawnYokai();
    }

    // Click interaction - spawn yokai at cursor
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        const newYokai: Yokai = {
          x: click.x,
          y: click.y,
          baseY: click.y,
          speed: randomRange(30, 70),
          size: randomRange(50, 120),
          type: Math.floor(randomRange(0, 5)),
          phase: randomRange(0, Math.PI * 2),
          floatOffset: 0,
          hue: (this.time * 100) % 360,
          alpha: 0.8,
        };
        this.yokai.push(newYokai);
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    this.yokai.forEach((y) => {
      const glowSize = y.size * (1 + audio.bass * 0.5);

      // Draw different yokai types
      switch (y.type) {
        case 0: // Lantern spirit (chochin-obake)
          this.drawLanternSpirit(y, glowSize, audio);
          break;
        case 1: // Floating mask (noh mask spirit)
          this.drawMaskSpirit(y, glowSize, audio);
          break;
        case 2: // Wisp (hitodama)
          this.drawWispSpirit(y, glowSize, audio);
          break;
        case 3: // Umbrella yokai (kasa-obake)
          this.drawUmbrellaSpirit(y, glowSize, audio);
          break;
        case 4: // Fox spirit (kitsune)
          this.drawFoxSpirit(y, glowSize, audio);
          break;
      }
    });
  }

  private drawLanternSpirit(y: Yokai, glowSize: number, _audio: AudioData): void {
    // Glow
    this.graphics.beginFill(this.hslToHex(y.hue, 80, 50), y.alpha * 0.3);
    this.graphics.drawCircle(y.x, y.y, glowSize * 1.5);
    this.graphics.endFill();

    // Lantern body
    this.graphics.beginFill(this.hslToHex(y.hue, 70, 60), y.alpha * 0.8);
    this.graphics.drawRect(y.x - glowSize * 0.3, y.y - glowSize * 0.5, glowSize * 0.6, glowSize);
    this.graphics.endFill();

    // Lantern bands
    this.graphics.lineStyle(2, 0x000000, y.alpha * 0.6);
    this.graphics.moveTo(y.x - glowSize * 0.3, y.y - glowSize * 0.2);
    this.graphics.lineTo(y.x + glowSize * 0.3, y.y - glowSize * 0.2);
    this.graphics.moveTo(y.x - glowSize * 0.3, y.y + glowSize * 0.2);
    this.graphics.lineTo(y.x + glowSize * 0.3, y.y + glowSize * 0.2);

    // Eye
    const eyeOpen = Math.sin(this.time * 3 + y.phase) > -0.5;
    if (eyeOpen) {
      this.graphics.beginFill(0x000000, y.alpha);
      this.graphics.drawCircle(y.x, y.y, glowSize * 0.1);
      this.graphics.endFill();
    }
  }

  private drawMaskSpirit(y: Yokai, glowSize: number, _audio: AudioData): void {
    // Glow
    this.graphics.beginFill(0xffffff, y.alpha * 0.2);
    this.graphics.drawCircle(y.x, y.y, glowSize * 1.3);
    this.graphics.endFill();

    // Mask face
    this.graphics.beginFill(0xffffff, y.alpha * 0.9);
    this.graphics.drawCircle(y.x, y.y, glowSize * 0.6);
    this.graphics.endFill();

    // Eyes
    const eyeY = y.y - glowSize * 0.15;
    this.graphics.beginFill(0x000000, y.alpha);
    this.graphics.drawCircle(y.x - glowSize * 0.2, eyeY, glowSize * 0.08);
    this.graphics.drawCircle(y.x + glowSize * 0.2, eyeY, glowSize * 0.08);
    this.graphics.endFill();

    // Smile
    this.graphics.lineStyle(3, 0xff0000, y.alpha * 0.8);
    this.graphics.arc(y.x, y.y + glowSize * 0.1, glowSize * 0.3, 0, Math.PI);
  }

  private drawWispSpirit(y: Yokai, glowSize: number, _audio: AudioData): void {
    // Multiple glowing orbs
    const orbCount = 5;
    for (let i = 0; i < orbCount; i++) {
      const angle = (i / orbCount) * Math.PI * 2 + this.time * 2;
      const radius = glowSize * 0.3;
      const orbX = y.x + Math.cos(angle) * radius;
      const orbY = y.y + Math.sin(angle) * radius;

      this.graphics.beginFill(this.hslToHex(y.hue + i * 30, 100, 60), y.alpha * 0.4);
      this.graphics.drawCircle(orbX, orbY, glowSize * 0.3);
      this.graphics.endFill();

      this.graphics.beginFill(0xffffff, y.alpha * 0.8);
      this.graphics.drawCircle(orbX, orbY, glowSize * 0.15);
      this.graphics.endFill();
    }
  }

  private drawUmbrellaSpirit(y: Yokai, glowSize: number, _audio: AudioData): void {
    // Umbrella top
    this.graphics.beginFill(this.hslToHex(y.hue, 60, 40), y.alpha * 0.8);
    this.graphics.moveTo(y.x, y.y - glowSize * 0.8);
    this.graphics.lineTo(y.x - glowSize * 0.6, y.y - glowSize * 0.2);
    this.graphics.lineTo(y.x + glowSize * 0.6, y.y - glowSize * 0.2);
    this.graphics.lineTo(y.x, y.y - glowSize * 0.8);
    this.graphics.endFill();

    // Umbrella ribs
    this.graphics.lineStyle(2, 0x000000, y.alpha * 0.6);
    for (let i = -1; i <= 1; i++) {
      this.graphics.moveTo(y.x, y.y - glowSize * 0.8);
      this.graphics.lineTo(y.x + i * glowSize * 0.3, y.y - glowSize * 0.2);
    }

    // Handle/body
    this.graphics.lineStyle(4, this.hslToHex(y.hue, 50, 30), y.alpha * 0.9);
    this.graphics.moveTo(y.x, y.y - glowSize * 0.2);
    this.graphics.lineTo(y.x, y.y + glowSize * 0.6);

    // Eye
    this.graphics.beginFill(0xff0000, y.alpha * 0.9);
    this.graphics.drawCircle(y.x, y.y + glowSize * 0.2, glowSize * 0.1);
    this.graphics.endFill();
  }

  private drawFoxSpirit(y: Yokai, glowSize: number, _audio: AudioData): void {
    // Ethereal glow
    this.graphics.beginFill(0xffa500, y.alpha * 0.2);
    this.graphics.drawCircle(y.x, y.y, glowSize * 1.4);
    this.graphics.endFill();

    // Fox head
    this.graphics.beginFill(0xffa500, y.alpha * 0.8);
    this.graphics.drawCircle(y.x, y.y, glowSize * 0.5);
    this.graphics.endFill();

    // Ears
    this.graphics.beginFill(0xffa500, y.alpha * 0.8);
    this.graphics.moveTo(y.x - glowSize * 0.4, y.y - glowSize * 0.3);
    this.graphics.lineTo(y.x - glowSize * 0.2, y.y - glowSize * 0.7);
    this.graphics.lineTo(y.x - glowSize * 0.1, y.y - glowSize * 0.3);
    this.graphics.endFill();

    this.graphics.beginFill(0xffa500, y.alpha * 0.8);
    this.graphics.moveTo(y.x + glowSize * 0.4, y.y - glowSize * 0.3);
    this.graphics.lineTo(y.x + glowSize * 0.2, y.y - glowSize * 0.7);
    this.graphics.lineTo(y.x + glowSize * 0.1, y.y - glowSize * 0.3);
    this.graphics.endFill();

    // Eyes (glowing)
    const eyeGlow = 0.5 + Math.sin(this.time * 4 + y.phase) * 0.5;
    this.graphics.beginFill(0xffff00, y.alpha * eyeGlow);
    this.graphics.drawCircle(y.x - glowSize * 0.2, y.y - glowSize * 0.1, glowSize * 0.1);
    this.graphics.drawCircle(y.x + glowSize * 0.2, y.y - glowSize * 0.1, glowSize * 0.1);
    this.graphics.endFill();

    // Tails (multiple)
    for (let i = 0; i < 3; i++) {
      const tailAngle = Math.sin(this.time * 2 + y.phase + i) * 0.5;
      const tailX = y.x - glowSize * 0.8 - i * glowSize * 0.2;
      const tailY = y.y + Math.sin(this.time + i) * glowSize * 0.3;

      this.graphics.lineStyle(8 - i * 2, 0xffa500, y.alpha * (0.6 - i * 0.1));
      this.graphics.moveTo(y.x, y.y + glowSize * 0.3);
      this.graphics.quadraticCurveTo(
        tailX,
        tailY,
        tailX - glowSize * 0.3,
        tailY + tailAngle * 20
      );
    }
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

