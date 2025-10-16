import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class ImpossibleGeometry implements Pattern {
  public name = 'Impossible Geometry';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private shapeType: number = 0; // 0-4 different impossible shapes
  private rotation: number = 0;
  private scale: number = 1;
  private warpAmount: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Click changes shape
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.shapeType = (this.shapeType + 1) % 5;
      }
    });

    // Rotation driven by audio
    this.rotation += dt * (0.5 + audio.treble * 2);

    // Scale pulses with audio
    const targetScale = 1 + audio.rms * 0.3 + (audio.beat ? 0.2 : 0);
    this.scale += (targetScale - this.scale) * 5 * dt;

    // Warp amount from audio
    this.warpAmount = audio.bass * 50 + audio.centroid * 30;

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.3 * this.scale;

    const hue = (this.time * 50 + audio.centroid * 180) % 360;

    switch (this.shapeType) {
      case 0:
        this.drawPenroseTriangle(centerX, centerY, size, this.rotation, hue, audio);
        break;
      case 1:
        this.drawImpossibleCube(centerX, centerY, size, this.rotation, hue, audio);
        break;
      case 2:
        this.drawEscherStairs(centerX, centerY, size, this.rotation, hue, audio);
        break;
      case 3:
        this.drawBlivetFork(centerX, centerY, size, this.rotation, hue, audio);
        break;
      case 4:
        this.drawNeckerCube(centerX, centerY, size, this.rotation, hue, audio);
        break;
    }

    // Draw shape name indicator
    // Just draw a small indicator dot (since we can't render text)
    const indicatorColor = hslToHex(hue, 70, 50);
    this.graphics.beginFill(indicatorColor, 0.5);
    this.graphics.drawCircle(width - 30, 30, 8 + audio.rms * 5);
    this.graphics.endFill();
  }

  private drawPenroseTriangle(x: number, y: number, size: number, rotation: number, hue: number, audio: AudioData): void {
    const color1 = hslToHex(hue, 70, 40);
    const color2 = hslToHex((hue + 120) % 360, 70, 50);
    const color3 = hslToHex((hue + 240) % 360, 70, 60);

    const r = size;
    const innerR = r * 0.6;
    const thickness = r * 0.15 + audio.rms * 20;

    // Three corners of the triangle
    const corners = [
      { x: x + Math.cos(rotation) * r, y: y + Math.sin(rotation) * r },
      { x: x + Math.cos(rotation + Math.PI * 2 / 3) * r, y: y + Math.sin(rotation + Math.PI * 2 / 3) * r },
      { x: x + Math.cos(rotation + Math.PI * 4 / 3) * r, y: y + Math.sin(rotation + Math.PI * 4 / 3) * r },
    ];

    // Draw three bars with gradient shading to create illusion
    for (let i = 0; i < 3; i++) {
      const c1 = corners[i];
      const c2 = corners[(i + 1) % 3];

      // Calculate inner points
      const angle1 = Math.atan2(c2.y - c1.y, c2.x - c1.x);

      const inner1 = {
        x: c1.x + Math.cos(angle1) * thickness,
        y: c1.y + Math.sin(angle1) * thickness
      };

      // Draw one side of the bar
      const colors = [color1, color2, color3];
      this.graphics.beginFill(colors[i], 0.9);
      this.graphics.moveTo(c1.x, c1.y);
      this.graphics.lineTo(c2.x, c2.y);
      this.graphics.lineTo(c2.x + Math.cos(angle1 + Math.PI / 2) * thickness, c2.y + Math.sin(angle1 + Math.PI / 2) * thickness);
      this.graphics.lineTo(inner1.x + Math.cos(angle1) * (innerR - thickness), inner1.y + Math.sin(angle1) * (innerR - thickness));
      this.graphics.closePath();
      this.graphics.endFill();

      // Draw glow
      this.graphics.lineStyle(3, colors[i], 0.3);
      this.graphics.moveTo(c1.x, c1.y);
      this.graphics.lineTo(c2.x, c2.y);
    }
  }

  private drawImpossibleCube(x: number, y: number, size: number, _rotation: number, hue: number, audio: AudioData): void {
    const s = size * 0.7;
    const warp = this.warpAmount * 0.3;

    const color1 = hslToHex(hue, 70, 50);
    const color2 = hslToHex((hue + 60) % 360, 70, 40);
    const color3 = hslToHex((hue + 120) % 360, 70, 60);

    // Front face (shifted by warp)
    this.graphics.beginFill(color1, 0.8);
    this.graphics.moveTo(x - s + warp, y - s + warp);
    this.graphics.lineTo(x + s + warp, y - s + warp);
    this.graphics.lineTo(x + s + warp, y + s + warp);
    this.graphics.lineTo(x - s + warp, y + s + warp);
    this.graphics.closePath();
    this.graphics.endFill();

    // Back face (creates impossibility)
    this.graphics.beginFill(color2, 0.7);
    this.graphics.moveTo(x - s - warp, y - s - warp);
    this.graphics.lineTo(x + s - warp, y - s - warp);
    this.graphics.lineTo(x + s - warp, y + s - warp);
    this.graphics.lineTo(x - s - warp, y + s - warp);
    this.graphics.closePath();
    this.graphics.endFill();

    // Connecting edges (create the paradox)
    this.graphics.lineStyle(4 + audio.rms * 3, color3, 0.9);
    this.graphics.moveTo(x - s + warp, y - s + warp);
    this.graphics.lineTo(x - s - warp, y - s - warp);
    this.graphics.moveTo(x + s + warp, y - s + warp);
    this.graphics.lineTo(x + s - warp, y - s - warp);
    this.graphics.moveTo(x + s + warp, y + s + warp);
    this.graphics.lineTo(x + s - warp, y + s - warp);
    this.graphics.moveTo(x - s + warp, y + s + warp);
    this.graphics.lineTo(x - s - warp, y + s - warp);
  }

  private drawEscherStairs(x: number, y: number, size: number, rotation: number, hue: number, _audio: AudioData): void {
    const steps = 4;
    const stepSize = size / steps;
    const thickness = stepSize * 0.8;

    for (let i = 0; i < steps; i++) {
      const angle = rotation + (i / steps) * Math.PI * 2;
      const color = hslToHex((hue + i * 90) % 360, 70, 50 - i * 5);
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dist = i * stepSize;

      // Horizontal step
      this.graphics.beginFill(color, 0.8);
      this.graphics.moveTo(x + cos * dist, y + sin * dist);
      this.graphics.lineTo(x + cos * dist + stepSize * Math.cos(angle + Math.PI / 2), y + sin * dist + stepSize * Math.sin(angle + Math.PI / 2));
      this.graphics.lineTo(x + cos * (dist + stepSize) + stepSize * Math.cos(angle + Math.PI / 2), y + sin * (dist + stepSize) + stepSize * Math.sin(angle + Math.PI / 2));
      this.graphics.lineTo(x + cos * (dist + stepSize), y + sin * (dist + stepSize));
      this.graphics.closePath();
      this.graphics.endFill();

      // Vertical riser
      const darkerColor = hslToHex((hue + i * 90) % 360, 70, 40 - i * 5);
      this.graphics.beginFill(darkerColor, 0.8);
      this.graphics.moveTo(x + cos * (dist + stepSize), y + sin * (dist + stepSize));
      this.graphics.lineTo(x + cos * (dist + stepSize) + thickness * Math.cos(angle + Math.PI / 2), y + sin * (dist + stepSize) + thickness * Math.sin(angle + Math.PI / 2));
      this.graphics.lineTo(x + cos * (dist + stepSize) + thickness * Math.cos(angle + Math.PI / 2) + stepSize * cos, y + sin * (dist + stepSize) + thickness * Math.sin(angle + Math.PI / 2) + stepSize * sin);
      this.graphics.lineTo(x + cos * (dist + stepSize) + stepSize * cos, y + sin * (dist + stepSize) + stepSize * sin);
      this.graphics.closePath();
      this.graphics.endFill();
    }

    // Close the loop impossibly
    this.graphics.lineStyle(3, hslToHex(hue, 80, 60), 0.6);
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + Math.cos(rotation) * size, y + Math.sin(rotation) * size);
  }

  private drawBlivetFork(x: number, y: number, size: number, _rotation: number, hue: number, _audio: AudioData): void {
    const color1 = hslToHex(hue, 70, 50);
    const color2 = hslToHex((hue + 60) % 360, 70, 60);
    const prongWidth = size * 0.15;
    const prongLength = size * 1.2;

    // Three prongs at the top
    for (let i = 0; i < 3; i++) {
      const offsetX = (i - 1) * prongWidth * 1.5;
      
      this.graphics.beginFill(i % 2 === 0 ? color1 : color2, 0.8);
      this.graphics.moveTo(x + offsetX - prongWidth / 2, y - prongLength / 2);
      this.graphics.lineTo(x + offsetX + prongWidth / 2, y - prongLength / 2);
      this.graphics.lineTo(x + offsetX + prongWidth / 2, y + prongLength / 2);
      this.graphics.lineTo(x + offsetX - prongWidth / 2, y + prongLength / 2);
      this.graphics.closePath();
      this.graphics.endFill();
    }

    // Two prongs at the bottom (creating the impossibility)
    for (let i = 0; i < 2; i++) {
      const offsetX = (i - 0.5) * prongWidth * 2;
      const warp = this.warpAmount * 0.2 * (i === 0 ? 1 : -1);
      
      this.graphics.beginFill(color1, 0.7);
      this.graphics.moveTo(x + offsetX - prongWidth / 2 + warp, y);
      this.graphics.lineTo(x + offsetX + prongWidth / 2 + warp, y);
      this.graphics.lineTo(x + offsetX + prongWidth / 2 + warp, y + prongLength / 2);
      this.graphics.lineTo(x + offsetX - prongWidth / 2 + warp, y + prongLength / 2);
      this.graphics.closePath();
      this.graphics.endFill();
    }

    // Connecting section (the paradox)
    this.graphics.lineStyle(3, hslToHex(hue, 80, 70), 0.8);
    this.graphics.moveTo(x - prongWidth, y - prongLength / 4);
    this.graphics.lineTo(x + prongWidth, y);
  }

  private drawNeckerCube(x: number, y: number, size: number, _rotation: number, hue: number, audio: AudioData): void {
    const s = size * 0.6;
    const offset = s * 0.4;
    const color = hslToHex(hue, 70, 50);
    const lineWidth = 4 + audio.rms * 3;

    // Front face
    this.graphics.lineStyle(lineWidth, color, 0.9);
    this.graphics.moveTo(x - s, y - s);
    this.graphics.lineTo(x + s, y - s);
    this.graphics.lineTo(x + s, y + s);
    this.graphics.lineTo(x - s, y + s);
    this.graphics.closePath();

    // Back face (offset)
    this.graphics.lineStyle(lineWidth, color, 0.6);
    this.graphics.moveTo(x - s + offset, y - s + offset);
    this.graphics.lineTo(x + s + offset, y - s + offset);
    this.graphics.lineTo(x + s + offset, y + s + offset);
    this.graphics.lineTo(x - s + offset, y + s + offset);
    this.graphics.closePath();

    // Connecting edges (ambiguous depth)
    // Selectively draw edges to create ambiguity
    const warp = Math.sin(this.time * 2) * 10 + this.warpAmount * 0.1;
    
    this.graphics.lineStyle(lineWidth, color, 0.8);
    this.graphics.moveTo(x - s, y - s);
    this.graphics.lineTo(x - s + offset + warp, y - s + offset);
    
    this.graphics.moveTo(x + s, y - s);
    this.graphics.lineTo(x + s + offset - warp, y - s + offset);
    
    this.graphics.moveTo(x + s, y + s);
    this.graphics.lineTo(x + s + offset, y + s + offset);
    
    this.graphics.moveTo(x - s, y + s);
    this.graphics.lineTo(x - s + offset, y + s + offset);

    // Add dots at corners to enhance ambiguity
    const dotColor = hslToHex((hue + 180) % 360, 100, 70);
    [
      [x - s, y - s], [x + s, y - s], [x + s, y + s], [x - s, y + s],
      [x - s + offset, y - s + offset], [x + s + offset, y - s + offset],
      [x + s + offset, y + s + offset], [x - s + offset, y + s + offset]
    ].forEach(([px, py]) => {
      this.graphics.beginFill(dotColor, 0.8);
      this.graphics.drawCircle(px, py, 6 + (audio.beat ? 3 : 0));
      this.graphics.endFill();
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

