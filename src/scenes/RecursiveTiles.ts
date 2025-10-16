import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface Tile {
  x: number;
  y: number;
  size: number;
  depth: number;
  rotation: number;
  hue: number;
  alpha: number;
}

export class RecursiveTiles implements Pattern {
  public name = 'Recursive Tiles';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private zoomLevel: number = 1;
  private zoomSpeed: number = 0.3;
  private maxDepth: number = 5;
  private tiles: Tile[] = [];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.generateTiles();
  }

  private generateTiles(): void {
    this.tiles = [];
    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;
    const baseSize = Math.min(this.context.width, this.context.height) * 0.8;

    this.addTileRecursive(centerX, centerY, baseSize, 0, 0, 0);
  }

  private addTileRecursive(
    x: number,
    y: number,
    size: number,
    depth: number,
    rotation: number,
    hue: number
  ): void {
    if (depth > this.maxDepth || size < 2) return;

    this.tiles.push({
      x,
      y,
      size,
      depth,
      rotation,
      hue,
      alpha: 1 - depth / (this.maxDepth + 2),
    });

    // Subdivide into 4 smaller tiles
    if (depth < this.maxDepth) {
      const newSize = size * 0.45;
      const offset = size * 0.25;
      const newHue = (hue + 30) % 360;
      const newRotation = rotation + 0.1;

      this.addTileRecursive(x - offset, y - offset, newSize, depth + 1, newRotation, newHue);
      this.addTileRecursive(x + offset, y - offset, newSize, depth + 1, newRotation, newHue);
      this.addTileRecursive(x - offset, y + offset, newSize, depth + 1, newRotation, newHue);
      this.addTileRecursive(x + offset, y + offset, newSize, depth + 1, newRotation, newHue);
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Zoom oscillates with audio
    const zoomTarget = 1 + Math.sin(this.time * this.zoomSpeed) * 0.5 + audio.rms * 0.5;
    this.zoomLevel += (zoomTarget - this.zoomLevel) * 2 * dt;

    // Zoom speed affected by audio
    this.zoomSpeed = 0.3 + audio.bass * 0.7;

    // Beat resets zoom
    if (audio.beat) {
      this.zoomLevel = 0.5;
      this.generateTiles(); // Regenerate with slight variation
    }

    // Click resets scale and regenerates
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.zoomLevel = 0.2;
        this.maxDepth = Math.floor(4 + Math.random() * 3);
        this.generateTiles();
      }
    });

    // Update tile properties
    this.tiles.forEach((tile) => {
      // Rotate tiles
      tile.rotation += (0.2 + audio.treble * 0.5) * dt * (1 - tile.depth / this.maxDepth);
      
      // Hue shift
      tile.hue = (tile.hue + dt * 20 + audio.centroid * 30) % 360;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;

    // Draw tiles from deepest to shallowest
    const sortedTiles = [...this.tiles].sort((a, b) => b.depth - a.depth);

    sortedTiles.forEach((tile) => {
      // Apply zoom
      const scale = this.zoomLevel ** (this.maxDepth - tile.depth + 1);
      const scaledSize = tile.size * scale;
      
      // Position relative to center
      const dx = tile.x - centerX;
      const dy = tile.y - centerY;
      const scaledX = centerX + dx * scale;
      const scaledY = centerY + dy * scale;

      // Skip if too small or off screen
      if (scaledSize < 1) return;
      if (
        scaledX + scaledSize < 0 ||
        scaledX - scaledSize > this.context.width ||
        scaledY + scaledSize < 0 ||
        scaledY - scaledSize > this.context.height
      ) {
        return;
      }

      // Color based on depth and hue
      const lightness = 40 + (1 - tile.depth / this.maxDepth) * 40;
      const color = this.hslToHex(tile.hue, 80, lightness);
      const alpha = tile.alpha * (0.6 + audio.rms * 0.4);

      // Draw tile as rotated square
      this.drawRotatedSquare(
        scaledX,
        scaledY,
        scaledSize,
        tile.rotation,
        color,
        alpha,
        audio
      );

      // Draw border
      this.graphics.lineStyle(
        1 + scale,
        this.hslToHex(tile.hue, 60, 80),
        alpha * 0.8
      );
      this.drawRotatedSquareOutline(scaledX, scaledY, scaledSize, tile.rotation);

      // Draw center dot for deepest tiles
      if (tile.depth === this.maxDepth) {
        const dotSize = scaledSize * 0.15 * (1 + (audio.beat ? 0.5 : 0));
        this.graphics.beginFill(0xffffff, alpha);
        this.graphics.drawCircle(scaledX, scaledY, dotSize);
        this.graphics.endFill();
      }
    });

    // Draw center indicator
    const pulseSize = 5 + Math.sin(this.time * 3) * 2 + audio.bass * 5;
    this.graphics.beginFill(0xffffff, 0.5);
    this.graphics.drawCircle(centerX, centerY, pulseSize);
    this.graphics.endFill();
  }

  private drawRotatedSquare(
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: number,
    alpha: number,
    _audio: AudioData
  ): void {
    this.graphics.beginFill(color, alpha);

    const halfSize = size / 2;
    const corners = [
      { x: -halfSize, y: -halfSize },
      { x: halfSize, y: -halfSize },
      { x: halfSize, y: halfSize },
      { x: -halfSize, y: halfSize },
    ];

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    corners.forEach((corner, i) => {
      const rotatedX = corner.x * cos - corner.y * sin + x;
      const rotatedY = corner.x * sin + corner.y * cos + y;

      if (i === 0) {
        this.graphics.moveTo(rotatedX, rotatedY);
      } else {
        this.graphics.lineTo(rotatedX, rotatedY);
      }
    });

    this.graphics.closePath();
    this.graphics.endFill();
  }

  private drawRotatedSquareOutline(
    x: number,
    y: number,
    size: number,
    rotation: number
  ): void {
    const halfSize = size / 2;
    const corners = [
      { x: -halfSize, y: -halfSize },
      { x: halfSize, y: -halfSize },
      { x: halfSize, y: halfSize },
      { x: -halfSize, y: halfSize },
    ];

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    corners.forEach((corner, i) => {
      const rotatedX = corner.x * cos - corner.y * sin + x;
      const rotatedY = corner.x * sin + corner.y * cos + y;

      if (i === 0) {
        this.graphics.moveTo(rotatedX, rotatedY);
      } else {
        this.graphics.lineTo(rotatedX, rotatedY);
      }
    });

    this.graphics.closePath();
  }

  private hslToHex(h: number, s: number, l: number): number {
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

    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

