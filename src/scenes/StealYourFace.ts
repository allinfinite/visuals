import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface Skull {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  hue: number;
  pulsePhase: number;
  splitAmount: number; // How split the skull is
  lightningPhase: number;
}

export class StealYourFace implements Pattern {
  public name = 'Steal Your Face';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private skulls: Skull[] = [];
  private time: number = 0;
  private centerSkull: Skull;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Main center skull
    this.centerSkull = {
      x: context.width / 2,
      y: context.height / 2,
      scale: 1,
      rotation: 0,
      hue: 0,
      pulsePhase: 0,
      splitAmount: 20,
      lightningPhase: 0,
    };

    // Add some orbiting skulls
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      this.skulls.push({
        x: context.width / 2 + Math.cos(angle) * 200,
        y: context.height / 2 + Math.sin(angle) * 200,
        scale: 0.5,
        rotation: angle,
        hue: i * 90,
        pulsePhase: i * Math.PI / 2,
        splitAmount: 10,
        lightningPhase: i * Math.PI / 4,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update center skull
    this.centerSkull.rotation += dt * 0.2 * (1 + audio.treble * 0.5);
    this.centerSkull.hue = (this.time * 30 + audio.centroid * 120) % 360;
    this.centerSkull.pulsePhase += dt * 2;
    this.centerSkull.scale = 1 + Math.sin(this.centerSkull.pulsePhase) * 0.1 + audio.bass * 0.3;
    this.centerSkull.splitAmount = 20 + audio.rms * 40 + (audio.beat ? 20 : 0);
    this.centerSkull.lightningPhase += dt * 3 + audio.treble * 5;

    // Update orbiting skulls
    this.skulls.forEach((skull, i) => {
      const orbitAngle = this.time * (0.3 + i * 0.1) + i * Math.PI / 2;
      const orbitRadius = 200 + Math.sin(this.time + i) * 50 + audio.mid * 100;
      
      skull.x = this.context.width / 2 + Math.cos(orbitAngle) * orbitRadius;
      skull.y = this.context.height / 2 + Math.sin(orbitAngle) * orbitRadius;
      skull.rotation += dt * (0.5 + audio.rms);
      skull.hue = (i * 90 + this.time * 50 + audio.centroid * 60) % 360;
      skull.pulsePhase += dt * 2.5;
      skull.scale = 0.5 + Math.sin(skull.pulsePhase) * 0.15 + audio.bass * 0.2;
      skull.splitAmount = 10 + audio.rms * 30;
      skull.lightningPhase += dt * 4;
    });

    // Click spawns new skull
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.skulls.length < 12) {
        this.skulls.push({
          x: click.x,
          y: click.y,
          scale: 0.3,
          rotation: Math.random() * Math.PI * 2,
          hue: Math.random() * 360,
          pulsePhase: Math.random() * Math.PI * 2,
          splitAmount: 15,
          lightningPhase: Math.random() * Math.PI * 2,
        });
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw orbiting skulls first
    this.skulls.forEach((skull) => {
      this.drawSkull(skull, audio, 0.7);
    });

    // Draw center skull on top
    this.drawSkull(this.centerSkull, audio, 1);
  }

  private drawSkull(skull: Skull, audio: AudioData, alpha: number): void {
    const baseSize = 100 * skull.scale;
    const split = skull.splitAmount;

    // Outer glow
    this.graphics.beginFill(hslToHex(skull.hue, 100, 50), alpha * 0.2);
    this.graphics.drawCircle(skull.x, skull.y, baseSize * 1.5);
    this.graphics.endFill();

    // Draw lightning bolt first (behind skull)
    this.drawLightningBolt(skull, baseSize, alpha, audio);

    // Draw left half of skull (red side traditionally)
    this.drawSkullHalf(skull, baseSize, -split, skull.hue, alpha, true);

    // Draw right half of skull (blue side traditionally)
    this.drawSkullHalf(skull, baseSize, split, (skull.hue + 180) % 360, alpha, false);

    // Draw skull features on top
    this.drawSkullFeatures(skull, baseSize, alpha, audio);
  }

  private drawSkullHalf(
    skull: Skull,
    size: number,
    xOffset: number,
    hue: number,
    alpha: number,
    isLeft: boolean
  ): void {
    const cos = Math.cos(skull.rotation);
    const sin = Math.sin(skull.rotation);

    // Transform offset
    const offsetX = skull.x + xOffset * cos;
    const offsetY = skull.y + xOffset * sin;

    // Skull dome (half circle)
    this.graphics.beginFill(hslToHex(hue, 80, 40), alpha * 0.8);
    
    // Draw arc for half skull
    const startAngle = isLeft ? Math.PI : 0;
    const endAngle = isLeft ? Math.PI * 2 : Math.PI;
    
    this.graphics.arc(
      offsetX,
      offsetY - size * 0.2,
      size * 0.8,
      startAngle + skull.rotation,
      endAngle + skull.rotation
    );
    
    // Close the shape
    this.graphics.lineTo(offsetX, offsetY + size * 0.5);
    this.graphics.closePath();
    this.graphics.endFill();

    // Skull highlight
    this.graphics.beginFill(hslToHex(hue, 90, 60), alpha * 0.5);
    this.graphics.arc(
      offsetX - (isLeft ? size * 0.2 : -size * 0.2) * Math.abs(cos),
      offsetY - size * 0.4,
      size * 0.4,
      startAngle + skull.rotation,
      endAngle + skull.rotation
    );
    this.graphics.lineTo(offsetX, offsetY + size * 0.3);
    this.graphics.closePath();
    this.graphics.endFill();

    // Jaw
    this.graphics.beginFill(hslToHex(hue, 75, 35), alpha * 0.85);
    
    const jawPoints = [];
    const jawStartAngle = isLeft ? Math.PI * 0.7 : Math.PI * 0.3;
    const jawEndAngle = isLeft ? Math.PI * 1.3 : Math.PI * 1.7;
    
    for (let a = jawStartAngle; a <= jawEndAngle; a += 0.2) {
      const angle = a + skull.rotation;
      const r = size * 0.6;
      jawPoints.push({
        x: offsetX + Math.cos(angle) * r,
        y: offsetY + size * 0.1 + Math.sin(angle) * r * 0.8,
      });
    }

    if (jawPoints.length > 0) {
      this.graphics.moveTo(jawPoints[0].x, jawPoints[0].y);
      jawPoints.forEach(p => this.graphics.lineTo(p.x, p.y));
      this.graphics.lineTo(offsetX, offsetY + size * 0.6);
      this.graphics.closePath();
      this.graphics.endFill();
    }
  }

  private drawSkullFeatures(skull: Skull, size: number, alpha: number, audio: AudioData): void {
    const cos = Math.cos(skull.rotation);
    const sin = Math.sin(skull.rotation);

    // Eye sockets (hollow/dark)
    const eyeY = -size * 0.25;
    const eyeSize = size * 0.15;
    const eyeGlow = 0.5 + Math.sin(skull.pulsePhase * 2) * 0.3 + audio.treble * 0.5;

    // Left eye
    const leftEyeX = -size * 0.3;
    const leftX = skull.x + (leftEyeX * cos - eyeY * sin);
    const leftY = skull.y + (leftEyeX * sin + eyeY * cos);

    this.graphics.beginFill(0x000000, alpha * 0.9);
    this.graphics.drawEllipse(leftX, leftY, eyeSize, eyeSize * 1.2);
    this.graphics.endFill();

    // Eye glow
    this.graphics.beginFill(hslToHex(skull.hue, 100, 70), alpha * eyeGlow * 0.6);
    this.graphics.drawCircle(leftX, leftY, eyeSize * 0.5);
    this.graphics.endFill();

    // Right eye
    const rightEyeX = size * 0.3;
    const rightX = skull.x + (rightEyeX * cos - eyeY * sin);
    const rightY = skull.y + (rightEyeX * sin + eyeY * cos);

    this.graphics.beginFill(0x000000, alpha * 0.9);
    this.graphics.drawEllipse(rightX, rightY, eyeSize, eyeSize * 1.2);
    this.graphics.endFill();

    this.graphics.beginFill(hslToHex((skull.hue + 180) % 360, 100, 70), alpha * eyeGlow * 0.6);
    this.graphics.drawCircle(rightX, rightY, eyeSize * 0.5);
    this.graphics.endFill();

    // Nose cavity
    const noseY = eyeY + size * 0.15;
    const noseX = skull.x + (0 * cos - noseY * sin);
    const noseYPos = skull.y + (0 * sin + noseY * cos);

    this.graphics.beginFill(0x000000, alpha * 0.85);
    this.graphics.moveTo(noseX, noseYPos - size * 0.08);
    this.graphics.lineTo(noseX - size * 0.08, noseYPos + size * 0.05);
    this.graphics.lineTo(noseX + size * 0.08, noseYPos + size * 0.05);
    this.graphics.closePath();
    this.graphics.endFill();

    // Teeth (on jaw)
    const teethY = size * 0.35;
    const teethCount = 6;
    
    for (let i = 0; i < teethCount; i++) {
      const toothX = (i - teethCount / 2) * size * 0.15;
      const tx = skull.x + (toothX * cos - teethY * sin);
      const ty = skull.y + (toothX * sin + teethY * cos);

      this.graphics.beginFill(0xffffff, alpha * 0.7);
      this.graphics.drawRect(tx - size * 0.04, ty, size * 0.08, size * 0.12);
      this.graphics.endFill();

      // Dark gap
      this.graphics.lineStyle(1, 0x000000, alpha * 0.5);
      this.graphics.moveTo(tx, ty);
      this.graphics.lineTo(tx, ty + size * 0.12);
    }

    this.graphics.lineStyle(0);
  }

  private drawLightningBolt(skull: Skull, size: number, alpha: number, audio: AudioData): void {
    const cos = Math.cos(skull.rotation);
    const sin = Math.sin(skull.rotation);

    // Lightning bolt color alternates with audio
    const boltHue = (skull.hue + 60) % 360;
    const boltGlow = 0.7 + Math.sin(skull.lightningPhase) * 0.3 + (audio.beat ? 0.3 : 0);

    // Create zigzag lightning bolt path
    const boltPoints = [
      { x: 0, y: -size * 0.9 },
      { x: size * 0.15, y: -size * 0.4 },
      { x: -size * 0.1, y: -size * 0.2 },
      { x: size * 0.2, y: 0 },
      { x: -size * 0.05, y: size * 0.2 },
      { x: size * 0.15, y: size * 0.5 },
      { x: 0, y: size * 0.9 },
      { x: size * 0.1, y: size * 0.5 },
      { x: 0.05, y: size * 0.2 },
      { x: -size * 0.15, y: 0 },
      { x: size * 0.05, y: -size * 0.2 },
      { x: -size * 0.1, y: -size * 0.4 },
    ];

    // Draw glow
    this.graphics.beginFill(hslToHex(boltHue, 100, 70), alpha * boltGlow * 0.4);
    this.graphics.moveTo(
      skull.x + (boltPoints[0].x * cos - boltPoints[0].y * sin),
      skull.y + (boltPoints[0].x * sin + boltPoints[0].y * cos)
    );
    boltPoints.forEach(p => {
      const x = skull.x + (p.x * cos - p.y * sin);
      const y = skull.y + (p.x * sin + p.y * cos);
      this.graphics.lineTo(x, y);
    });
    this.graphics.closePath();
    this.graphics.endFill();

    // Draw main bolt
    this.graphics.beginFill(hslToHex(boltHue, 100, 80), alpha * 0.9);
    this.graphics.moveTo(
      skull.x + (boltPoints[0].x * cos * 0.7 - boltPoints[0].y * sin * 0.7),
      skull.y + (boltPoints[0].x * sin * 0.7 + boltPoints[0].y * cos * 0.7)
    );
    boltPoints.forEach(p => {
      const x = skull.x + (p.x * cos * 0.7 - p.y * sin * 0.7);
      const y = skull.y + (p.x * sin * 0.7 + p.y * cos * 0.7);
      this.graphics.lineTo(x, y);
    });
    this.graphics.closePath();
    this.graphics.endFill();

    // Bright center highlight
    this.graphics.beginFill(0xffffff, alpha * boltGlow * 0.7);
    this.graphics.moveTo(
      skull.x + (boltPoints[0].x * cos * 0.4 - boltPoints[0].y * sin * 0.4),
      skull.y + (boltPoints[0].x * sin * 0.4 + boltPoints[0].y * cos * 0.4)
    );
    boltPoints.forEach(p => {
      const x = skull.x + (p.x * cos * 0.4 - p.y * sin * 0.4);
      const y = skull.y + (p.x * sin * 0.4 + p.y * cos * 0.4);
      this.graphics.lineTo(x, y);
    });
    this.graphics.closePath();
    this.graphics.endFill();

    // Lightning sparkles
    if (audio.beat || Math.random() < 0.1) {
      for (let i = 0; i < 3; i++) {
        const sparkPoint = boltPoints[Math.floor(Math.random() * boltPoints.length)];
        const sx = skull.x + (sparkPoint.x * cos - sparkPoint.y * sin);
        const sy = skull.y + (sparkPoint.x * sin + sparkPoint.y * cos);
        
        this.graphics.beginFill(0xffffff, alpha * 0.8);
        this.graphics.drawCircle(sx, sy, size * 0.05);
        this.graphics.endFill();
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

