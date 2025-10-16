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
    // Create SVG data URL from the actual SVG file content
    const svgData = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
<path d="M0 0 C161.04 0 322.08 0 488 0 C488 168.3 488 336.6 488 510 C326.96 510 165.92 510 0 510 C0 341.7 0 173.4 0 0 Z" fill="#0B0A0B" transform="translate(0,0)"/>
<path d="M0 0 C161.04 0 322.08 0 488 0 C488 168.3 488 336.6 488 510 C326.96 510 165.92 510 0 510 C0 341.7 0 173.4 0 0 Z M214 32 C211.54227091 32.2762629 209.08400407 32.54782579 206.625 32.8125 C197.84469558 33.98444741 189.44379269 36.38319363 181 39 C180.29520508 39.21470947 179.59041016 39.42941895 178.86425781 39.65063477 C138.9491919 52.31479124 101.52230034 80.05303047 76 113 C75.24976563 113.95648438 74.49953125 114.91296875 73.7265625 115.8984375 C59.3996641 134.52829514 48.61996179 155.34559219 41.4296875 177.66796875 C40.50150027 180.53254659 39.51132911 183.3595981 38.4453125 186.17578125 C38.19668457 186.83537842 37.94805664 187.49497559 37.69189453 188.17456055 C37.10865956 189.71332127 36.52332031 191.25128418 35.9375 192.7890625 C34.53904397 197.57877439 33.80322366 202.45525511 33 207.375 C32.66958642 209.38329505 32.33630442 211.39112051 32 213.3984375 C31.7834375 214.72367432 31.7834375 214.72367432 31.5625 216.07568359 C31 219 31 219 29.95410156 222.79174805 C28.83389083 227.20178202 28.71086059 231.40124991 28.734375 235.93359375 C28.73246155 236.76979752 28.7305481 237.60600128 28.72857666 238.46754456 C28.72722276 240.23153994 28.73086331 241.99554556 28.73925781 243.75952148 C28.74984623 246.39916657 28.73939897 249.03811187 28.7265625 251.67773438 C28.67525387 306.02345473 50.50652924 357.38265978 86 398 C87.08474609 399.27037109 87.08474609 399.27037109 88.19140625 400.56640625 C92.46781188 405.51230787 96.99740303 409.80290594 102 414 C102.94617188 414.83402344 103.89234375 415.66804688 104.8671875 416.52734375 C116.84278286 427.02560038 129.98899517 435.45795449 144 443 C144.90540527 443.49064941 144.90540527 443.49064941 145.82910156 443.99121094 C193.19898049 469.3989168 249.39559994 475.15772807 301 460 C302.22332031 459.66613281 303.44664062 459.33226562 304.70703125 458.98828125 C334.21885527 450.64683546 361.81971471 434.93353524 385 415 C385.75023437 414.360625 386.50046875 413.72125 387.2734375 413.0625 C408.61692815 394.65473111 424.76290771 371.70001156 438 347 C438.32097656 346.40864258 438.64195312 345.81728516 438.97265625 345.20800781 C458.67189782 308.67374494 465.50577422 262.99698269 461 222 C460.67 221.34 460.34 220.68 460 220 C459.78819596 218.18184058 459.58119422 216.36292624 459.40454102 214.54101562 C458.28800728 203.07676378 455.64533941 192.28937193 451.828125 181.40625 C451.1795695 179.52176798 450.57366137 177.62259828 449.984375 175.71875 C442.91866777 153.29690574 430.93816063 132.8514269 417 114 C416.37738281 113.15308594 415.75476563 112.30617188 415.11328125 111.43359375 C403.78420578 96.85492099 389.93617917 83.81058493 375 73 C374.15695312 72.37351563 373.31390625 71.74703125 372.4453125 71.1015625 C366.40060156 66.72162441 360.02026328 62.91764831 353.59375 59.1328125 C351.48339629 57.88968227 349.40927504 56.62297848 347.34375 55.3046875 C340.30795456 50.82523107 332.76766675 47.92821749 325 45 C324.27039063 44.71382812 323.54078125 44.42765625 322.7890625 44.1328125 C320.87060601 43.38721151 318.93811363 42.69293718 317 42 C315.54787109 41.44892578 315.54787109 41.44892578 314.06640625 40.88671875 C302.73822737 36.80756404 291.1079216 34.65861808 279.28393555 32.49316406 C277 32 277 32 275 31 C266.58883186 29.70667971 258.01235327 29.81375763 249.52270508 29.81469727 C247.33329512 29.81252067 245.14439893 29.7943213 242.95507812 29.77539062 C233.13405086 29.73685381 223.72272289 30.62634416 214 32 Z" fill="#FEFEFE" transform="translate(0,0)"/>
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

