import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';
import { hslToHex } from '../utils/color';

interface Face {
  x: number;
  y: number;
  size: number;
  rotation: number;
  hue: number;
  alpha: number;
  expression: number; // 0-1, sad to happy
  detail: number; // noise detail level
  life: number;
  maxLife: number;
}

export class FacesInNoise implements Pattern {
  public name = 'Faces in Noise';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private faces: Face[] = [];
  private time: number = 0;
  private noiseOffset: number = 0;
  private spawnTimer: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Spawn initial faces
    for (let i = 0; i < 8; i++) {
      this.spawnFace();
    }
  }

  private spawnFace(x?: number, y?: number): void {
    const { width, height } = this.context;
    
    this.faces.push({
      x: x ?? Math.random() * width,
      y: y ?? Math.random() * height,
      size: 40 + Math.random() * 80,
      rotation: Math.random() * Math.PI * 2,
      hue: Math.random() * 360,
      alpha: 0.6 + Math.random() * 0.4,
      expression: Math.random(),
      detail: 0.5 + Math.random() * 0.5,
      life: 0,
      maxLife: 5 + Math.random() * 10,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.spawnTimer += dt;
    this.noiseOffset += dt * (0.2 + audio.rms * 0.3);

    // Auto-spawn faces
    if (this.spawnTimer > 2 && this.faces.length < 15) {
      this.spawnFace();
      this.spawnTimer = 0;
    }

    // Beat spawns new face
    if (audio.beat && this.faces.length < 20) {
      const { width, height } = this.context;
      this.spawnFace(
        width * 0.2 + Math.random() * width * 0.6,
        height * 0.2 + Math.random() * height * 0.6
      );
    }

    // Click spawns face
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.spawnFace(click.x, click.y);
      }
    });

    // Update faces
    this.faces.forEach((face) => {
      face.life += dt;

      // Drift with noise
      const driftSpeed = 20;
      const nx = noise2D(face.x * 0.01, this.noiseOffset);
      const ny = noise2D(face.y * 0.01, this.noiseOffset + 100);
      face.x += nx * driftSpeed * dt;
      face.y += ny * driftSpeed * dt;

      // Rotate slowly
      face.rotation += dt * 0.3 * (nx - 0.5);

      // Hue shifts with audio
      face.hue = (face.hue + dt * 20 + audio.centroid * 30) % 360;

      // Expression follows audio mood
      const targetExpression = audio.treble > audio.bass ? 0.7 : 0.3; // treble = happy, bass = sad
      face.expression += (targetExpression - face.expression) * 2 * dt;

      // Size pulses with audio
      face.size *= 1 + (audio.beat ? 0.1 : -0.05 * dt);
      face.size = Math.max(30, Math.min(150, face.size));

      // Fade in/out
      const progress = face.life / face.maxLife;
      if (progress < 0.2) {
        face.alpha = progress / 0.2;
      } else if (progress > 0.8) {
        face.alpha = (1 - progress) / 0.2;
      }

      // Wrap at edges
      const { width, height } = this.context;
      if (face.x < -100) face.x = width + 100;
      if (face.x > width + 100) face.x = -100;
      if (face.y < -100) face.y = height + 100;
      if (face.y > height + 100) face.y = -100;
    });

    // Remove dead faces
    this.faces = this.faces.filter((face) => face.life < face.maxLife);

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    this.faces.forEach((face) => {
      this.drawFace(face, audio);
    });
  }

  private drawFace(face: Face, audio: AudioData): void {
    const color = hslToHex(face.hue, 70, 50);
    const glowColor = hslToHex(face.hue, 100, 70);

    // Face outline (noisy circle)
    const facePoints = 24;
    this.graphics.lineStyle(2, color, face.alpha * 0.8);
    for (let i = 0; i <= facePoints; i++) {
      const angle = (i / facePoints) * Math.PI * 2 + face.rotation;
      
      // Add noise to radius for organic shape
      const noiseValue = noise2D(
        Math.cos(angle) * 5 + this.noiseOffset,
        Math.sin(angle) * 5 + this.noiseOffset
      );
      const radius = face.size * (0.9 + noiseValue * 0.2 * face.detail);
      
      const x = face.x + Math.cos(angle) * radius;
      const y = face.y + Math.sin(angle) * radius;
      
      if (i === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    }

    // Eyes (two circles with noise distortion)
    const eyeY = face.y - face.size * 0.2;
    const eyeSpacing = face.size * 0.3;
    const eyeSize = face.size * 0.15 * (1 + audio.treble * 0.2);

    // Left eye
    const leftEyeNoise = noise2D(face.x * 0.1, this.noiseOffset + 10);
    const leftEyeX = face.x - eyeSpacing + leftEyeNoise * 10;
    this.graphics.beginFill(glowColor, face.alpha * 0.8);
    this.graphics.drawCircle(leftEyeX, eyeY, eyeSize);
    this.graphics.endFill();
    
    // Eye glow
    this.graphics.beginFill(glowColor, face.alpha * 0.3);
    this.graphics.drawCircle(leftEyeX, eyeY, eyeSize * 2);
    this.graphics.endFill();

    // Right eye
    const rightEyeNoise = noise2D(face.x * 0.1 + 50, this.noiseOffset + 10);
    const rightEyeX = face.x + eyeSpacing + rightEyeNoise * 10;
    this.graphics.beginFill(glowColor, face.alpha * 0.8);
    this.graphics.drawCircle(rightEyeX, eyeY, eyeSize);
    this.graphics.endFill();
    
    // Eye glow
    this.graphics.beginFill(glowColor, face.alpha * 0.3);
    this.graphics.drawCircle(rightEyeX, eyeY, eyeSize * 2);
    this.graphics.endFill();

    // Nose (small noisy triangle)
    const noseY = face.y;
    const noseSize = face.size * 0.1;
    this.graphics.lineStyle(2, color, face.alpha * 0.6);
    this.graphics.moveTo(face.x, noseY - noseSize);
    this.graphics.lineTo(face.x - noseSize * 0.5, noseY + noseSize);
    this.graphics.lineTo(face.x + noseSize * 0.5, noseY + noseSize);

    // Mouth (curved line, expression affects curvature)
    const mouthY = face.y + face.size * 0.3;
    const mouthWidth = face.size * 0.4;
    const mouthCurve = face.size * 0.15 * (face.expression - 0.5) * 2; // negative = sad, positive = happy

    this.graphics.lineStyle(3, color, face.alpha * 0.7);
    this.graphics.moveTo(face.x - mouthWidth, mouthY);
    
    // Draw curved mouth with noise
    const mouthSegments = 10;
    for (let i = 1; i <= mouthSegments; i++) {
      const t = i / mouthSegments;
      const x = face.x - mouthWidth + t * mouthWidth * 2;
      
      // Parabolic curve for mouth
      const baseCurve = -4 * mouthCurve * (t - 0.5) * (t - 0.5) + mouthCurve;
      
      // Add noise to curve
      const noiseValue = noise2D(x * 0.1, this.noiseOffset + 20);
      const y = mouthY + baseCurve + noiseValue * 5 * face.detail;
      
      this.graphics.lineTo(x, y);
    }

    // Additional noise details (freckles/texture)
    if (face.detail > 0.7) {
      const dotCount = Math.floor(face.detail * 10);
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2;
        const dist = face.size * (0.3 + Math.random() * 0.4);
        const dotX = face.x + Math.cos(angle) * dist;
        const dotY = face.y + Math.sin(angle) * dist;
        
        const dotNoise = noise2D(dotX * 0.5, dotY * 0.5 + this.noiseOffset);
        if (dotNoise > 0.3) {
          this.graphics.beginFill(color, face.alpha * 0.4);
          this.graphics.drawCircle(dotX, dotY, 2);
          this.graphics.endFill();
        }
      }
    }

    // Aura (pulsing with beat)
    if (audio.beat) {
      this.graphics.lineStyle(1, glowColor, face.alpha * 0.3);
      this.graphics.drawCircle(face.x, face.y, face.size * 1.5);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

