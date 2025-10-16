import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface LineLayer {
  angle: number;
  spacing: number;
  thickness: number;
  speed: number;
  offset: number;
  color: number;
  alpha: number;
}

export class MoireRotation implements Pattern {
  public name = 'Moiré Rotation';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private layers: LineLayer[] = [];
  private time: number = 0;
  private centerX: number;
  private centerY: number;

  constructor(context: RendererContext) {
    this.context = context;
    this.centerX = context.width / 2;
    this.centerY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize line layers
    this.initializeLayers();
  }

  private initializeLayers(): void {
    // Create 3-5 overlapping line layers
    const layerCount = 4;
    
    for (let i = 0; i < layerCount; i++) {
      this.layers.push({
        angle: (i * Math.PI) / layerCount,
        spacing: 15 + i * 3,
        thickness: 1 + i * 0.5,
        speed: 0.2 + i * 0.1,
        offset: 0,
        color: this.hslToHex((i * 90) % 360, 70, 50),
        alpha: 0.3 + i * 0.1,
      });
    }
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;

    // Update each layer rotation
    this.layers.forEach((layer, idx) => {
      // Rotation speed based on audio tempo/RMS
      const audioSpeed = 1 + audio.rms * 3 + (audio.beat ? 0.5 : 0);
      const direction = idx % 2 === 0 ? 1 : -1; // Alternate directions
      
      layer.angle += layer.speed * audioSpeed * direction * dt;

      // Offset scrolls the lines
      layer.offset += (10 + audio.bass * 20) * dt;
      layer.offset %= layer.spacing;

      // Spacing pulsates with audio
      layer.spacing = 15 + idx * 3 + Math.sin(this.time * 2 + idx) * 3 + audio.treble * 5;

      // Alpha varies with audio
      layer.alpha = 0.3 + idx * 0.1 + audio.spectrum[idx * 8] * 0.3;

      // Color shifts
      const hue = ((idx * 90) + this.time * 30 + audio.centroid * 100) % 360;
      layer.color = this.hslToHex(hue, 70, 50);
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    const maxDist = Math.hypot(this.context.width, this.context.height);

    // Draw each layer
    this.layers.forEach((layer) => {
      this.graphics.lineStyle(layer.thickness, layer.color, layer.alpha);

      // Calculate perpendicular direction for line spacing
      const perpAngle = layer.angle + Math.PI / 2;
      const perpDx = Math.cos(perpAngle);
      const perpDy = Math.sin(perpAngle);

      // Draw parallel lines across the entire canvas
      const lineCount = Math.ceil(maxDist / layer.spacing) * 2;
      const startOffset = -lineCount / 2;

      for (let i = 0; i < lineCount; i++) {
        const offset = (startOffset + i) * layer.spacing + layer.offset;
        
        // Center point of the line
        const centerX = this.centerX + perpDx * offset;
        const centerY = this.centerY + perpDy * offset;

        // Line direction (perpendicular to spacing direction)
        const lineDx = Math.cos(layer.angle);
        const lineDy = Math.sin(layer.angle);

        // Draw line across canvas
        const lineLength = maxDist;
        const x1 = centerX - lineDx * lineLength;
        const y1 = centerY - lineDy * lineLength;
        const x2 = centerX + lineDx * lineLength;
        const y2 = centerY + lineDy * lineLength;

        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
      }
    });

    // Draw center point indicator
    const pulseSize = 5 + Math.sin(this.time * 3) * 2 + audio.rms * 5;
    this.graphics.beginFill(0xffffff, 0.5 + (audio.beat ? 0.3 : 0));
    this.graphics.drawCircle(this.centerX, this.centerY, pulseSize);
    this.graphics.endFill();
  }

  private hslToHex(h: number, s: number, l: number): number {
    // Clamp inputs to valid ranges
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const red = Math.max(0, Math.min(255, Math.round((r + m) * 255)));
    const green = Math.max(0, Math.min(255, Math.round((g + m) * 255)));
    const blue = Math.max(0, Math.min(255, Math.round((b + m) * 255)));

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

