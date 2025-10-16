import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';
import { hslToHex } from '../utils/color';

export class TerrainMorph implements Pattern {
  public name = 'Terrain Morph';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private resolution: number = 60;
  private heights: number[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initializeTerrain();
  }

  private initializeTerrain(): void {
    this.heights = [];
    for (let i = 0; i <= this.resolution; i++) {
      this.heights[i] = 0;
    }
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;

    // Update terrain heights based on noise and audio
    const timeOffset = this.time * 0.3;
    const bassHeight = audio.bass * 200; // Bass controls height variation
    const rmsScale = 0.5 + audio.rms * 2; // RMS controls overall amplitude

    for (let i = 0; i <= this.resolution; i++) {
      const x = i / this.resolution;
      
      // Multiple octaves of noise
      const noise1 = noise2D(x * 3 + timeOffset, 0) * 0.5;
      const noise2 = noise2D(x * 6 + timeOffset * 1.5, 100) * 0.25;
      const noise3 = noise2D(x * 12 + timeOffset * 2, 200) * 0.125;
      
      const combinedNoise = (noise1 + noise2 + noise3) * rmsScale;
      
      // Height based on noise + audio
      this.heights[i] = combinedNoise * 150 + bassHeight;
      
      // Add beat spikes
      if (audio.beat && i % 5 === 0) {
        this.heights[i] += 50;
      }
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    const { width, height } = this.context;
    const centerY = height * 0.6;
    const stepX = width / this.resolution;

    // Draw multiple terrain layers (for depth effect)
    const layerCount = 3;
    
    for (let layer = 0; layer < layerCount; layer++) {
      const depth = layer / layerCount;
      const layerScale = 1 - depth * 0.4;
      const layerAlpha = 0.4 - depth * 0.1;
      const layerY = centerY + depth * 100;
      
      // Layer color (gradient from foreground to background)
      const hue = (180 + this.time * 20 + audio.centroid * 60 + layer * 20) % 360;
      const lightness = 30 + depth * 30 + audio.rms * 20;
      const color = hslToHex(hue, 70, lightness);

      // Draw filled terrain polygon
      this.graphics.beginFill(color, layerAlpha + audio.rms * 0.2);
      
      // Start from bottom left
      this.graphics.moveTo(0, height);
      
      // Trace terrain
      for (let i = 0; i <= this.resolution; i++) {
        const x = i * stepX;
        const terrainHeight = this.heights[i] * layerScale;
        const y = layerY - terrainHeight;
        
        if (i === 0) {
          this.graphics.lineTo(x, y);
        } else {
          // Smooth curve
          const prevX = (i - 1) * stepX;
          const prevHeight = this.heights[i - 1] * layerScale;
          const prevY = layerY - prevHeight;
          
          const cpX = (prevX + x) / 2;
          const cpY = (prevY + y) / 2;
          
          this.graphics.quadraticCurveTo(prevX, prevY, cpX, cpY);
          this.graphics.lineTo(x, y);
        }
      }
      
      // Close polygon to bottom right
      this.graphics.lineTo(width, height);
      this.graphics.lineTo(0, height);
      this.graphics.endFill();

      // Draw outline
      this.graphics.lineStyle(2, hslToHex(hue, 80, lightness + 20), layerAlpha * 1.5);
      this.graphics.moveTo(0, layerY - this.heights[0] * layerScale);
      
      for (let i = 1; i <= this.resolution; i++) {
        const x = i * stepX;
        const terrainHeight = this.heights[i] * layerScale;
        const y = layerY - terrainHeight;
        this.graphics.lineTo(x, y);
      }
    }

    // Draw horizon line
    this.graphics.lineStyle(2, 0xffffff, 0.2 + audio.rms * 0.2);
    this.graphics.moveTo(0, centerY);
    this.graphics.lineTo(width, centerY);

    // Draw peaks (highest points)
    for (let i = 1; i < this.resolution; i++) {
      if (this.heights[i] > this.heights[i-1] && this.heights[i] > this.heights[i+1]) {
        if (this.heights[i] > 100) {
          const x = i * stepX;
          const y = centerY - this.heights[i];
          const size = 5 + (audio.beat ? 5 : 0);
          
          this.graphics.beginFill(0xffffff, 0.8);
          this.graphics.drawCircle(x, y, size);
          this.graphics.endFill();

          // Peak glow
          this.graphics.beginFill(hslToHex((this.time * 100) % 360, 100, 70), 0.3);
          this.graphics.drawCircle(x, y, size * 2);
          this.graphics.endFill();
        }
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

