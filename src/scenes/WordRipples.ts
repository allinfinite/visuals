import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  hue: number;
  alpha: number;
  frequency: number; // Wave frequency
}

interface Glyph {
  x: number;
  y: number;
  baseX: number; // Original position
  baseY: number;
  char: string;
  size: number;
  hue: number;
  alpha: number;
  rotation: number;
}

export class WordRipples implements Pattern {
  public name = 'Word Ripples';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private ripples: Ripple[] = [];
  private glyphs: Glyph[] = [];
  private time: number = 0;

  // Abstract "word" shapes
  private readonly glyphShapes = [
    'O', 'I', 'X', '+', '=', '-', '/', '\\', 'V', '^',
    '<', '>', '*', '#', '~', 'Y', 'T', 'H', 'A', 'E'
  ];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize glyphs in a grid pattern (like text)
    this.initializeGlyphs();
  }

  private initializeGlyphs(): void {
    const { width, height } = this.context;
    const cols = 12;
    const rows = 8;
    const spacingX = width / (cols + 1);
    const spacingY = height / (rows + 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = spacingX * (col + 1);
        const y = spacingY * (row + 1);
        
        this.glyphs.push({
          x,
          y,
          baseX: x,
          baseY: y,
          char: this.glyphShapes[Math.floor(Math.random() * this.glyphShapes.length)],
          size: 15 + Math.random() * 10,
          hue: (col / cols) * 360,
          alpha: 0.7 + Math.random() * 0.3,
          rotation: 0,
        });
      }
    }
  }

  private spawnRipple(x: number, y: number, audio: AudioData): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 200 + audio.rms * 300,
      speed: 150 + audio.treble * 200,
      hue: (Math.random() * 360 + audio.centroid * 180) % 360,
      alpha: 0.8,
      frequency: 3 + audio.bass * 5, // Number of wave cycles
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Click spawns ripple
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.spawnRipple(click.x, click.y, audio);
      }
    });

    // Beat spawns ripple at random glyph
    if (audio.beat && this.glyphs.length > 0) {
      const randomGlyph = this.glyphs[Math.floor(Math.random() * this.glyphs.length)];
      this.spawnRipple(randomGlyph.baseX, randomGlyph.baseY, audio);
    }

    // Auto-spawn ripples based on audio
    const spawnChance = audio.rms * dt * 2;
    if (Math.random() < spawnChance && this.ripples.length < 10) {
      const { width, height } = this.context;
      this.spawnRipple(
        randomRange(width * 0.2, width * 0.8),
        randomRange(height * 0.2, height * 0.8),
        audio
      );
    }

    // Update ripples
    this.ripples.forEach((ripple) => {
      ripple.radius += ripple.speed * dt;
      
      // Fade out as radius approaches max
      const progress = ripple.radius / ripple.maxRadius;
      ripple.alpha = Math.max(0, 1 - progress);
    });

    // Remove completed ripples
    this.ripples = this.ripples.filter((r) => r.radius < r.maxRadius);

    // Update glyphs - apply ripple displacement
    this.glyphs.forEach((glyph) => {
      // Reset to base position
      let totalDisplacementX = 0;
      let totalDisplacementY = 0;
      let totalRotation = 0;

      // Calculate displacement from all ripples
      this.ripples.forEach((ripple) => {
        const dx = glyph.baseX - ripple.x;
        const dy = glyph.baseY - ripple.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if glyph is within ripple range
        const rippleThickness = 50;
        if (dist >= ripple.radius - rippleThickness && dist <= ripple.radius + rippleThickness) {
          // Calculate wave phase based on distance
          const wavePhase = (dist / ripple.maxRadius) * Math.PI * 2 * ripple.frequency;
          const waveAmplitude = 20 * ripple.alpha * audio.rms;
          
          // Sine wave displacement
          const displacement = Math.sin(wavePhase + this.time * 5) * waveAmplitude;
          
          // Direction perpendicular to ripple
          const angle = Math.atan2(dy, dx);
          totalDisplacementX += Math.cos(angle + Math.PI / 2) * displacement;
          totalDisplacementY += Math.sin(angle + Math.PI / 2) * displacement;
          
          // Rotation effect
          totalRotation += Math.sin(wavePhase) * ripple.alpha * 0.5;
        }
      });

      // Apply displacement with smoothing
      const smoothing = 5 * dt;
      glyph.x += (glyph.baseX + totalDisplacementX - glyph.x) * smoothing;
      glyph.y += (glyph.baseY + totalDisplacementY - glyph.y) * smoothing;
      glyph.rotation += (totalRotation - glyph.rotation) * smoothing;

      // Hue shifts with audio
      glyph.hue = (glyph.hue + dt * 20 + audio.centroid * 30) % 360;

      // Size pulses with audio
      glyph.size *= 1 + (audio.beat ? 0.1 : -0.05 * dt);
      glyph.size = Math.max(10, Math.min(30, glyph.size));
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw ripples
    this.ripples.forEach((ripple) => {
      const color = hslToHex(ripple.hue, 70, 50);
      const glowColor = hslToHex(ripple.hue, 100, 70);

      // Draw multiple wave rings
      for (let i = 0; i < ripple.frequency; i++) {
        const offset = (i / ripple.frequency) * (ripple.maxRadius / ripple.frequency);
        const ringRadius = ripple.radius + offset;
        
        if (ringRadius < ripple.maxRadius) {
          const ringAlpha = ripple.alpha * (1 - i / ripple.frequency) * 0.5;
          
          // Glow
          this.graphics.lineStyle(4 + audio.rms * 3, glowColor, ringAlpha * 0.3);
          this.graphics.drawCircle(ripple.x, ripple.y, ringRadius);
          
          // Core line
          this.graphics.lineStyle(2, color, ringAlpha);
          this.graphics.drawCircle(ripple.x, ripple.y, ringRadius);
        }
      }

      // Center point
      this.graphics.beginFill(glowColor, ripple.alpha * 0.5);
      this.graphics.drawCircle(ripple.x, ripple.y, 5 + audio.rms * 5);
      this.graphics.endFill();
    });

    // Draw glyphs (displaced by ripples)
    this.glyphs.forEach((glyph) => {
      this.drawGlyph(glyph, audio);
    });

    // Draw grid lines (faint) to show text-like structure
    const { width, height } = this.context;
    const gridAlpha = 0.05 + audio.rms * 0.1;
    this.graphics.lineStyle(1, 0xffffff, gridAlpha);
    
    // Horizontal lines
    for (let i = 0; i < 9; i++) {
      const y = (height / 9) * i;
      this.graphics.moveTo(0, y);
      this.graphics.lineTo(width, y);
    }
    
    // Vertical lines
    for (let i = 0; i < 13; i++) {
      const x = (width / 13) * i;
      this.graphics.moveTo(x, 0);
      this.graphics.lineTo(x, height);
    }
  }

  private drawGlyph(glyph: Glyph, _audio: AudioData): void {
    const color = hslToHex(glyph.hue, 70, 50);
    const glowColor = hslToHex(glyph.hue, 100, 70);

    // Glow
    this.graphics.beginFill(glowColor, glyph.alpha * 0.3);
    this.graphics.drawCircle(glyph.x, glyph.y, glyph.size * 1.5);
    this.graphics.endFill();

    // Draw simplified glyph shape
    const lineWidth = Math.max(2, glyph.size * 0.2);
    this.graphics.lineStyle(lineWidth, color, glyph.alpha);

    const s = glyph.size * 0.8;
    const cos = Math.cos(glyph.rotation);
    const sin = Math.sin(glyph.rotation);

    switch (glyph.char) {
      case 'O':
        this.graphics.drawCircle(glyph.x, glyph.y, s);
        break;

      case 'I':
        this.graphics.moveTo(glyph.x, glyph.y - s);
        this.graphics.lineTo(glyph.x, glyph.y + s);
        break;

      case 'X':
        this.graphics.moveTo(glyph.x - s * cos, glyph.y - s * sin);
        this.graphics.lineTo(glyph.x + s * cos, glyph.y + s * sin);
        this.graphics.moveTo(glyph.x + s * cos, glyph.y - s * sin);
        this.graphics.lineTo(glyph.x - s * cos, glyph.y + s * sin);
        break;

      case '+':
        this.graphics.moveTo(glyph.x - s, glyph.y);
        this.graphics.lineTo(glyph.x + s, glyph.y);
        this.graphics.moveTo(glyph.x, glyph.y - s);
        this.graphics.lineTo(glyph.x, glyph.y + s);
        break;

      case '=':
        this.graphics.moveTo(glyph.x - s, glyph.y - s * 0.3);
        this.graphics.lineTo(glyph.x + s, glyph.y - s * 0.3);
        this.graphics.moveTo(glyph.x - s, glyph.y + s * 0.3);
        this.graphics.lineTo(glyph.x + s, glyph.y + s * 0.3);
        break;

      case '-':
        this.graphics.moveTo(glyph.x - s, glyph.y);
        this.graphics.lineTo(glyph.x + s, glyph.y);
        break;

      case '/':
        this.graphics.moveTo(glyph.x - s * 0.5, glyph.y + s);
        this.graphics.lineTo(glyph.x + s * 0.5, glyph.y - s);
        break;

      case '\\':
        this.graphics.moveTo(glyph.x - s * 0.5, glyph.y - s);
        this.graphics.lineTo(glyph.x + s * 0.5, glyph.y + s);
        break;

      case 'V':
      case '^':
        const dir = glyph.char === 'V' ? 1 : -1;
        this.graphics.moveTo(glyph.x - s, glyph.y - s * dir);
        this.graphics.lineTo(glyph.x, glyph.y + s * dir);
        this.graphics.lineTo(glyph.x + s, glyph.y - s * dir);
        break;

      case '<':
      case '>':
        const dirX = glyph.char === '<' ? -1 : 1;
        this.graphics.moveTo(glyph.x + s * dirX, glyph.y - s);
        this.graphics.lineTo(glyph.x - s * dirX, glyph.y);
        this.graphics.lineTo(glyph.x + s * dirX, glyph.y + s);
        break;

      case '*':
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + glyph.rotation;
          const x1 = glyph.x + Math.cos(angle) * s;
          const y1 = glyph.y + Math.sin(angle) * s;
          const x2 = glyph.x - Math.cos(angle) * s;
          const y2 = glyph.y - Math.sin(angle) * s;
          this.graphics.moveTo(x1, y1);
          this.graphics.lineTo(x2, y2);
        }
        break;

      default:
        // Default: small filled circle
        this.graphics.beginFill(color, glyph.alpha);
        this.graphics.drawCircle(glyph.x, glyph.y, s * 0.5);
        this.graphics.endFill();
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

