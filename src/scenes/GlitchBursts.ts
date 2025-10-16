import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface GlitchBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  life: number;
  maxLife: number;
  color: number;
}

export class GlitchBursts implements Pattern {
  public name = 'Glitch Bursts';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private glitchBlocks: GlitchBlock[] = [];
  private time: number = 0;
  private lastAmplitude: number = 0;
  private glitchIntensity: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Detect amplitude spikes
    const amplitudeChange = audio.rms - this.lastAmplitude;
    if (amplitudeChange > 0.15 || audio.beat) {
      this.triggerGlitch(audio);
    }
    this.lastAmplitude = audio.rms;

    // Decay glitch intensity
    this.glitchIntensity *= 0.9;

    // Update glitch blocks
    this.glitchBlocks.forEach((block) => {
      block.life += dt;
      block.offsetX += (Math.random() - 0.5) * 5;
      block.offsetY += (Math.random() - 0.5) * 5;
    });

    // Remove dead blocks
    this.glitchBlocks = this.glitchBlocks.filter((block) => block.life < block.maxLife);

    // Click interaction
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.createGlitchAt(click.x, click.y, audio);
      }
    });

    this.draw(audio);
  }

  private triggerGlitch(audio: AudioData): void {
    this.glitchIntensity = 1;
    const count = 5 + Math.floor(audio.rms * 20);
    
    for (let i = 0; i < count; i++) {
      const { width, height } = this.context;
      this.glitchBlocks.push({
        x: randomRange(0, width),
        y: randomRange(0, height),
        width: randomRange(20, 200),
        height: randomRange(5, 40),
        offsetX: randomRange(-30, 30),
        offsetY: randomRange(-10, 10),
        life: 0,
        maxLife: randomRange(0.05, 0.2),
        color: this.getGlitchColor(),
      });
    }
  }

  private createGlitchAt(x: number, y: number, audio: AudioData): void {
    const count = 8 + Math.floor(audio.rms * 10);
    
    for (let i = 0; i < count; i++) {
      this.glitchBlocks.push({
        x: x + randomRange(-100, 100),
        y: y + randomRange(-100, 100),
        width: randomRange(30, 150),
        height: randomRange(5, 30),
        offsetX: randomRange(-40, 40),
        offsetY: randomRange(-15, 15),
        life: 0,
        maxLife: randomRange(0.08, 0.25),
        color: this.getGlitchColor(),
      });
    }
  }

  private getGlitchColor(): number {
    const colors = [
      0xFF0000, // Red
      0x00FF00, // Green
      0x0000FF, // Blue
      0xFF00FF, // Magenta
      0x00FFFF, // Cyan
      0xFFFF00, // Yellow
      0xFFFFFF, // White
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    // Draw glitch blocks
    this.glitchBlocks.forEach((block) => {
      const progress = block.life / block.maxLife;
      const alpha = (1 - progress) * 0.8;
      
      // Chromatic aberration effect
      const offset = 3 * (1 - progress);
      
      // Red channel
      this.graphics.beginFill(0xFF0000, alpha * 0.5);
      this.graphics.drawRect(
        block.x + block.offsetX - offset,
        block.y + block.offsetY,
        block.width,
        block.height
      );
      this.graphics.endFill();
      
      // Green channel
      this.graphics.beginFill(0x00FF00, alpha * 0.5);
      this.graphics.drawRect(
        block.x + block.offsetX,
        block.y + block.offsetY,
        block.width,
        block.height
      );
      this.graphics.endFill();
      
      // Blue channel
      this.graphics.beginFill(0x0000FF, alpha * 0.5);
      this.graphics.drawRect(
        block.x + block.offsetX + offset,
        block.y + block.offsetY,
        block.width,
        block.height
      );
      this.graphics.endFill();
      
      // Main block
      this.graphics.beginFill(block.color, alpha);
      this.graphics.drawRect(
        block.x + block.offsetX,
        block.y + block.offsetY,
        block.width,
        block.height
      );
      this.graphics.endFill();
    });

    // Scanlines effect
    if (this.glitchIntensity > 0.3) {
      const { width, height } = this.context;
      const lineCount = 5;
      
      for (let i = 0; i < lineCount; i++) {
        const y = randomRange(0, height);
        const lineHeight = randomRange(1, 4);
        
        this.graphics.beginFill(0xFFFFFF, this.glitchIntensity * 0.4);
        this.graphics.drawRect(0, y, width, lineHeight);
        this.graphics.endFill();
      }
    }

    // Digital noise on high energy
    if (audio.rms > 0.7) {
      const { width, height } = this.context;
      const noiseCount = Math.floor(audio.rms * 50);
      
      for (let i = 0; i < noiseCount; i++) {
        const x = randomRange(0, width);
        const y = randomRange(0, height);
        const size = randomRange(1, 5);
        const color = Math.random() > 0.5 ? 0xFFFFFF : 0x000000;
        
        this.graphics.beginFill(color, 0.3);
        this.graphics.drawRect(x, y, size, size);
        this.graphics.endFill();
      }
    }

    // RGB shift bars on beat
    if (audio.beat && this.glitchIntensity > 0.5) {
      const { width, height } = this.context;
      const barY = randomRange(0, height - 50);
      const barHeight = randomRange(20, 80);
      
      this.graphics.beginFill(0xFF0000, 0.2);
      this.graphics.drawRect(-10, barY, width + 20, barHeight);
      this.graphics.endFill();
      
      this.graphics.beginFill(0x00FFFF, 0.2);
      this.graphics.drawRect(-5, barY + 5, width + 10, barHeight);
      this.graphics.endFill();
    }

    // Glitch intensity indicator
    if (this.glitchIntensity > 0.1) {
      const { width } = this.context;
      this.graphics.beginFill(0xFF0000, this.glitchIntensity * 0.3);
      this.graphics.drawRect(0, 0, width * this.glitchIntensity, 3);
      this.graphics.endFill();
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

