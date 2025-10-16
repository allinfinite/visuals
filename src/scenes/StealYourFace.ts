import { Container, Graphics, Sprite, Texture, utils } from 'pixi.js';
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
  sprite?: Sprite;
}

export class StealYourFace implements Pattern {
  public name = 'Steal Your Face';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private logos: StealYourFaceLogo[] = [];
  private time: number = 0;
  private centerLogo: StealYourFaceLogo;
  private svgTexture?: Texture;


  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Load the SVG texture
    this.loadSVGTexture();

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

  private loadSVGTexture(): void {
    // Load the complete SVG from the file
    fetch('/stealy.svg')
      .then(response => response.text())
      .then(svgContent => {
        // Create SVG data URL from the complete SVG file content
        const svgData = `data:image/svg+xml;base64,${btoa(svgContent)}`;
        this.svgTexture = Texture.from(svgData);
      })
      .catch(error => {
        console.error('Failed to load SVG:', error);
        // Fallback to a simple version if loading fails
        this.createFallbackSVG();
      });
  }

  private createFallbackSVG(): void {
    // Simple fallback SVG if the main one fails to load
    const svgData = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 510">
<path d="M0 0 C161.04 0 322.08 0 488 0 C488 168.3 488 336.6 488 510 C326.96 510 165.92 510 0 510 C0 341.7 0 173.4 0 0 Z" fill="#0B0A0B"/>
<path d="M214 32 C211.54 32.28 209.08 32.55 206.63 32.81 C197.84 33.98 189.44 36.38 181 39 C138.95 52.31 101.52 80.05 76 113 C59.40 134.53 48.62 155.35 41.43 177.67 C34.54 197.58 33.80 202.46 33 207.38 C28.68 306.02 50.51 357.38 86 398 C193.20 469.40 249.40 475.16 301 460 C334.22 450.65 361.82 434.93 385 415 C408.62 394.65 424.76 371.70 438 347 C458.67 308.67 465.51 262.99 461 222 C458.29 203.08 455.65 192.29 451.83 181.41 C442.92 153.30 430.94 132.85 417 114 C375 73 C340.31 50.83 332.77 47.93 325 45 C302.74 36.81 291.11 34.66 279.28 32.49 C266.59 29.71 258.01 29.81 249.52 29.81 C233.13 29.74 223.72 30.63 214 32 Z" fill="#FEFEFE"/>
</svg>
    `)}`;
    this.svgTexture = Texture.from(svgData);
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
    if (!this.svgTexture) return;

    const size = 150 * logo.scale;
    
    // Create sprite if it doesn't exist
    if (!logo.sprite) {
      logo.sprite = new Sprite(this.svgTexture);
      logo.sprite.anchor.set(0.5);
      this.container.addChild(logo.sprite);
    }

    // Position and transform the sprite
    logo.sprite.x = logo.x;
    logo.sprite.y = logo.y;
    logo.sprite.scale.set(logo.scale * 0.3); // Scale down the SVG
    logo.sprite.rotation = logo.rotation;
    logo.sprite.alpha = alpha;

    // Apply color shifting using tint
    const colorShift = logo.colorShift / 360;
    const tint = utils.rgb2hex([
      Math.sin(colorShift * Math.PI * 2 + 0) * 0.5 + 0.5,
      Math.sin(colorShift * Math.PI * 2 + 2.094) * 0.5 + 0.5,
      Math.sin(colorShift * Math.PI * 2 + 4.188) * 0.5 + 0.5
    ]);
    logo.sprite.tint = tint;

    // Add psychedelic effects around the logo
    this.drawPsychedelicEffects(logo, size, alpha, audio);
  }

  private drawPsychedelicEffects(logo: StealYourFaceLogo, size: number, alpha: number, audio: AudioData): void {
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
        const trailStartX = logo.x;
        const trailStartY = logo.y;
        const trailEndX = logo.x + Math.cos(trailAngle) * trailLength;
        const trailEndY = logo.y + Math.sin(trailAngle) * trailLength;
        
        this.graphics.lineStyle(3, hslToHex((logo.colorShift + i * 72) % 360, 90, 60), alpha * 0.6);
        this.graphics.moveTo(trailStartX, trailStartY);
        this.graphics.lineTo(trailEndX, trailEndY);
        this.graphics.lineStyle(0);
      }
    }
  }

  public destroy(): void {
    // Clean up sprites
    this.logos.forEach(logo => {
      if (logo.sprite) {
        logo.sprite.destroy();
      }
    });
    
    this.graphics.destroy();
    this.container.destroy();
  }
}

