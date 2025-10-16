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
    for (let i = 0; i < 8; i++) {
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

    // Spawn more yokai on high energy (less frequently)
    if (audio.beat && Math.random() < 0.1 && this.yokai.length < 15) {
      this.spawnYokai();
    }

    // Click interaction - spawn yokai parading in from the left
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.yokai.length < 20) {
        // Spawn only 1 yokai from the left side
        const newYokai: Yokai = {
          x: -150, // Start from the left edge
          y: randomRange(this.context.height * 0.2, this.context.height * 0.8),
          baseY: randomRange(this.context.height * 0.2, this.context.height * 0.8),
          speed: randomRange(40, 80),
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
    // Outer ethereal glow
    this.graphics.beginFill(this.hslToHex(y.hue, 90, 60), y.alpha * 0.15);
    this.graphics.drawCircle(y.x, y.y, glowSize * 2);
    this.graphics.endFill();
    
    // Inner glow
    this.graphics.beginFill(this.hslToHex(y.hue, 95, 70), y.alpha * 0.4);
    this.graphics.drawCircle(y.x, y.y, glowSize * 1.2);
    this.graphics.endFill();

    // Lantern shadow/depth
    this.graphics.beginFill(this.hslToHex(y.hue, 60, 30), y.alpha * 0.6);
    this.graphics.drawEllipse(y.x, y.y - glowSize * 0.5, glowSize * 0.35, glowSize * 1.1);
    this.graphics.endFill();

    // Main lantern body with gradient effect
    this.graphics.beginFill(this.hslToHex(y.hue, 70, 55), y.alpha * 0.9);
    this.graphics.drawEllipse(y.x - 2, y.y - glowSize * 0.5, glowSize * 0.32, glowSize * 1.05);
    this.graphics.endFill();

    // Bright lantern surface
    this.graphics.beginFill(this.hslToHex(y.hue, 85, 75), y.alpha * 0.85);
    this.graphics.drawEllipse(y.x - 5, y.y - glowSize * 0.5, glowSize * 0.28, glowSize);
    this.graphics.endFill();

    // Top cap
    this.graphics.beginFill(0x2a1810, y.alpha * 0.9);
    this.graphics.drawEllipse(y.x, y.y - glowSize, glowSize * 0.35, glowSize * 0.15);
    this.graphics.endFill();
    
    // Bottom cap
    this.graphics.beginFill(0x2a1810, y.alpha * 0.9);
    this.graphics.drawEllipse(y.x, y.y + glowSize * 0.5, glowSize * 0.35, glowSize * 0.15);
    this.graphics.endFill();

    // Decorative bands with shading
    this.graphics.lineStyle(3, 0x8b4513, y.alpha * 0.8);
    for (let i = -0.3; i <= 0.3; i += 0.3) {
      this.graphics.moveTo(y.x - glowSize * 0.35, y.y + glowSize * i);
      this.graphics.lineTo(y.x + glowSize * 0.35, y.y + glowSize * i);
    }

    // Scary face - angry eye
    const eyeOpen = Math.sin(this.time * 3 + y.phase);
    const eyeSize = glowSize * (0.12 + eyeOpen * 0.03);
    
    // Eye white
    this.graphics.beginFill(0xffffff, y.alpha * 0.9);
    this.graphics.drawEllipse(y.x, y.y - glowSize * 0.2, eyeSize * 1.2, eyeSize);
    this.graphics.endFill();
    
    // Angry pupil
    this.graphics.beginFill(0x000000, y.alpha);
    this.graphics.drawCircle(y.x + eyeSize * 0.3, y.y - glowSize * 0.2, eyeSize * 0.6);
    this.graphics.endFill();
    
    // Angry eyebrow
    this.graphics.lineStyle(3, 0x000000, y.alpha * 0.8);
    this.graphics.moveTo(y.x - eyeSize, y.y - glowSize * 0.35);
    this.graphics.lineTo(y.x + eyeSize, y.y - glowSize * 0.25);
    
    // Menacing mouth
    this.graphics.lineStyle(3, 0x000000, y.alpha * 0.9);
    this.graphics.arc(y.x, y.y + glowSize * 0.1, glowSize * 0.2, Math.PI, 0, true);
    
    // Sharp teeth
    for (let i = 0; i < 5; i++) {
      const tx = y.x - glowSize * 0.2 + i * glowSize * 0.1;
      this.graphics.moveTo(tx, y.y + glowSize * 0.1);
      this.graphics.lineTo(tx, y.y + glowSize * 0.18);
    }
    
    // Paper texture lines
    this.graphics.lineStyle(1, 0xffffff, y.alpha * 0.2);
    for (let i = 0; i < 8; i++) {
      const lineY = y.y - glowSize + i * glowSize * 0.25;
      this.graphics.moveTo(y.x - glowSize * 0.25, lineY);
      this.graphics.lineTo(y.x + glowSize * 0.25, lineY);
    }
  }

  private drawMaskSpirit(y: Yokai, glowSize: number, _audio: AudioData): void {
    // Ethereal aura
    this.graphics.beginFill(0xccffff, y.alpha * 0.15);
    this.graphics.drawCircle(y.x, y.y, glowSize * 1.6);
    this.graphics.endFill();
    
    // Inner glow
    this.graphics.beginFill(0xeeffff, y.alpha * 0.3);
    this.graphics.drawCircle(y.x, y.y, glowSize * 1.1);
    this.graphics.endFill();

    // Mask shadow (left side)
    this.graphics.beginFill(0xdddde8, y.alpha * 0.7);
    this.graphics.drawEllipse(y.x + 3, y.y, glowSize * 0.62, glowSize * 0.75);
    this.graphics.endFill();

    // Main mask face (pale)
    this.graphics.beginFill(0xfffffA, y.alpha * 0.95);
    this.graphics.drawEllipse(y.x, y.y, glowSize * 0.6, glowSize * 0.75);
    this.graphics.endFill();
    
    // Face highlight
    this.graphics.beginFill(0xffffff, y.alpha * 0.6);
    this.graphics.drawEllipse(y.x - glowSize * 0.15, y.y - glowSize * 0.1, glowSize * 0.3, glowSize * 0.4);
    this.graphics.endFill();

    // Eyebrows (thin, arched)
    this.graphics.lineStyle(2, 0x000000, y.alpha * 0.8);
    // Left eyebrow
    this.graphics.arc(y.x - glowSize * 0.25, y.y - glowSize * 0.25, glowSize * 0.15, -Math.PI * 0.2, Math.PI * 0.3, false);
    // Right eyebrow
    this.graphics.arc(y.x + glowSize * 0.25, y.y - glowSize * 0.25, glowSize * 0.15, Math.PI * 0.7, Math.PI * 1.2, false);

    // Eyes (narrow, eerie)
    const eyeY = y.y - glowSize * 0.12;
    const eyeBlink = Math.sin(this.time * 2 + y.phase);
    const eyeHeight = glowSize * (0.12 - eyeBlink * 0.05);
    
    // Left eye
    this.graphics.beginFill(0x000000, y.alpha * 0.9);
    this.graphics.drawEllipse(y.x - glowSize * 0.25, eyeY, glowSize * 0.1, eyeHeight);
    this.graphics.endFill();
    
    // Right eye
    this.graphics.beginFill(0x000000, y.alpha * 0.9);
    this.graphics.drawEllipse(y.x + glowSize * 0.25, eyeY, glowSize * 0.1, eyeHeight);
    this.graphics.endFill();
    
    // Eye gleam
    this.graphics.beginFill(0xffffff, y.alpha * 0.6);
    this.graphics.drawCircle(y.x - glowSize * 0.23, eyeY - eyeHeight * 0.2, glowSize * 0.03);
    this.graphics.drawCircle(y.x + glowSize * 0.27, eyeY - eyeHeight * 0.2, glowSize * 0.03);
    this.graphics.endFill();

    // Nose shadow
    this.graphics.lineStyle(2, 0x000000, y.alpha * 0.4);
    this.graphics.moveTo(y.x, y.y - glowSize * 0.05);
    this.graphics.lineTo(y.x + glowSize * 0.05, y.y + glowSize * 0.05);

    // Unsettling smile (Hannya-inspired)
    this.graphics.lineStyle(4, 0x8b0000, y.alpha * 0.9);
    // Smile curve
    this.graphics.arc(y.x, y.y + glowSize * 0.15, glowSize * 0.35, 0, Math.PI, false);
    
    // Smile corners (upturned)
    this.graphics.moveTo(y.x - glowSize * 0.35, y.y + glowSize * 0.15);
    this.graphics.lineTo(y.x - glowSize * 0.4, y.y + glowSize * 0.1);
    this.graphics.moveTo(y.x + glowSize * 0.35, y.y + glowSize * 0.15);
    this.graphics.lineTo(y.x + glowSize * 0.4, y.y + glowSize * 0.1);
    
    // Teeth
    this.graphics.lineStyle(2, 0xffffff, y.alpha * 0.8);
    for (let i = 0; i < 6; i++) {
      const tx = y.x - glowSize * 0.25 + i * glowSize * 0.1;
      const angle = (i / 5 - 0.5) * Math.PI;
      const ty = y.y + glowSize * 0.15 + Math.sin(angle) * glowSize * 0.35;
      this.graphics.moveTo(tx, ty);
      this.graphics.lineTo(tx, ty + glowSize * 0.08);
    }
    
    // Cheek blush marks (traditional)
    this.graphics.beginFill(0xff6b9d, y.alpha * 0.3);
    this.graphics.drawEllipse(y.x - glowSize * 0.35, y.y + glowSize * 0.05, glowSize * 0.12, glowSize * 0.08);
    this.graphics.drawEllipse(y.x + glowSize * 0.35, y.y + glowSize * 0.05, glowSize * 0.12, glowSize * 0.08);
    this.graphics.endFill();
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
    // Outer mystical aura
    this.graphics.beginFill(0xff8800, y.alpha * 0.1);
    this.graphics.drawCircle(y.x, y.y, glowSize * 2.2);
    this.graphics.endFill();
    
    // Middle aura
    this.graphics.beginFill(0xffa500, y.alpha * 0.25);
    this.graphics.drawCircle(y.x, y.y, glowSize * 1.5);
    this.graphics.endFill();

    // Draw tails first (behind body) - 9 tails for powerful kitsune
    for (let i = 0; i < 9; i++) {
      const tailSpread = (i - 4) * 0.3;
      const tailAngle = Math.sin(this.time * 2 + y.phase + i * 0.5) * 0.4;
      const tailX = y.x - glowSize * (0.5 + i * 0.15);
      const tailY = y.y + Math.sin(this.time * 1.5 + i * 0.3) * glowSize * 0.4 + tailSpread * glowSize * 0.3;
      
      // Tail glow
      this.graphics.lineStyle(12 - i * 0.8, 0xff6600, y.alpha * (0.3 - i * 0.025));
      this.graphics.moveTo(y.x, y.y + glowSize * 0.4);
      this.graphics.quadraticCurveTo(
        tailX * 0.7, tailY,
        tailX - glowSize * 0.5,
        tailY + tailAngle * 25 + tailSpread * 15
      );
      
      // Main tail
      this.graphics.lineStyle(9 - i * 0.7, 0xffa500, y.alpha * (0.7 - i * 0.05));
      this.graphics.moveTo(y.x, y.y + glowSize * 0.4);
      this.graphics.quadraticCurveTo(
        tailX * 0.7, tailY,
        tailX - glowSize * 0.5,
        tailY + tailAngle * 25 + tailSpread * 15
      );
      
      // Tail highlight
      this.graphics.lineStyle(4 - i * 0.3, 0xffcc88, y.alpha * (0.5 - i * 0.04));
      this.graphics.moveTo(y.x, y.y + glowSize * 0.4);
      this.graphics.quadraticCurveTo(
        tailX * 0.7, tailY - glowSize * 0.05,
        tailX - glowSize * 0.5,
        tailY + tailAngle * 25 + tailSpread * 15 - glowSize * 0.08
      );
      
      // Tail tip glow
      const tipX = tailX - glowSize * 0.5;
      const tipY = tailY + tailAngle * 25 + tailSpread * 15;
      this.graphics.beginFill(0xffffff, y.alpha * (0.4 - i * 0.03));
      this.graphics.drawCircle(tipX, tipY, glowSize * 0.12);
      this.graphics.endFill();
    }

    // Body/neck
    this.graphics.beginFill(0xff9933, y.alpha * 0.75);
    this.graphics.drawEllipse(y.x, y.y + glowSize * 0.25, glowSize * 0.35, glowSize * 0.45);
    this.graphics.endFill();

    // Head shadow
    this.graphics.beginFill(0xcc7722, y.alpha * 0.6);
    this.graphics.drawEllipse(y.x + 2, y.y, glowSize * 0.52, glowSize * 0.58);
    this.graphics.endFill();

    // Fox head (main)
    this.graphics.beginFill(0xffa033, y.alpha * 0.9);
    this.graphics.drawEllipse(y.x, y.y, glowSize * 0.5, glowSize * 0.58);
    this.graphics.endFill();
    
    // Face highlight
    this.graphics.beginFill(0xffcc88, y.alpha * 0.6);
    this.graphics.drawEllipse(y.x - glowSize * 0.12, y.y - glowSize * 0.08, glowSize * 0.25, glowSize * 0.3);
    this.graphics.endFill();
    
    // White muzzle
    this.graphics.beginFill(0xffffff, y.alpha * 0.8);
    this.graphics.drawEllipse(y.x, y.y + glowSize * 0.15, glowSize * 0.25, glowSize * 0.2);
    this.graphics.endFill();

    // Ears (triangular with inner ear detail)
    // Left ear
    this.graphics.beginFill(0xff8800, y.alpha * 0.85);
    this.graphics.moveTo(y.x - glowSize * 0.42, y.y - glowSize * 0.38);
    this.graphics.lineTo(y.x - glowSize * 0.18, y.y - glowSize * 0.82);
    this.graphics.lineTo(y.x - glowSize * 0.08, y.y - glowSize * 0.38);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Left inner ear
    this.graphics.beginFill(0xffddaa, y.alpha * 0.7);
    this.graphics.moveTo(y.x - glowSize * 0.35, y.y - glowSize * 0.42);
    this.graphics.lineTo(y.x - glowSize * 0.18, y.y - glowSize * 0.68);
    this.graphics.lineTo(y.x - glowSize * 0.15, y.y - glowSize * 0.42);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Right ear
    this.graphics.beginFill(0xff8800, y.alpha * 0.85);
    this.graphics.moveTo(y.x + glowSize * 0.42, y.y - glowSize * 0.38);
    this.graphics.lineTo(y.x + glowSize * 0.18, y.y - glowSize * 0.82);
    this.graphics.lineTo(y.x + glowSize * 0.08, y.y - glowSize * 0.38);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Right inner ear
    this.graphics.beginFill(0xffddaa, y.alpha * 0.7);
    this.graphics.moveTo(y.x + glowSize * 0.35, y.y - glowSize * 0.42);
    this.graphics.lineTo(y.x + glowSize * 0.18, y.y - glowSize * 0.68);
    this.graphics.lineTo(y.x + glowSize * 0.15, y.y - glowSize * 0.42);
    this.graphics.closePath();
    this.graphics.endFill();

    // Eyes (mystical, glowing)
    const eyeGlow = 0.6 + Math.sin(this.time * 3 + y.phase) * 0.4;
    const eyeY = y.y - glowSize * 0.12;
    
    // Eye glow aura
    this.graphics.beginFill(0xffff00, y.alpha * eyeGlow * 0.3);
    this.graphics.drawEllipse(y.x - glowSize * 0.22, eyeY, glowSize * 0.16, glowSize * 0.18);
    this.graphics.drawEllipse(y.x + glowSize * 0.22, eyeY, glowSize * 0.16, glowSize * 0.18);
    this.graphics.endFill();
    
    // Eye whites
    this.graphics.beginFill(0xffffaa, y.alpha * eyeGlow);
    this.graphics.drawEllipse(y.x - glowSize * 0.22, eyeY, glowSize * 0.12, glowSize * 0.14);
    this.graphics.drawEllipse(y.x + glowSize * 0.22, eyeY, glowSize * 0.12, glowSize * 0.14);
    this.graphics.endFill();
    
    // Vertical slitted pupils
    this.graphics.lineStyle(3, 0x000000, y.alpha * 0.95);
    this.graphics.moveTo(y.x - glowSize * 0.22, eyeY - glowSize * 0.1);
    this.graphics.lineTo(y.x - glowSize * 0.22, eyeY + glowSize * 0.1);
    this.graphics.moveTo(y.x + glowSize * 0.22, eyeY - glowSize * 0.1);
    this.graphics.lineTo(y.x + glowSize * 0.22, eyeY + glowSize * 0.1);
    
    // Eye gleam
    this.graphics.beginFill(0xffffff, y.alpha * eyeGlow * 0.8);
    this.graphics.drawCircle(y.x - glowSize * 0.20, eyeY - glowSize * 0.06, glowSize * 0.04);
    this.graphics.drawCircle(y.x + glowSize * 0.24, eyeY - glowSize * 0.06, glowSize * 0.04);
    this.graphics.endFill();

    // Nose
    this.graphics.beginFill(0x000000, y.alpha * 0.9);
    this.graphics.drawCircle(y.x, y.y + glowSize * 0.08, glowSize * 0.06);
    this.graphics.endFill();
    
    // Whisker dots
    this.graphics.beginFill(0x000000, y.alpha * 0.7);
    for (let side = -1; side <= 1; side += 2) {
      for (let row = 0; row < 3; row++) {
        const dotX = y.x + side * glowSize * 0.28;
        const dotY = y.y + glowSize * (0.05 + row * 0.06);
        this.graphics.drawCircle(dotX, dotY, glowSize * 0.02);
      }
    }
    this.graphics.endFill();
    
    // Whiskers
    this.graphics.lineStyle(1, 0xffffff, y.alpha * 0.6);
    for (let side = -1; side <= 1; side += 2) {
      for (let row = 0; row < 3; row++) {
        const startX = y.x + side * glowSize * 0.28;
        const startY = y.y + glowSize * (0.05 + row * 0.06);
        const whiskerLength = glowSize * (0.5 + row * 0.1);
        const whiskerAngle = side * (0.2 - row * 0.15);
        this.graphics.moveTo(startX, startY);
        this.graphics.lineTo(
          startX + side * whiskerLength * Math.cos(whiskerAngle),
          startY + whiskerLength * Math.sin(whiskerAngle)
        );
      }
    }
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

