import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { noise2D } from '../utils/noise';

interface Texture {
  type: number; // 0-5 different types
  hue: number;
  alpha: number;
  scale: number;
  offset: { x: number; y: number };
  rotation: number;
}

export class LatentMorphs implements Pattern {
  public name = 'Latent Morphs';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private currentTexture: Texture;
  private nextTexture: Texture;
  private morphProgress: number = 0;
  private morphDuration: number = 12; // Increased from 5 to 12 seconds for slower morphs

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.currentTexture = this.generateRandomTexture();
    this.nextTexture = this.generateRandomTexture();
  }

  private generateRandomTexture(): Texture {
    return {
      type: Math.floor(Math.random() * 6),
      hue: Math.random() * 360,
      alpha: 0.7 + Math.random() * 0.3,
      scale: 0.5 + Math.random() * 1.5,
      offset: { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 },
      rotation: Math.random() * Math.PI * 2,
    };
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Click triggers immediate morph
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.currentTexture = this.nextTexture;
        this.nextTexture = this.generateRandomTexture();
        this.morphProgress = 0;
      }
    });

    // Slow, gradual morph with subtle audio influence
    const morphSpeed = 1 + audio.rms * 0.2; // Reduced audio influence from 1x to 0.2x
    this.morphProgress += (dt / this.morphDuration) * morphSpeed;

    // Complete morph
    if (this.morphProgress >= 1) {
      this.currentTexture = this.nextTexture;
      this.nextTexture = this.generateRandomTexture();
      this.morphProgress = 0;
      
      // Vary morph duration between 10-16 seconds (increased from 3-7)
      this.morphDuration = 10 + Math.random() * 6;
    }

    // Update textures with audio - slower rotation
    this.currentTexture.rotation += dt * 0.1 * (1 + audio.treble * 0.5);
    this.nextTexture.rotation += dt * 0.15 * (1 + audio.treble * 0.5);

    // Slower hue shift
    this.currentTexture.hue = (this.currentTexture.hue + dt * 10 + audio.centroid * 15) % 360;
    this.nextTexture.hue = (this.nextTexture.hue + dt * 12 + audio.centroid * 18) % 360;

    const scaleTarget = 1 + audio.rms * 0.2;
    this.currentTexture.scale += (scaleTarget - this.currentTexture.scale) * 1.5 * dt;
    this.nextTexture.scale += (scaleTarget - this.nextTexture.scale) * 1.5 * dt;

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;

    // Use easing for smooth morph
    const t = this.easeInOutCubic(this.morphProgress);

    // Draw current texture
    this.drawTexture(this.currentTexture, 1 - t, width, height, audio);

    // Draw next texture
    this.drawTexture(this.nextTexture, t, width, height, audio);

    // Draw morph progress indicator
    const indicatorX = width - 50;
    const indicatorY = height - 50;
    const indicatorSize = 30;
    
    this.graphics.lineStyle(2, 0xffffff, 0.3);
    this.graphics.drawCircle(indicatorX, indicatorY, indicatorSize);
    
    this.graphics.beginFill(hslToHex(this.currentTexture.hue, 70, 50), 0.5);
    this.graphics.drawCircle(indicatorX, indicatorY, indicatorSize * (1 - t));
    this.graphics.endFill();
    
    this.graphics.beginFill(hslToHex(this.nextTexture.hue, 70, 50), 0.5);
    this.graphics.drawCircle(indicatorX, indicatorY, indicatorSize * t);
    this.graphics.endFill();
  }

  private drawTexture(texture: Texture, alpha: number, width: number, height: number, audio: AudioData): void {
    if (alpha < 0.01) return;

    const centerX = width / 2 + texture.offset.x;
    const centerY = height / 2 + texture.offset.y;
    const baseSize = Math.max(width, height) * texture.scale;

    switch (texture.type) {
      case 0:
        this.drawRadialGradient(centerX, centerY, baseSize, texture, alpha, audio);
        break;
      case 1:
        this.drawNoiseField(centerX, centerY, baseSize, texture, alpha, audio);
        break;
      case 2:
        this.drawConcentricRings(centerX, centerY, baseSize, texture, alpha, audio);
        break;
      case 3:
        this.drawVoronoiLike(centerX, centerY, baseSize, texture, alpha, audio);
        break;
      case 4:
        this.drawPerlinBlobs(centerX, centerY, baseSize, texture, alpha, audio);
        break;
      case 5:
        this.drawSpectralBands(centerX, centerY, baseSize, texture, alpha, audio);
        break;
    }
  }

  private drawRadialGradient(x: number, y: number, size: number, texture: Texture, alpha: number, _audio: AudioData): void {
    const rings = 20;
    for (let i = 0; i < rings; i++) {
      const radius = (size / rings) * (i + 1);
      const ringAlpha = (1 - i / rings) * alpha * texture.alpha;
      const hue = (texture.hue + i * 10) % 360;
      const color = hslToHex(hue, 70, 50 + i * 2);
      
      this.graphics.beginFill(color, ringAlpha);
      this.graphics.drawCircle(x, y, radius);
      this.graphics.endFill();
    }
  }

  private drawNoiseField(x: number, y: number, size: number, texture: Texture, alpha: number, _audio: AudioData): void {
    const gridSize = 20;
    const cellSize = size / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const px = x - size / 2 + i * cellSize;
        const py = y - size / 2 + j * cellSize;
        
        const noiseValue = noise2D(
          (i + texture.offset.x) * 0.1 + this.time * 0.5,
          (j + texture.offset.y) * 0.1 + this.time * 0.5
        );
        
        const brightness = 30 + noiseValue * 50;
        const cellAlpha = alpha * texture.alpha * (0.3 + noiseValue * 0.7);
        const color = hslToHex(texture.hue, 70, brightness);
        
        this.graphics.beginFill(color, cellAlpha);
        this.graphics.drawRect(px, py, cellSize, cellSize);
        this.graphics.endFill();
      }
    }
  }

  private drawConcentricRings(x: number, y: number, size: number, texture: Texture, alpha: number, audio: AudioData): void {
    const rings = 15;
    for (let i = 0; i < rings; i++) {
      const radius = size * (0.3 + (i / rings) * 0.7);
      const thickness = 10 + audio.rms * 10;
      const hue = (texture.hue + i * 360 / rings) % 360;
      const color = hslToHex(hue, 70, 50);
      
      this.graphics.lineStyle(thickness, color, alpha * texture.alpha * 0.6);
      this.graphics.drawCircle(x, y, radius);
    }
  }

  private drawVoronoiLike(x: number, y: number, size: number, texture: Texture, alpha: number, audio: AudioData): void {
    const points = 12;
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2 + texture.rotation;
      const dist = size * (0.3 + Math.random() * 0.4);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const radius = size * 0.2 * (0.5 + audio.spectrum[i % audio.spectrum.length]);
      
      const hue = (texture.hue + i * 30) % 360;
      const color = hslToHex(hue, 70, 50);
      
      // Draw filled circles
      this.graphics.beginFill(color, alpha * texture.alpha * 0.5);
      this.graphics.drawCircle(px, py, radius);
      this.graphics.endFill();
      
      // Draw glow
      this.graphics.beginFill(color, alpha * texture.alpha * 0.2);
      this.graphics.drawCircle(px, py, radius * 1.5);
      this.graphics.endFill();
    }
  }

  private drawPerlinBlobs(x: number, y: number, size: number, texture: Texture, alpha: number, audio: AudioData): void {
    const blobCount = 8;
    
    for (let i = 0; i < blobCount; i++) {
      const angle = (i / blobCount) * Math.PI * 2 + this.time * 0.5;
      const noiseVal = noise2D(
        Math.cos(angle) * 2 + this.time * 0.3,
        Math.sin(angle) * 2 + this.time * 0.3
      );
      
      const dist = size * 0.3 * (0.5 + noiseVal * 0.5) * (1 + audio.bass * 0.5);
      const px = x + Math.cos(angle + texture.rotation) * dist;
      const py = y + Math.sin(angle + texture.rotation) * dist;
      const radius = size * 0.15 * (0.7 + noiseVal * 0.3);
      
      const hue = (texture.hue + i * 45 + noiseVal * 60) % 360;
      const color = hslToHex(hue, 70, 50);
      
      this.graphics.beginFill(color, alpha * texture.alpha * 0.6);
      this.graphics.drawCircle(px, py, radius);
      this.graphics.endFill();
    }
  }

  private drawSpectralBands(x: number, y: number, size: number, texture: Texture, alpha: number, audio: AudioData): void {
    const bands = Math.min(32, audio.spectrum.length);
    const bandHeight = size / bands;
    
    for (let i = 0; i < bands; i++) {
      const specValue = audio.spectrum[i];
      const bandWidth = size * specValue * 0.8;
      const py = y - size / 2 + i * bandHeight;
      
      const hue = (texture.hue + (i / bands) * 360) % 360;
      const color = hslToHex(hue, 70, 40 + specValue * 30);
      
      // Rotate band
      const cos = Math.cos(texture.rotation);
      const sin = Math.sin(texture.rotation);
      
      this.graphics.beginFill(color, alpha * texture.alpha * 0.7);
      
      const corners = [
        { x: -bandWidth / 2, y: py - y },
        { x: bandWidth / 2, y: py - y },
        { x: bandWidth / 2, y: py - y + bandHeight },
        { x: -bandWidth / 2, y: py - y + bandHeight },
      ];
      
      corners.forEach((corner, idx) => {
        const rx = x + corner.x * cos - corner.y * sin;
        const ry = y + corner.x * sin + corner.y * cos;
        if (idx === 0) this.graphics.moveTo(rx, ry);
        else this.graphics.lineTo(rx, ry);
      });
      this.graphics.closePath();
      this.graphics.endFill();
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

