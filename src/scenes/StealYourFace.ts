import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface StealYourFaceLogo {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  pulsePhase: number;
  colorShift: number;
  morphPhase: number;
  lightningPhase: number;
  eyeGlowPhase: number;
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
      morphPhase: 0,
      lightningPhase: 0,
      eyeGlowPhase: 0,
    };

    // Add some orbiting logos
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      this.logos.push({
        x: context.width / 2 + Math.cos(angle) * 300,
        y: context.height / 2 + Math.sin(angle) * 300,
        scale: 0.3,
        rotation: angle,
        pulsePhase: i * Math.PI / 2,
        colorShift: i * 90,
        morphPhase: i * Math.PI / 4,
        lightningPhase: i * Math.PI / 3,
        eyeGlowPhase: i * Math.PI / 6,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update center logo with enhanced audio reactivity
    this.centerLogo.rotation += dt * 0.15 * (1 + audio.treble * 0.5);
    this.centerLogo.pulsePhase += dt * 2;
    this.centerLogo.morphPhase += dt * 1.2 * (1 + audio.rms * 0.3);
    this.centerLogo.lightningPhase += dt * 3 * (1 + (audio.beat ? 2 : 0));
    this.centerLogo.eyeGlowPhase += dt * 4 * (1 + audio.bass * 0.4);
    
    // Dynamic scaling with audio
    const baseScale = 1 + Math.sin(this.centerLogo.pulsePhase) * 0.08;
    this.centerLogo.scale = baseScale + audio.bass * 0.3 + (audio.beat ? 0.2 : 0);
    
    // Color shifting
    this.centerLogo.colorShift = (this.time * 25 + audio.centroid * 80) % 360;

    // Update orbiting logos with complex motion
    this.logos.forEach((logo, i) => {
      const orbitAngle = this.time * (0.15 + i * 0.03) + i * Math.PI * 2 / 4;
      const orbitRadius = 300 + Math.sin(this.time * 0.3 + i) * 50 + audio.mid * 80;
      
      logo.x = this.context.width / 2 + Math.cos(orbitAngle) * orbitRadius;
      logo.y = this.context.height / 2 + Math.sin(orbitAngle) * orbitRadius;
      
      logo.rotation += dt * (0.4 + audio.rms * 0.3);
      logo.pulsePhase += dt * (2.5 + audio.treble * 0.5);
      logo.morphPhase += dt * 1.8;
      logo.lightningPhase += dt * 4;
      logo.eyeGlowPhase += dt * 5;
      
      const orbitScale = 0.3 + Math.sin(logo.pulsePhase) * 0.1;
      logo.scale = orbitScale + audio.bass * 0.15;
      logo.colorShift = (i * 90 + this.time * 20 + audio.centroid * 60) % 360;
    });

    // Click spawns new logo with enhanced effects
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.logos.length < 12) {
        this.logos.push({
          x: click.x,
          y: click.y,
          scale: 0.2,
          rotation: Math.random() * Math.PI * 2,
          pulsePhase: Math.random() * Math.PI * 2,
          colorShift: Math.random() * 360,
          morphPhase: Math.random() * Math.PI * 2,
          lightningPhase: Math.random() * Math.PI * 2,
          eyeGlowPhase: Math.random() * Math.PI * 2,
        });
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw orbiting logos first
    this.logos.forEach((logo, i) => {
      this.drawStealYourFace(logo, audio, 0.7, i);
    });

    // Draw center logo on top
    this.drawStealYourFace(this.centerLogo, audio, 1, -1);
  }

  private drawStealYourFace(logo: StealYourFaceLogo, audio: AudioData, alpha: number, _index: number): void {
    const size = 150 * logo.scale;
    const cos = Math.cos(logo.rotation);
    const sin = Math.sin(logo.rotation);

    // Transform coordinates
    const transform = (x: number, y: number) => ({
      x: logo.x + (x * cos - y * sin),
      y: logo.y + (x * sin + y * cos),
    });

    // Dynamic color shifting
    const redHue = (0 + logo.colorShift) % 360;
    const blueHue = (240 + logo.colorShift) % 360;
    const morphIntensity = 0.3 + Math.sin(logo.morphPhase) * 0.2;

    // Outer circle border with morphing
    const borderSize = size * (0.55 + morphIntensity * 0.1);
    this.graphics.lineStyle(4 + Math.sin(logo.pulsePhase) * 2, 0x1a1a2e, alpha);
    this.graphics.beginFill(0x000000, 0);
    this.graphics.drawCircle(logo.x, logo.y, borderSize);
    this.graphics.endFill();
    this.graphics.lineStyle(0);

    // Dynamic left half - Red background with morphing
    const redColor = hslToHex(redHue, 90, 60);
    this.graphics.beginFill(redColor, alpha * (0.9 + morphIntensity));
    this.graphics.moveTo(logo.x, logo.y - size * 0.5);
    this.graphics.lineTo(logo.x, logo.y + size * 0.5);
    this.graphics.arc(logo.x, logo.y, size * 0.5, Math.PI / 2, -Math.PI / 2);
    this.graphics.closePath();
    this.graphics.endFill();

    // Dynamic right half - Blue background with morphing
    const blueColor = hslToHex(blueHue, 90, 60);
    this.graphics.beginFill(blueColor, alpha * (0.9 + morphIntensity));
    this.graphics.moveTo(logo.x, logo.y - size * 0.5);
    this.graphics.lineTo(logo.x, logo.y + size * 0.5);
    this.graphics.arc(logo.x, logo.y, size * 0.5, -Math.PI / 2, Math.PI / 2);
    this.graphics.closePath();
    this.graphics.endFill();

    // Draw morphing skull
    this.drawMorphingSkull(logo, size, alpha, audio, transform);

    // Draw dynamic lightning bolt
    this.drawDynamicLightningBolt(logo, size, alpha, audio, transform);

    // Add psychedelic effects
    this.drawPsychedelicEffects(logo, size, alpha, audio, transform);
  }

  private drawMorphingSkull(logo: StealYourFaceLogo, size: number, alpha: number, audio: AudioData, transform: (x: number, y: number) => {x: number, y: number}): void {
    // Morphing skull shape
    const morphFactor = Math.sin(logo.morphPhase) * 0.3;
    const skullDistortion = 1 + morphFactor;
    
    // Skull outline (black)
    this.graphics.lineStyle(3 + Math.sin(logo.pulsePhase), 0x000000, alpha);
    
    // Skull dome with morphing
    this.graphics.beginFill(0xffffff, alpha);
    
    const skullPoints = [
      { x: 0, y: -size * 0.25 * skullDistortion },
      { x: -size * 0.35 * skullDistortion, y: -size * 0.15 },
      { x: -size * 0.4 * skullDistortion, y: 0 },
      { x: -size * 0.35 * skullDistortion, y: size * 0.15 },
      { x: -size * 0.25 * skullDistortion, y: size * 0.25 },
      { x: size * 0.25 * skullDistortion, y: size * 0.25 },
      { x: size * 0.35 * skullDistortion, y: size * 0.15 },
      { x: size * 0.4 * skullDistortion, y: 0 },
      { x: size * 0.35 * skullDistortion, y: -size * 0.15 },
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

    // Morphing eye sockets with enhanced glow
    const eyeGlowIntensity = 0.4 + Math.sin(logo.eyeGlowPhase) * 0.3 + (audio.beat ? 0.3 : 0);
    
    // Left eye with dynamic glow
    const leftEye = transform(-size * 0.15, -size * 0.08);
    this.graphics.beginFill(0x000000, alpha);
    this.graphics.drawEllipse(leftEye.x, leftEye.y, size * 0.08, size * 0.06);
    this.graphics.endFill();
    
    // Left eye glow
    this.graphics.beginFill(hslToHex(0, 100, 70), alpha * eyeGlowIntensity);
    this.graphics.drawCircle(leftEye.x, leftEye.y, size * 0.06);
    this.graphics.endFill();
    
    // Right eye with dynamic glow
    const rightEye = transform(size * 0.15, -size * 0.08);
    this.graphics.beginFill(0x000000, alpha);
    this.graphics.drawEllipse(rightEye.x, rightEye.y, size * 0.08, size * 0.06);
    this.graphics.endFill();
    
    // Right eye glow
    this.graphics.beginFill(hslToHex(240, 100, 70), alpha * eyeGlowIntensity);
    this.graphics.drawCircle(rightEye.x, rightEye.y, size * 0.06);
    this.graphics.endFill();

    // Morphing nose cavity
    this.graphics.beginFill(0x000000, alpha);
    const noseTop = transform(0, -size * 0.02);
    const noseLeft = transform(-size * 0.04 * skullDistortion, size * 0.04);
    const noseRight = transform(size * 0.04 * skullDistortion, size * 0.04);
    
    this.graphics.moveTo(noseTop.x, noseTop.y);
    this.graphics.lineTo(noseLeft.x, noseLeft.y);
    this.graphics.lineTo(noseRight.x, noseRight.y);
    this.graphics.closePath();
    this.graphics.endFill();

    // Morphing teeth
    this.graphics.beginFill(0xffffff, alpha);
    const teethCount = 6;
    for (let i = 0; i < teethCount; i++) {
      const toothX = (i - teethCount / 2) * size * 0.08;
      const tooth = transform(toothX, size * 0.18);
      const toothWidth = size * (0.05 + morphFactor * 0.02);
      const toothHeight = size * (0.08 + morphFactor * 0.03);
      this.graphics.drawRect(tooth.x - toothWidth / 2, tooth.y, toothWidth, toothHeight);
    }
    this.graphics.endFill();

    // Teeth separators
    this.graphics.lineStyle(1 + morphFactor, 0x000000, alpha);
    for (let i = 0; i < teethCount - 1; i++) {
      const separatorX = (i - teethCount / 2 + 0.5) * size * 0.08;
      const top = transform(separatorX, size * 0.18);
      const bottom = transform(separatorX, size * 0.26);
      this.graphics.moveTo(top.x, top.y);
      this.graphics.lineTo(bottom.x, bottom.y);
    }
    this.graphics.lineStyle(0);
  }

  private drawDynamicLightningBolt(logo: StealYourFaceLogo, size: number, alpha: number, audio: AudioData, transform: (x: number, y: number) => {x: number, y: number}): void {
    // Dynamic lightning bolt with morphing
    const lightningIntensity = 0.6 + Math.sin(logo.lightningPhase) * 0.4 + (audio.beat ? 0.4 : 0);
    const morphFactor = Math.sin(logo.morphPhase * 1.5) * 0.2;
    
    // Lightning bolt path with morphing
    const boltPoints = [
      { x: 0, y: -size * 0.4 },
      { x: size * (0.08 + morphFactor), y: -size * 0.25 },
      { x: -size * (0.06 + morphFactor), y: -size * 0.1 },
      { x: size * (0.1 + morphFactor), y: 0 },
      { x: -size * (0.04 + morphFactor), y: size * 0.1 },
      { x: size * (0.08 + morphFactor), y: size * 0.25 },
      { x: 0, y: size * 0.35 },
    ];

    // Lightning bolt outline (black)
    this.graphics.lineStyle(4 + Math.sin(logo.lightningPhase) * 2, 0x000000, alpha);
    
    // Lightning bolt fill (white with glow)
    this.graphics.beginFill(0xffffff, alpha * lightningIntensity);
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

    // Dynamic lightning flash with color shifting
    if (audio.beat || audio.treble > 0.6) {
      const flashIntensity = 0.5 + Math.sin(logo.lightningPhase * 2) * 0.3;
      const flashColor = hslToHex((logo.colorShift + 60) % 360, 100, 80);
      
      // Bright flash overlay
      this.graphics.beginFill(flashColor, alpha * flashIntensity);
      boltPoints.forEach((p, i) => {
        const t = transform(p.x * 0.7, p.y * 0.7);
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

  private drawPsychedelicEffects(logo: StealYourFaceLogo, size: number, alpha: number, audio: AudioData, transform: (x: number, y: number) => {x: number, y: number}): void {
    // Add psychedelic aura around the logo
    const auraIntensity = 0.2 + Math.sin(logo.pulsePhase * 2) * 0.1 + audio.rms * 0.3;
    
    // Outer aura rings
    for (let i = 0; i < 3; i++) {
      const ringRadius = size * (0.7 + i * 0.1);
      const ringAlpha = alpha * auraIntensity * (0.5 - i * 0.1);
      const ringColor = hslToHex((logo.colorShift + i * 60) % 360, 80, 70);
      
      this.graphics.lineStyle(2, ringColor, ringAlpha);
      this.graphics.drawCircle(logo.x, logo.y, ringRadius);
    }
    this.graphics.lineStyle(0);

    // Add sparkles on beats
    if (audio.beat) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + this.time;
        const distance = size * (0.6 + Math.random() * 0.3);
        const sparkleX = logo.x + Math.cos(angle) * distance;
        const sparkleY = logo.y + Math.sin(angle) * distance;
        
        const sparkleColor = hslToHex((logo.colorShift + i * 45) % 360, 100, 80);
        this.graphics.beginFill(sparkleColor, alpha * 0.8);
        this.graphics.drawCircle(sparkleX, sparkleY, 3 + Math.random() * 3);
        this.graphics.endFill();
      }
    }

    // Add energy trails
    if (audio.treble > 0.7) {
      for (let i = 0; i < 5; i++) {
        const trailAngle = logo.rotation + i * Math.PI / 3;
        const trailLength = size * 0.8;
        const trailStart = transform(0, 0);
        const trailEnd = transform(
          Math.cos(trailAngle) * trailLength,
          Math.sin(trailAngle) * trailLength
        );
        
        this.graphics.lineStyle(3, hslToHex((logo.colorShift + i * 72) % 360, 90, 60), alpha * 0.6);
        this.graphics.moveTo(trailStart.x, trailStart.y);
        this.graphics.lineTo(trailEnd.x, trailEnd.y);
        this.graphics.lineStyle(0);
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

