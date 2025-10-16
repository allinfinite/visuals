import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { hslToHex } from '../utils/color';

interface Glyph {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string; // Visual representation
  hue: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

export class AudioPoetry implements Pattern {
  public name = 'Audio Poetry';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private glyphs: Glyph[] = [];
  private time: number = 0;
  private beatCount: number = 0;

  // Abstract "alphabet" represented as geometric patterns
  private readonly glyphShapes = [
    'I', 'O', 'X', 'V', 'W', 'Z', 'N', 'A', 'T', 'H',
    'L', 'U', 'Y', 'M', 'S', 'C', 'E', 'P', 'R', 'D'
  ];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  private spawnGlyph(audio: AudioData): void {
    const { width, height } = this.context;
    
    // Select char based on audio frequency - more varied selection
    const freqIndex = Math.floor(audio.centroid * this.glyphShapes.length + this.time * 2);
    const char = this.glyphShapes[freqIndex % this.glyphShapes.length];
    
    // Color from spectrum band with more variation
    const bandIndex = Math.floor(this.beatCount % audio.spectrum.length);
    const hue = (bandIndex / audio.spectrum.length) * 360 + audio.bass * 180 + this.time * 20;
    
    // Multiple spawn patterns for variety
    const pattern = Math.floor(Math.random() * 4);
    let x: number, y: number, vx: number, vy: number;
    
    switch (pattern) {
      case 0: // Rise from bottom
        x = randomRange(width * 0.1, width * 0.9);
        y = height + 50;
        vx = randomRange(-30, 30);
        vy = randomRange(-150, -80);
        break;
      case 1: // Fall from top
        x = randomRange(width * 0.1, width * 0.9);
        y = -50;
        vx = randomRange(-30, 30);
        vy = randomRange(50, 120);
        break;
      case 2: // Enter from left
        x = -50;
        y = randomRange(height * 0.2, height * 0.8);
        vx = randomRange(80, 150);
        vy = randomRange(-50, 50);
        break;
      case 3: // Enter from right
        x = width + 50;
        y = randomRange(height * 0.2, height * 0.8);
        vx = randomRange(-150, -80);
        vy = randomRange(-50, 50);
        break;
      default:
        x = width / 2;
        y = height / 2;
        vx = 0;
        vy = 0;
    }
    
    this.glyphs.push({
      x,
      y,
      vx,
      vy,
      char,
      hue,
      size: 20 + audio.rms * 40,
      alpha: 1,
      life: 0,
      maxLife: 3 + audio.rms * 2,
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-2, 2),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Beat spawns new glyph
    if (audio.beat) {
      this.beatCount++;
      this.spawnGlyph(audio);
      
      // Sometimes spawn multiple
      if (audio.bass > 0.7) {
        this.spawnGlyph(audio);
      }
    }

    // Auto-spawn with more variety (increased spawn rate for better coverage)
    const spawnChance = (audio.rms * dt * 4) + (dt * 0.3); // Base spawn + audio reactive
    if (Math.random() < spawnChance && this.glyphs.length < 60) {
      this.spawnGlyph(audio);
    }

    // Click spawns burst
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        for (let i = 0; i < 5; i++) {
          this.spawnGlyph(audio);
        }
      }
    });

    // Update glyphs
    this.glyphs.forEach((glyph) => {
      glyph.life += dt;

      // Apply velocity
      glyph.x += glyph.vx * dt;
      glyph.y += glyph.vy * dt;

      // Gentler gravity (reduced from 30 to 15)
      glyph.vy += 15 * dt;

      // Air resistance for more varied movement
      glyph.vx *= 0.99;
      glyph.vy *= 0.99;

      // Rotation
      glyph.rotation += glyph.rotationSpeed * dt;

      // Fade in and out smoothly
      const progress = glyph.life / glyph.maxLife;
      if (progress < 0.1) {
        glyph.alpha = progress / 0.1; // Fade in
      } else if (progress > 0.7) {
        glyph.alpha = (1 - progress) / 0.3; // Fade out
      } else {
        glyph.alpha = 1;
      }

      // Slower, smoother hue shifts (reduced from dt*30 + centroid*50)
      glyph.hue = (glyph.hue + dt * 15 + audio.treble * 20) % 360;

      // Gentler size pulses
      glyph.size *= 1 + (audio.beat ? 0.05 : -0.02 * dt);
      glyph.size = Math.max(10, Math.min(60, glyph.size));
    });

