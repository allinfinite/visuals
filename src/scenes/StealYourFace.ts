import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface StealYourFaceLogo {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  pulsePhase: number;
  colorShift: number;
}

export class StealYourFace implements Pattern {
  public name = 'Steal Your Face';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private logos: StealYourFaceLogo[] = [];
  private time: number = 0;
  private centerLogo: StealYourFaceLogo;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Main center logo
    this.centerLogo = {
      x: context.width / 2,
      y: context.height / 2,
      scale: 1,
      rotation: 0,
      pulsePhase: 0,
      colorShift: 0,
    };

    // Add some orbiting logos
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      this.logos.push({
        x: context.width / 2 + Math.cos(angle) * 250,
        y: context.height / 2 + Math.sin(angle) * 250,
        scale: 0.4,
        rotation: angle,
        pulsePhase: i * Math.PI / 2,
        colorShift: i * 120,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update center logo
    this.centerLogo.rotation += dt * 0.1 * (1 + audio.treble * 0.3);
    this.centerLogo.pulsePhase += dt * 1.5;
    this.centerLogo.scale = 1 + Math.sin(this.centerLogo.pulsePhase) * 0.05 + audio.bass * 0.15;
    this.centerLogo.colorShift = (this.time * 20 + audio.centroid * 60) % 360;

    // Update orbiting logos
    this.logos.forEach((logo, i) => {
      const orbitAngle = this.time * (0.2 + i * 0.05) + i * Math.PI * 2 / 3;
      const orbitRadius = 250 + Math.sin(this.time * 0.5 + i) * 30 + audio.mid * 50;
      
      logo.x = this.context.width / 2 + Math.cos(orbitAngle) * orbitRadius;
      logo.y = this.context.height / 2 + Math.sin(orbitAngle) * orbitRadius;
      logo.rotation += dt * (0.3 + audio.rms * 0.2);
      logo.pulsePhase += dt * 1.8;
      logo.scale = 0.4 + Math.sin(logo.pulsePhase) * 0.08 + audio.bass * 0.1;
      logo.colorShift = (i * 120 + this.time * 15 + audio.centroid * 40) % 360;
    });

    // Click spawns new logo
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.logos.length < 8) {
        this.logos.push({
          x: click.x,
          y: click.y,
          scale: 0.3,
          rotation: Math.random() * Math.PI * 2,
          pulsePhase: Math.random() * Math.PI * 2,
          colorShift: Math.random() * 360,
        });
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw orbiting logos first
    this.logos.forEach((logo) => {
      this.drawStealYourFace(logo, audio, 0.8);
    });

    // Draw center logo on top
    this.drawStealYourFace(this.centerLogo, audio, 1);
  }

  private drawStealYourFace(logo: StealYourFaceLogo, audio: AudioData, alpha: number): void {
    const size = 120 * logo.scale;
    const cos = Math.cos(logo.rotation);
    const sin = Math.sin(logo.rotation);

    // Transform coordinates
    const transform = (x: number, y: number) => ({
      x: logo.x + (x * cos - y * sin),
      y: logo.y + (x * sin + y * cos),
    });

    // Color shift for variety
    const redHue = (0 + logo.colorShift) % 360;
    const blueHue = (240 + logo.colorShift) % 360;

    // Outer circle border
    this.graphics.lineStyle(3, 0x1a1a2e, alpha);
    this.graphics.beginFill(0x000000, 0);
    this.graphics.drawCircle(logo.x, logo.y, size * 0.52);
    this.graphics.endFill();
    this.graphics.lineStyle(0);

    // Left half - Red background
    this.graphics.beginFill(0xff0000, alpha);
    this.graphics.moveTo(logo.x, logo.y - size * 0.5);
    this.graphics.lineTo(logo.x, logo.y + size * 0.5);
    this.graphics.arc(logo.x, logo.y, size * 0.5, Math.PI / 2, -Math.PI / 2);
    this.graphics.closePath();
    this.graphics.endFill();

    // Right half - Blue background
    this.graphics.beginFill(0x0066cc, alpha);
    this.graphics.moveTo(logo.x, logo.y - size * 0.5);
    this.graphics.lineTo(logo.x, logo.y + size * 0.5);
    this.graphics.arc(logo.x, logo.y, size * 0.5, -Math.PI / 2, Math.PI / 2);
    this.graphics.closePath();
    this.graphics.endFill();

    // Draw skull
    this.drawClassicSkull(logo, size, alpha, audio);

    // Draw lightning bolt
    this.drawClassicLightningBolt(logo, size, alpha, audio);
  }

  private drawClassicSkull(logo: StealYourFaceLogo, size: number, alpha: number, audio: AudioData): void {
    const cos = Math.cos(logo.rotation);
    const sin = Math.sin(logo.rotation);

    // Transform coordinates
    const transform = (x: number, y: number) => ({
      x: logo.x + (x * cos - y * sin),
      y: logo.y + (x * sin + y * cos),
    });

    // Skull outline (black)
    this.graphics.lineStyle(2, 0x000000, alpha);
    
    // Skull dome (top half)
    this.graphics.beginFill(0xffffff, alpha);
    
    // Create skull shape
    const skullPoints = [
      { x: 0, y: -size * 0.25 },        // Top
      { x: -size * 0.35, y: -size * 0.15 }, // Left temple
      { x: -size * 0.4, y: 0 },        // Left cheek
      { x: -size * 0.35, y: size * 0.15 },  // Left jaw
      { x: -size * 0.25, y: size * 0.25 },  // Left chin
      { x: size * 0.25, y: size * 0.25 },   // Right chin
      { x: size * 0.35, y: size * 0.15 },   // Right jaw
      { x: size * 0.4, y: 0 },         // Right cheek
      { x: size * 0.35, y: -size * 0.15 },  // Right temple
    ];

    skullPoints.forEach((p, i) => {
      const t = transform(p.x, p.y);
      if (i === 0) {
        this.graphics.moveTo(t.x, t.y);
      } else {
        this.graphics.lineTo(t.x, t.y);
      }
    });
    this.graphics.closePath();
    this.graphics.endFill();

    // Eye sockets (black)
    this.graphics.beginFill(0x000000, alpha);
    
    // Left eye
    const leftEye = transform(-size * 0.15, -size * 0.08);
    this.graphics.drawEllipse(leftEye.x, leftEye.y, size * 0.08, size * 0.06);
    
    // Right eye
    const rightEye = transform(size * 0.15, -size * 0.08);
    this.graphics.drawEllipse(rightEye.x, rightEye.y, size * 0.08, size * 0.06);
    
    this.graphics.endFill();

    // Nose cavity (black triangle)
    this.graphics.beginFill(0x000000, alpha);
    const noseTop = transform(0, -size * 0.02);
    const noseLeft = transform(-size * 0.04, size * 0.04);
    const noseRight = transform(size * 0.04, size * 0.04);
    
    this.graphics.moveTo(noseTop.x, noseTop.y);
    this.graphics.lineTo(noseLeft.x, noseLeft.y);
    this.graphics.lineTo(noseRight.x, noseRight.y);
    this.graphics.closePath();
    this.graphics.endFill();

    // Teeth (white rectangles)
    this.graphics.beginFill(0xffffff, alpha);
    const teethCount = 6;
    for (let i = 0; i < teethCount; i++) {
      const toothX = (i - teethCount / 2) * size * 0.08;
      const tooth = transform(toothX, size * 0.18);
      this.graphics.drawRect(tooth.x - size * 0.025, tooth.y, size * 0.05, size * 0.08);
    }
    this.graphics.endFill();

    // Teeth separators (black lines)
    this.graphics.lineStyle(1, 0x000000, alpha);
    for (let i = 0; i < teethCount - 1; i++) {
      const separatorX = (i - teethCount / 2 + 0.5) * size * 0.08;
      const top = transform(separatorX, size * 0.18);
      const bottom = transform(separatorX, size * 0.26);
      this.graphics.moveTo(top.x, top.y);
      this.graphics.lineTo(bottom.x, bottom.y);
    }
    this.graphics.lineStyle(0);

    // Audio-reactive eye glow
    if (audio.beat) {
      const glowIntensity = 0.3 + Math.sin(logo.pulsePhase * 3) * 0.2;
      
      // Left eye glow
      this.graphics.beginFill(0xff0000, alpha * glowIntensity);
      this.graphics.drawCircle(leftEye.x, leftEye.y, size * 0.04);
      this.graphics.endFill();
      
      // Right eye glow
      this.graphics.beginFill(0x0066cc, alpha * glowIntensity);
      this.graphics.drawCircle(rightEye.x, rightEye.y, size * 0.04);
      this.graphics.endFill();
    }
  }

  private drawClassicLightningBolt(logo: StealYourFaceLogo, size: number, alpha: number, audio: AudioData): void {
    const cos = Math.cos(logo.rotation);
    const sin = Math.sin(logo.rotation);

    // Transform coordinates
    const transform = (x: number, y: number) => ({
      x: logo.x + (x * cos - y * sin),
      y: logo.y + (x * sin + y * cos),
    });

    // Lightning bolt path (classic zigzag)
    const boltPoints = [
      { x: 0, y: -size * 0.4 },        // Top
      { x: size * 0.08, y: -size * 0.25 },  // Right
      { x: -size * 0.06, y: -size * 0.1 },  // Left
      { x: size * 0.1, y: 0 },         // Right center
      { x: -size * 0.04, y: size * 0.1 },   // Left
      { x: size * 0.08, y: size * 0.25 },   // Right
      { x: 0, y: size * 0.35 },        // Bottom
    ];

    // Lightning bolt outline (black)
    this.graphics.lineStyle(3, 0x000000, alpha);
    
    // Lightning bolt fill (white)
    this.graphics.beginFill(0xffffff, alpha);
    boltPoints.forEach((p, i) => {
      const t = transform(p.x, p.y);
      if (i === 0) {
        this.graphics.moveTo(t.x, t.y);
      } else {
        this.graphics.lineTo(t.x, t.y);
      }
    });
    this.graphics.closePath();
    this.graphics.endFill();

    // Audio-reactive lightning flash
    if (audio.beat || audio.treble > 0.7) {
      const flashIntensity = 0.4 + Math.sin(logo.pulsePhase * 4) * 0.3;
      
      // Bright flash overlay
      this.graphics.beginFill(0xffff00, alpha * flashIntensity);
      boltPoints.forEach((p, i) => {
        const t = transform(p.x * 0.6, p.y * 0.6);
        if (i === 0) {
          this.graphics.moveTo(t.x, t.y);
        } else {
          this.graphics.lineTo(t.x, t.y);
        }
      });
      this.graphics.closePath();
      this.graphics.endFill();
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

