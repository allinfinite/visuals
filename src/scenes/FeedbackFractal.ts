import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { noise2D } from '../utils/noise';

interface FractalLayer {
  scale: number;
  rotation: number;
  offset: { x: number; y: number };
  hue: number;
  alpha: number;
}

export class FeedbackFractal implements Pattern {
  public name = 'Feedback Fractal';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private layers: FractalLayer[] = [];
  private time: number = 0;
  private baseShape: number = 0; // 0-4 different base shapes

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initializeLayers();
  }

  private initializeLayers(): void {
    const layerCount = 5;
    
    for (let i = 0; i < layerCount; i++) {
      this.layers.push({
        scale: 1 - i * 0.15,
        rotation: 0,
        offset: { x: 0, y: 0 },
        hue: (i / layerCount) * 360,
        alpha: 0.8 - i * 0.1,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Click changes base shape
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.baseShape = (this.baseShape + 1) % 5;
      }
    });

    // Beat modulates scale
    const beatScale = audio.beat ? 1.2 : 1;

    // Update layers
    this.layers.forEach((layer, i) => {
      // Scale pulses with audio
      const targetScale = (1 - i * 0.12) * (1 + audio.rms * 0.3) * beatScale;
      layer.scale += (targetScale - layer.scale) * 5 * dt;

      // Rotation varies by layer
      const rotationSpeed = (i % 2 === 0 ? 1 : -1) * (0.5 + audio.treble);
      layer.rotation += rotationSpeed * dt;

      // Offset with noise
      const noiseX = noise2D(this.time * 0.5 + i, 0) * 30 * (1 + audio.bass);
      const noiseY = noise2D(this.time * 0.5 + i, 100) * 30 * (1 + audio.bass);
      layer.offset.x += (noiseX - layer.offset.x) * 2 * dt;
      layer.offset.y += (noiseY - layer.offset.y) * 2 * dt;

      // Hue shifts
      layer.hue = (layer.hue + dt * 30 + audio.centroid * 50) % 360;

      // Alpha pulses
      layer.alpha = 0.7 - i * 0.1 + Math.sin(this.time * 2 + i) * 0.2 + audio.rms * 0.2;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw layers from largest to smallest
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const color = hslToHex(layer.hue, 70, 50);
      const glowColor = hslToHex(layer.hue, 100, 70);

      const size = Math.min(width, height) * 0.3 * layer.scale;

      // Apply transformations
      const x = centerX + layer.offset.x;
      const y = centerY + layer.offset.y;

      // Draw glow
      this.graphics.lineStyle(4, glowColor, layer.alpha * 0.3);
      this.drawShape(x, y, size * 1.1, layer.rotation, audio);

      // Draw core shape
      this.graphics.lineStyle(2, color, layer.alpha);
      this.drawShape(x, y, size, layer.rotation, audio);

      // Fill with low alpha
      this.graphics.beginFill(color, layer.alpha * 0.1);
      this.drawShape(x, y, size, layer.rotation, audio);
      this.graphics.endFill();
    }

    // Draw recursive patterns between layers
    if (audio.beat) {
      for (let i = 0; i < this.layers.length - 1; i++) {
        const l1 = this.layers[i];
        const l2 = this.layers[i + 1];
        
        const midHue = (l1.hue + l2.hue) / 2;
        const midColor = hslToHex(midHue % 360, 80, 60);
        
        const x1 = centerX + l1.offset.x;
        const y1 = centerY + l1.offset.y;
        const x2 = centerX + l2.offset.x;
        const y2 = centerY + l2.offset.y;
        
        this.graphics.lineStyle(1, midColor, 0.3);
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
      }
    }

    // Center dot
    this.graphics.beginFill(0xffffff, 0.8 + audio.rms * 0.2);
    this.graphics.drawCircle(centerX, centerY, 5 + (audio.beat ? 5 : 0));
    this.graphics.endFill();
  }

  private drawShape(x: number, y: number, size: number, rotation: number, audio: AudioData): void {
    switch (this.baseShape) {
      case 0: // Triangle
        this.drawPolygon(x, y, size, 3, rotation);
        break;
      case 1: // Square
        this.drawPolygon(x, y, size, 4, rotation);
        break;
      case 2: // Hexagon
        this.drawPolygon(x, y, size, 6, rotation);
        break;
      case 3: // Star
        this.drawStar(x, y, size, 5, rotation);
        break;
      case 4: // Circle with modulation
        this.drawModulatedCircle(x, y, size, rotation, audio);
        break;
    }
  }

  private drawPolygon(x: number, y: number, size: number, sides: number, rotation: number): void {
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + rotation;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
  }

  private drawStar(x: number, y: number, size: number, points: number, rotation: number): void {
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 + rotation;
      const radius = i % 2 === 0 ? size : size * 0.5;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
  }

  private drawModulatedCircle(x: number, y: number, size: number, rotation: number, audio: AudioData): void {
    const points = 32;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2 + rotation;
      
      // Modulate radius with audio
      const modulation = 1 + Math.sin(angle * 3 + this.time * 2) * 0.2 * audio.rms;
      const radius = size * modulation;
      
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) this.graphics.moveTo(px, py);
      else this.graphics.lineTo(px, py);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