    // Remove dead glyphs
    this.glyphs = this.glyphs.filter((g) => g.life < g.maxLife);

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    this.glyphs.forEach((glyph) => {
      this.drawGlyph(glyph, audio);
    });

    // Draw beat counter in corner
    const { width } = this.context;
    const counterX = width - 100;
    const counterY = 50;
    
    // Draw abstract representation of beat count
    for (let i = 0; i < Math.min(10, this.beatCount % 20); i++) {
      const color = hslToHex((i / 10) * 360, 70, 50);
      this.graphics.beginFill(color, 0.5);
      this.graphics.drawCircle(counterX + i * 8, counterY, 3 + audio.rms * 2);
      this.graphics.endFill();
    }
  }

  private drawGlyph(glyph: Glyph, _audio: AudioData): void {
    const color = hslToHex(glyph.hue, 70, 50);
    const glowColor = hslToHex(glyph.hue, 100, 70);

    // Draw glow
    this.graphics.beginFill(glowColor, glyph.alpha * 0.3);
    this.graphics.drawCircle(glyph.x, glyph.y, glyph.size * 1.5);
    this.graphics.endFill();

    // Draw the "letter" shape
    switch (glyph.char) {
      case 'I':
        this.drawI(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'O':
        this.drawO(glyph.x, glyph.y, glyph.size, color, glyph.alpha);
        break;
      case 'X':
        this.drawX(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'V':
        this.drawV(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'W':
        this.drawW(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'Z':
        this.drawZ(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'N':
        this.drawN(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'A':
        this.drawA(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'T':
        this.drawT(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'H':
        this.drawH(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'L':
        this.drawL(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'U':
        this.drawU(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'Y':
        this.drawY(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'M':
        this.drawM(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'S':
        this.drawS(glyph.x, glyph.y, glyph.size, color, glyph.alpha);
        break;
      case 'C':
        this.drawC(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'E':
        this.drawE(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'P':
        this.drawP(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'R':
        this.drawR(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      case 'D':
        this.drawD(glyph.x, glyph.y, glyph.size, glyph.rotation, color, glyph.alpha);
        break;
      default:
        // Fallback: simple square
        this.graphics.lineStyle(glyph.size * 0.3, color, glyph.alpha);
        this.graphics.drawRect(glyph.x - glyph.size * 0.5, glyph.y - glyph.size * 0.5, glyph.size, glyph.size);
    }
  }

  // Simplified letter shapes using lines and polygons
  private drawI(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.5;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    const y1 = -h / 2;
    const y2 = h / 2;
    this.graphics.moveTo(x + y1 * sin, y + y1 * cos);
    this.graphics.lineTo(x + y2 * sin, y + y2 * cos);
  }

  private drawO(x: number, y: number, size: number, color: number, alpha: number): void {
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.drawCircle(x, y, size * 0.7);
  }

  private drawX(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const s = size * 0.7;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - s * cos - s * sin, y - s * sin + s * cos);
    this.graphics.lineTo(x + s * cos + s * sin, y + s * sin - s * cos);
    this.graphics.moveTo(x + s * cos - s * sin, y + s * sin + s * cos);
    this.graphics.lineTo(x - s * cos + s * sin, y - s * sin - s * cos);
  }

  private drawV(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - h * 0.5 * cos - h * 0.5 * sin, y - h * 0.5 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x, y + h * 0.5);
    this.graphics.lineTo(x + h * 0.5 * cos - h * 0.5 * sin, y + h * 0.5 * sin + h * 0.5 * cos);
  }

  private drawW(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.8;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - w * cos, y - w * sin);
    this.graphics.lineTo(x - w * 0.3 * cos + h * 0.5 * sin, y - w * 0.3 * sin - h * 0.5 * cos);
    this.graphics.lineTo(x, y);
    this.graphics.lineTo(x + w * 0.3 * cos + h * 0.5 * sin, y + w * 0.3 * sin - h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos, y + w * sin);
  }

  private drawZ(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const s = size * 0.8;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - s * cos - s * sin, y - s * sin + s * cos);
    this.graphics.lineTo(x + s * cos - s * sin, y + s * sin + s * cos);
    this.graphics.lineTo(x - s * cos + s * sin, y - s * sin - s * cos);
    this.graphics.lineTo(x + s * cos + s * sin, y + s * sin - s * cos);
  }

  private drawN(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.6;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - w * cos + h * 0.5 * sin, y - w * sin - h * 0.5 * cos);
    this.graphics.lineTo(x - w * cos - h * 0.5 * sin, y - w * sin + h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos + h * 0.5 * sin, y + w * sin - h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos - h * 0.5 * sin, y + w * sin + h * 0.5 * cos);
  }

  private drawA(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - h * 0.5 * cos + h * 0.5 * sin, y - h * 0.5 * sin - h * 0.5 * cos);
    this.graphics.lineTo(x, y - h * 0.5);
    this.graphics.lineTo(x + h * 0.5 * cos + h * 0.5 * sin, y + h * 0.5 * sin - h * 0.5 * cos);
    // Crossbar
    this.graphics.moveTo(x - h * 0.3 * cos, y - h * 0.3 * sin);
    this.graphics.lineTo(x + h * 0.3 * cos, y + h * 0.3 * sin);
  }

  private drawT(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.8;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    // Top bar
    this.graphics.moveTo(x - w * cos - h * 0.5 * sin, y - w * sin + h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos - h * 0.5 * sin, y + w * sin + h * 0.5 * cos);
    // Vertical
    this.graphics.moveTo(x - h * 0.5 * sin, y + h * 0.5 * cos);
    this.graphics.lineTo(x + h * 0.5 * sin, y - h * 0.5 * cos);
  }

  private drawH(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.6;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    // Left vertical
    this.graphics.moveTo(x - w * cos - h * 0.5 * sin, y - w * sin + h * 0.5 * cos);
    this.graphics.lineTo(x - w * cos + h * 0.5 * sin, y - w * sin - h * 0.5 * cos);
    // Right vertical
    this.graphics.moveTo(x + w * cos - h * 0.5 * sin, y + w * sin + h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos + h * 0.5 * sin, y + w * sin - h * 0.5 * cos);
    // Crossbar
    this.graphics.moveTo(x - w * cos, y - w * sin);
    this.graphics.lineTo(x + w * cos, y + w * sin);
  }

  private drawL(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.8;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - w * 0.5 * cos - h * 0.5 * sin, y - w * 0.5 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x - w * 0.5 * cos + h * 0.5 * sin, y - w * 0.5 * sin - h * 0.5 * cos);
    this.graphics.lineTo(x + w * 0.5 * cos + h * 0.5 * sin, y + w * 0.5 * sin - h * 0.5 * cos);
  }

  private drawU(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.6;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - w * cos - h * 0.5 * sin, y - w * sin + h * 0.5 * cos);
    this.graphics.lineTo(x - w * cos + h * 0.3 * sin, y - w * sin - h * 0.3 * cos);
    this.graphics.lineTo(x + h * 0.5 * sin, y - h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos + h * 0.3 * sin, y + w * sin - h * 0.3 * cos);
    this.graphics.lineTo(x + w * cos - h * 0.5 * sin, y + w * sin + h * 0.5 * cos);
  }

  private drawY(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - h * 0.5 * cos - h * 0.5 * sin, y - h * 0.5 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x, y);
    this.graphics.moveTo(x + h * 0.5 * cos - h * 0.5 * sin, y + h * 0.5 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x, y);
    this.graphics.lineTo(x + h * 0.5 * sin, y - h * 0.5 * cos);
  }

  private drawM(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.7;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    this.graphics.moveTo(x - w * cos + h * 0.5 * sin, y - w * sin - h * 0.5 * cos);
    this.graphics.lineTo(x - w * cos - h * 0.5 * sin, y - w * sin + h * 0.5 * cos);
    this.graphics.lineTo(x, y);
    this.graphics.lineTo(x + w * cos - h * 0.5 * sin, y + w * sin + h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos + h * 0.5 * sin, y + w * sin - h * 0.5 * cos);
  }

  private drawS(x: number, y: number, size: number, color: number, alpha: number): void {
    // Draw as a curved S shape using bezier approximation
    this.graphics.lineStyle(size * 0.3, color, alpha);
    const w = size * 0.6;
    const h = size * 1.2;
    
    this.graphics.moveTo(x + w, y - h * 0.4);
    this.graphics.bezierCurveTo(x - w, y - h * 0.4, x + w, y, x - w, y);
    this.graphics.bezierCurveTo(x + w, y, x - w, y + h * 0.4, x + w, y + h * 0.4);
  }

  private drawC(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    this.graphics.lineStyle(size * 0.3, color, alpha);
    // Draw arc approximation
    const radius = size * 0.7;
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 1.5 + Math.PI * 0.25; // 270 degrees arc
      const px = x + Math.cos(angle + rotation) * radius;
      const py = y + Math.sin(angle + rotation) * radius;
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
  }

  private drawE(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.8;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    // Vertical
    this.graphics.moveTo(x - w * 0.3 * cos - h * 0.5 * sin, y - w * 0.3 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x - w * 0.3 * cos + h * 0.5 * sin, y - w * 0.3 * sin - h * 0.5 * cos);
    // Top horizontal
    this.graphics.moveTo(x - w * 0.3 * cos - h * 0.5 * sin, y - w * 0.3 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x + w * 0.7 * cos - h * 0.5 * sin, y + w * 0.7 * sin + h * 0.5 * cos);
    // Middle horizontal
    this.graphics.moveTo(x - w * 0.3 * cos, y - w * 0.3 * sin);
    this.graphics.lineTo(x + w * 0.5 * cos, y + w * 0.5 * sin);
    // Bottom horizontal
    this.graphics.moveTo(x - w * 0.3 * cos + h * 0.5 * sin, y - w * 0.3 * sin - h * 0.5 * cos);
    this.graphics.lineTo(x + w * 0.7 * cos + h * 0.5 * sin, y + w * 0.7 * sin - h * 0.5 * cos);
  }

  private drawP(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.6;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    // Vertical
    this.graphics.moveTo(x - w * 0.3 * cos - h * 0.5 * sin, y - w * 0.3 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x - w * 0.3 * cos + h * 0.5 * sin, y - w * 0.3 * sin - h * 0.5 * cos);
    // Top horizontal
    this.graphics.moveTo(x - w * 0.3 * cos - h * 0.5 * sin, y - w * 0.3 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos - h * 0.5 * sin, y + w * sin + h * 0.5 * cos);
    // Right vertical (short)
    this.graphics.lineTo(x + w * cos, y + w * sin);
    // Bottom horizontal
    this.graphics.lineTo(x - w * 0.3 * cos, y - w * 0.3 * sin);
  }

  private drawR(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.6;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    // Vertical
    this.graphics.moveTo(x - w * 0.3 * cos - h * 0.5 * sin, y - w * 0.3 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x - w * 0.3 * cos + h * 0.5 * sin, y - w * 0.3 * sin - h * 0.5 * cos);
    // Top horizontal
    this.graphics.moveTo(x - w * 0.3 * cos - h * 0.5 * sin, y - w * 0.3 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x + w * cos - h * 0.5 * sin, y + w * sin + h * 0.5 * cos);
    // Right vertical (short)
    this.graphics.lineTo(x + w * cos, y + w * sin);
    // Bottom horizontal
    this.graphics.lineTo(x - w * 0.3 * cos, y - w * 0.3 * sin);
    // Diagonal leg
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + w * cos + h * 0.5 * sin, y + w * sin - h * 0.5 * cos);
  }

  private drawD(x: number, y: number, size: number, rotation: number, color: number, alpha: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const h = size * 1.2;
    const w = size * 0.6;
    
    this.graphics.lineStyle(size * 0.3, color, alpha);
    // Vertical
    this.graphics.moveTo(x - w * 0.5 * cos - h * 0.5 * sin, y - w * 0.5 * sin + h * 0.5 * cos);
    this.graphics.lineTo(x - w * 0.5 * cos + h * 0.5 * sin, y - w * 0.5 * sin - h * 0.5 * cos);
    // Curved right side (approximated with arc)
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI - Math.PI / 2 + rotation;
      const px = x + Math.cos(angle) * w + h * (i / segments - 0.5) * sin;
      const py = y + Math.sin(angle) * w - h * (i / segments - 0.5) * cos;
      if (i === 0) this.graphics.moveTo(x - w * 0.5 * cos - h * 0.5 * sin, y - w * 0.5 * sin + h * 0.5 * cos);
      this.graphics.lineTo(px, py);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

