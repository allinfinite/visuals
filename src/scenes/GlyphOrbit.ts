import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { hslToHex } from '../utils/color';

interface Glyph {
  angle: number;
  distance: number;
  targetDistance: number;
  speed: number;
  size: number;
  shape: number; // 0-9 different shapes
  hue: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
}

export class GlyphOrbit implements Pattern {
  public name = 'Glyph Orbit';
  public container: Container;
  private graphics: Graphics;
  private glyphs: Glyph[] = [];
  private time: number = 0;
  private centerX: number;
  private centerY: number;

  constructor(context: RendererContext) {
    this.centerX = context.width / 2;
    this.centerY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Start with some glyphs
    for (let i = 0; i < 20; i++) {
      this.spawnGlyph();
    }
  }

  private spawnGlyph(): void {
    this.glyphs.push({
      angle: randomRange(0, Math.PI * 2),
      distance: 0,
      targetDistance: randomRange(50, 200),
      speed: randomRange(0.5, 2),
      size: randomRange(8, 20),
      shape: Math.floor(randomRange(0, 10)),
      hue: randomRange(0, 360),
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-1, 1),
      alpha: 1,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update center to follow cursor smoothly
    this.centerX += (input.x - this.centerX) * 3 * dt;
    this.centerY += (input.y - this.centerY) * 3 * dt;

    // Update glyphs
    this.glyphs.forEach((glyph) => {
      // Orbit around center
      glyph.angle += glyph.speed * dt * (1 + audio.rms);

      // Distance grows to target
      if (glyph.distance < glyph.targetDistance) {
        glyph.distance += 50 * dt;
      }

      // Rotation
      glyph.rotation += glyph.rotationSpeed * dt * (1 + audio.treble);

      // Hue shift
      glyph.hue = (glyph.hue + dt * 30 + audio.centroid * 50) % 360;

      // Pulse size with audio
      glyph.size *= 1 + (audio.beat ? 0.1 : -0.05 * dt);
      glyph.size = Math.max(5, Math.min(30, glyph.size));

      // Bass makes glyphs expand outward
      glyph.targetDistance += audio.bass * 30 * dt;
      glyph.targetDistance = Math.min(300, glyph.targetDistance);
    });

    // Click adds new glyphs
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        for (let i = 0; i < 5; i++) {
          this.spawnGlyph();
        }
      }
    });

    // Beat spawns glyphs
    if (audio.beat && this.glyphs.length < 100) {
      for (let i = 0; i < 3; i++) {
        this.spawnGlyph();
      }
    }

    // Remove distant glyphs
    this.glyphs = this.glyphs.filter(g => g.distance < 400);

    // Limit count
    if (this.glyphs.length > 120) {
      this.glyphs = this.glyphs.slice(-100);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw orbit paths
    this.graphics.lineStyle(1, 0xffffff, 0.1 + audio.rms * 0.1);
    for (let r = 50; r <= 300; r += 50) {
      this.graphics.drawCircle(this.centerX, this.centerY, r);
    }

    // Draw glyphs
    this.glyphs.forEach((glyph) => {
      const x = this.centerX + Math.cos(glyph.angle) * glyph.distance;
      const y = this.centerY + Math.sin(glyph.angle) * glyph.distance;

      const color = hslToHex(glyph.hue, 80, 60);

      // Draw different shapes for different "glyphs"
      this.drawGlyphShape(x, y, glyph.size, glyph.shape, glyph.rotation, color, glyph.alpha, audio);
    });

    // Draw center point
    const centerSize = 10 + Math.sin(this.time * 3) * 3 + audio.rms * 10;
    this.graphics.beginFill(0xffffff, 0.8);
    this.graphics.drawCircle(this.centerX, this.centerY, centerSize);
    this.graphics.endFill();

    // Center glow
    this.graphics.beginFill(hslToHex((this.time * 100) % 360, 100, 70), 0.3);
    this.graphics.drawCircle(this.centerX, this.centerY, centerSize * 2);
    this.graphics.endFill();
  }

  private drawGlyphShape(
    x: number,
    y: number,
    size: number,
    shape: number,
    rotation: number,
    color: number,
    alpha: number,
    audio: AudioData
  ): void {
    const glowAlpha = alpha * 0.3 * (1 + audio.rms * 0.5);
    
    // Glow
    this.graphics.beginFill(color, glowAlpha);
    this.graphics.drawCircle(x, y, size * 1.5);
    this.graphics.endFill();

    // Main shape
    switch (shape) {
      case 0: // Circle
        this.graphics.beginFill(color, alpha);
        this.graphics.drawCircle(x, y, size);
        this.graphics.endFill();
        break;

      case 1: // Square
        this.graphics.beginFill(color, alpha);
        this.drawRotatedRect(x, y, size * 2, size * 2, rotation);
        this.graphics.endFill();
        break;

      case 2: // Triangle
        this.graphics.beginFill(color, alpha);
        this.drawRotatedTriangle(x, y, size, rotation);
        this.graphics.endFill();
        break;

      case 3: // Star
        this.graphics.beginFill(color, alpha);
        this.drawStar(x, y, size, 5, rotation);
        this.graphics.endFill();
        break;

      case 4: // Plus
        this.graphics.lineStyle(3, color, alpha);
        this.graphics.moveTo(x - size, y);
        this.graphics.lineTo(x + size, y);
        this.graphics.moveTo(x, y - size);
        this.graphics.lineTo(x, y + size);
        break;

      case 5: // X
        this.graphics.lineStyle(3, color, alpha);
        const offset = size * 0.7;
        this.graphics.moveTo(x - offset, y - offset);
        this.graphics.lineTo(x + offset, y + offset);
        this.graphics.moveTo(x + offset, y - offset);
        this.graphics.lineTo(x - offset, y + offset);
        break;

      case 6: // Diamond
        this.graphics.beginFill(color, alpha);
        this.graphics.moveTo(x, y - size);
        this.graphics.lineTo(x + size, y);
        this.graphics.lineTo(x, y + size);
        this.graphics.lineTo(x - size, y);
        this.graphics.closePath();
        this.graphics.endFill();
        break;

      case 7: // Hexagon
        this.graphics.beginFill(color, alpha);
        for (let i = 0; i <= 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + rotation;
          const px = x + Math.cos(angle) * size;
          const py = y + Math.sin(angle) * size;
          if (i === 0) this.graphics.moveTo(px, py);
          else this.graphics.lineTo(px, py);
        }
        this.graphics.endFill();
        break;

      case 8: // Ring
        this.graphics.lineStyle(3, color, alpha);
        this.graphics.drawCircle(x, y, size);
        break;

      case 9: // Spiral
        this.graphics.lineStyle(2, color, alpha);
        let spiralR = 0;
        for (let a = 0; a < Math.PI * 4; a += 0.2) {
          spiralR = (a / (Math.PI * 4)) * size;
          const px = x + Math.cos(a + rotation) * spiralR;
          const py = y + Math.sin(a + rotation) * spiralR;
          if (a === 0) this.graphics.moveTo(px, py);
          else this.graphics.lineTo(px, py);
        }
        break;
    }
  }

  private drawRotatedRect(x: number, y: number, w: number, h: number, rotation: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const hw = w / 2;
    const hh = h / 2;

    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];

    corners.forEach((corner, i) => {
      const rx = corner.x * cos - corner.y * sin + x;
      const ry = corner.x * sin + corner.y * cos + y;
      if (i === 0) this.graphics.moveTo(rx, ry);
      else this.graphics.lineTo(rx, ry);
    });
    this.graphics.closePath();
  }

  private drawRotatedTriangle(x: number, y: number, size: number, rotation: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2 + rotation;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
    this.graphics.closePath();
  }

  private drawStar(x: number, y: number, size: number, points: number, rotation: number): void {
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 + rotation;
      const radius = i % 2 === 0 ? size : size * 0.5;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
    this.graphics.closePath();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

