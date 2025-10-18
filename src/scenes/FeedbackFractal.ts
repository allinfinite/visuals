import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class FeedbackFractal implements Pattern {
  public name = 'Feedback Fractal';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private fractalType: number = 0; // 0: Tree, 1: Sierpinski, 2: Koch, 3: Circles, 4: Squares
  private growthPhase: number = 0; // Animated growth from 0 to maxDepth
  private maxDepth: number = 10;
  private branchAngle: number = Math.PI / 6; // 30 degrees
  private clickCooldown: number = 0;
  private zoomLevel: number = 1;
  private panX: number = 0;
  private panY: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update click cooldown
    this.clickCooldown = Math.max(0, this.clickCooldown - dt);

    // Click changes fractal type
    if (this.clickCooldown <= 0) {
      for (const click of input.clicks) {
        const age = this.time - click.time;
        if (age < 0.05) {
          let newType = this.fractalType;
          while (newType === this.fractalType) {
            newType = Math.floor(Math.random() * 5);
          }
          this.fractalType = newType;
          this.growthPhase = 0; // Reset growth
          this.zoomLevel = 1;
          this.panX = 0;
          this.panY = 0;
          this.clickCooldown = 1.0;
          break;
        }
      }
    }

    // Animate growth
    this.growthPhase += dt * 2; // Grow over 5 seconds
    if (this.growthPhase > this.maxDepth) {
      this.growthPhase = this.maxDepth;
    }

    // No zoom or pan - keep it simple
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;

    // Audio controls branch angle
    this.branchAngle = (Math.PI / 6) * (1 + audio.treble * 0.4);

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const baseHue = (this.time * 20) % 360;
    const initialLength = Math.min(width, height) * 0.2;

    // Calculate transformed center position with zoom and pan
    const drawX = centerX + this.panX;
    const drawY = centerY + this.panY;

    // Apply zoom by scaling drawing coordinates
    const scaledLength = initialLength / this.zoomLevel;

    // Define multiple duplicates at different angles and positions
    const duplicates = [
      { angleOffset: 0, scale: 1.0, hueOffset: 0, xOffset: 0, yOffset: 0 },
      { angleOffset: Math.PI * 2 / 3, scale: 0.75, hueOffset: 120, xOffset: 0, yOffset: 0 },
      { angleOffset: Math.PI * 4 / 3, scale: 0.75, hueOffset: 240, xOffset: 0, yOffset: 0 },
    ];

    // Draw each duplicate
    for (const dup of duplicates) {
      const dupX = drawX + dup.xOffset;
      const dupY = drawY + dup.yOffset;
      const dupLength = scaledLength * dup.scale;
      const dupHue = (baseHue + dup.hueOffset) % 360;

      switch (this.fractalType) {
        case 0: // Fractal Tree
          this.drawTree(dupX, dupY + dupLength * 0.5, -Math.PI / 2 + dup.angleOffset, dupLength, 0, dupHue, audio);
          break;
        case 1: // Sierpinski Triangle
          const size = dupLength * 2;
          const angle = dup.angleOffset;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const p1x = dupX + 0 * cos - (-size * 0.6) * sin;
          const p1y = dupY + 0 * sin + (-size * 0.6) * cos;
          const p2x = dupX + (-size) * cos - (size * 0.4) * sin;
          const p2y = dupY + (-size) * sin + (size * 0.4) * cos;
          const p3x = dupX + size * cos - (size * 0.4) * sin;
          const p3y = dupY + size * sin + (size * 0.4) * cos;
          this.drawSierpinski(p1x, p1y, p2x, p2y, p3x, p3y, 0, dupHue, audio);
          break;
        case 2: // Koch Snowflake
          this.graphics.pivot.set(dupX, dupY);
          this.graphics.rotation = dup.angleOffset;
          this.drawKochSnowflake(dupX, dupY, dupLength * 1.5, dupHue, audio);
          this.graphics.rotation = 0;
          this.graphics.pivot.set(0, 0);
          break;
        case 3: // Recursive Circles
          this.drawRecursiveCircles(dupX, dupY, dupLength, 0, dupHue, audio);
          break;
        case 4: // Pythagoras Tree
          this.drawPythagorasTree(dupX, dupY + dupLength * 0.4, dupLength, -Math.PI / 2 + dup.angleOffset, 0, dupHue, audio);
          break;
      }
    }

    // Draw indicators
    const indicatorY = 30;
    const color = hslToHex(baseHue, 70, 50);
    
    for (let i = 0; i < 5; i++) {
      const alpha = i === this.fractalType ? 0.8 : 0.2;
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(30 + i * 20, indicatorY, 5);
      this.graphics.endFill();
    }
    
    // Growth indicator
    const barWidth = 80;
    const barX = width - barWidth - 20;
    const barY = 30;
    
    this.graphics.lineStyle(2, 0xffffff, 0.3);
    this.graphics.drawRect(barX, barY - 5, barWidth, 8);
    
    this.graphics.beginFill(hslToHex((baseHue + 60) % 360, 70, 50), 0.7);
    this.graphics.drawRect(barX, barY - 5, barWidth * Math.min(1, this.growthPhase / this.maxDepth), 8);
    this.graphics.endFill();
  }

  private drawTree(x: number, y: number, angle: number, length: number, depth: number, baseHue: number, audio: AudioData): void {
    if (length < 2) return;
    
    // Draw branches at this depth if they're within the growth window
    // Early depths appear first, then middle, then deepest
    const depthProgress = depth / this.maxDepth;
    const growthWindow = Math.abs(depthProgress - 0.5) * 2; // 0 at middle, 1 at extremes
    const isVisible = this.growthPhase > growthWindow * this.maxDepth;
    
    if (!isVisible) {
      // Still recurse to draw deeper/shallower branches
      const newLength = length * 0.67;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      this.drawTree(endX, endY, angle - this.branchAngle, newLength, depth + 1, baseHue, audio);
      this.drawTree(endX, endY, angle + this.branchAngle, newLength, depth + 1, baseHue, audio);
      return;
    }

    const hue = (baseHue + depth * 30) % 360;
    const color = hslToHex(hue, 80, 60);
    const alpha = Math.min(1, 0.9 - depth * 0.05 + (audio.beat ? 0.1 : 0));
    const lineWidth = Math.max(0.5, 10 - depth * 1);

    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    this.graphics.lineStyle(lineWidth, color, alpha);
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(endX, endY);

    const newLength = length * 0.67;
    this.drawTree(endX, endY, angle - this.branchAngle, newLength, depth + 1, baseHue, audio);
    this.drawTree(endX, endY, angle + this.branchAngle, newLength, depth + 1, baseHue, audio);
  }

  private drawSierpinski(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, depth: number, baseHue: number, audio: AudioData): void {
    const size = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (size < 3) return;

    // Draw triangles from middle outward/inward simultaneously
    const depthProgress = depth / this.maxDepth;
    const growthWindow = Math.abs(depthProgress - 0.5) * 2;
    const isVisible = this.growthPhase > growthWindow * this.maxDepth;
    
    if (!isVisible) {
      // Still recurse to draw other depths
      const mx1 = (x1 + x2) / 2;
      const my1 = (y1 + y2) / 2;
      const mx2 = (x2 + x3) / 2;
      const my2 = (y2 + y3) / 2;
      const mx3 = (x3 + x1) / 2;
      const my3 = (y3 + y1) / 2;

      this.drawSierpinski(x1, y1, mx1, my1, mx3, my3, depth + 1, baseHue, audio);
      this.drawSierpinski(mx1, my1, x2, y2, mx2, my2, depth + 1, baseHue, audio);
      this.drawSierpinski(mx3, my3, mx2, my2, x3, y3, depth + 1, baseHue, audio);
      return;
    }

    const hue = (baseHue + depth * 30) % 360;
    const color = hslToHex(hue, 80, 60);
    const alpha = 0.7 - depth * 0.05;

    this.graphics.lineStyle(2, color, alpha);
    this.graphics.moveTo(x1, y1);
    this.graphics.lineTo(x2, y2);
    this.graphics.lineTo(x3, y3);
    this.graphics.lineTo(x1, y1);

    const mx1 = (x1 + x2) / 2;
    const my1 = (y1 + y2) / 2;
    const mx2 = (x2 + x3) / 2;
    const my2 = (y2 + y3) / 2;
    const mx3 = (x3 + x1) / 2;
    const my3 = (y3 + y1) / 2;

    this.drawSierpinski(x1, y1, mx1, my1, mx3, my3, depth + 1, baseHue, audio);
    this.drawSierpinski(mx1, my1, x2, y2, mx2, my2, depth + 1, baseHue, audio);
    this.drawSierpinski(mx3, my3, mx2, my2, x3, y3, depth + 1, baseHue, audio);
  }

  private drawKochSnowflake(x: number, y: number, size: number, baseHue: number, audio: AudioData): void {
    const h = size * Math.sin(Math.PI / 3);
    const x1 = x - size / 2;
    const y1 = y + h / 2;
    const x2 = x + size / 2;
    const y2 = y + h / 2;
    const x3 = x;
    const y3 = y - h / 2;

    this.drawKochLine(x1, y1, x2, y2, 0, baseHue, audio);
    this.drawKochLine(x2, y2, x3, y3, 0, baseHue, audio);
    this.drawKochLine(x3, y3, x1, y1, 0, baseHue, audio);
  }

  private drawKochLine(x1: number, y1: number, x2: number, y2: number, depth: number, baseHue: number, audio: AudioData): void {
    const segmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (segmentLength < 3) {
      const hue = (baseHue + depth * 30) % 360;
      const color = hslToHex(hue, 80, 60);
      this.graphics.lineStyle(2, color, 0.8);
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      return;
    }

    // Draw segments from middle outward/inward simultaneously
    const depthProgress = depth / this.maxDepth;
    const growthWindow = Math.abs(depthProgress - 0.5) * 2;
    const isVisible = this.growthPhase > growthWindow * this.maxDepth;
    
    if (!isVisible) {
      // Still recurse to draw other depths
      const dx = (x2 - x1) / 3;
      const dy = (y2 - y1) / 3;
      const px1 = x1 + dx;
      const py1 = y1 + dy;
      const px2 = x1 + 2 * dx;
      const py2 = y1 + 2 * dy;
      const angle = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 3;
      const peakX = px1 + segmentLength / 3 * Math.cos(angle);
      const peakY = py1 + segmentLength / 3 * Math.sin(angle);

      this.drawKochLine(x1, y1, px1, py1, depth + 1, baseHue, audio);
      this.drawKochLine(px1, py1, peakX, peakY, depth + 1, baseHue, audio);
      this.drawKochLine(peakX, peakY, px2, py2, depth + 1, baseHue, audio);
      this.drawKochLine(px2, py2, x2, y2, depth + 1, baseHue, audio);
      return;
    }

    const hue = (baseHue + depth * 30) % 360;
    const color = hslToHex(hue, 80, 60);
    this.graphics.lineStyle(2, color, 0.8);
    this.graphics.moveTo(x1, y1);
    this.graphics.lineTo(x2, y2);

    const dx = (x2 - x1) / 3;
    const dy = (y2 - y1) / 3;

    const px1 = x1 + dx;
    const py1 = y1 + dy;
    const px2 = x1 + 2 * dx;
    const py2 = y1 + 2 * dy;

    const angle = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 3;
    const peakX = px1 + segmentLength / 3 * Math.cos(angle);
    const peakY = py1 + segmentLength / 3 * Math.sin(angle);

    this.drawKochLine(x1, y1, px1, py1, depth + 1, baseHue, audio);
    this.drawKochLine(px1, py1, peakX, peakY, depth + 1, baseHue, audio);
    this.drawKochLine(peakX, peakY, px2, py2, depth + 1, baseHue, audio);
    this.drawKochLine(px2, py2, x2, y2, depth + 1, baseHue, audio);
  }

  private drawRecursiveCircles(x: number, y: number, radius: number, depth: number, baseHue: number, audio: AudioData): void {
    if (radius < 3) return;

    // Draw circles from middle outward/inward simultaneously
    const depthProgress = depth / this.maxDepth;
    const growthWindow = Math.abs(depthProgress - 0.5) * 2;
    const isVisible = this.growthPhase > growthWindow * this.maxDepth;
    
    if (!isVisible) {
      // Still recurse to draw other depths
      const newRadius = radius * 0.5;
      const angleStep = Math.PI * 2 / 6;
      for (let i = 0; i < 6; i++) {
        const angle = angleStep * i;
        const nx = x + Math.cos(angle) * (radius - newRadius);
        const ny = y + Math.sin(angle) * (radius - newRadius);
        this.drawRecursiveCircles(nx, ny, newRadius, depth + 1, baseHue, audio);
      }
      return;
    }

    const hue = (baseHue + depth * 30) % 360;
    const color = hslToHex(hue, 80, 60);
    const alpha = 0.7 - depth * 0.05;

    this.graphics.lineStyle(2, color, alpha);
    this.graphics.drawCircle(x, y, radius);

    const newRadius = radius * 0.5;
    const angleStep = Math.PI * 2 / 6;

    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i;
      const nx = x + Math.cos(angle) * (radius - newRadius);
      const ny = y + Math.sin(angle) * (radius - newRadius);
      this.drawRecursiveCircles(nx, ny, newRadius, depth + 1, baseHue, audio);
    }
  }

  private drawPythagorasTree(x: number, y: number, size: number, angle: number, depth: number, baseHue: number, audio: AudioData): void {
    if (size < 2) return;

    // Draw squares from middle outward/inward simultaneously
    const depthProgress = depth / this.maxDepth;
    const growthWindow = Math.abs(depthProgress - 0.5) * 2;
    const isVisible = this.growthPhase > growthWindow * this.maxDepth;
    
    if (!isVisible) {
      // Still recurse to draw other depths
      const newSize = size * 0.7;
      const branchAngle = Math.PI / 4;
      const halfSize = size / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x1 = x - halfSize * cos;
      const y1 = y - halfSize * sin;
      const x4 = x1 + halfSize * sin;
      const y4 = y1 - halfSize * cos;
      const x2 = x + halfSize * cos;
      const y2 = y + halfSize * sin;
      const x3 = x2 + halfSize * sin;
      const y3 = y2 - halfSize * cos;
      const topCenterX = (x3 + x4) / 2;
      const topCenterY = (y3 + y4) / 2;

      this.drawPythagorasTree(topCenterX, topCenterY, newSize, angle - branchAngle, depth + 1, baseHue, audio);
      this.drawPythagorasTree(topCenterX, topCenterY, newSize, angle + branchAngle, depth + 1, baseHue, audio);
      return;
    }

    const hue = (baseHue + depth * 30) % 360;
    const color = hslToHex(hue, 80, 60);
    const alpha = 0.8 - depth * 0.05;

    const halfSize = size / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const x1 = x - halfSize * cos;
    const y1 = y - halfSize * sin;
    const x2 = x + halfSize * cos;
    const y2 = y + halfSize * sin;
    const x3 = x2 + halfSize * sin;
    const y3 = y2 - halfSize * cos;
    const x4 = x1 + halfSize * sin;
    const y4 = y1 - halfSize * cos;

    this.graphics.beginFill(color, alpha);
    this.graphics.lineStyle(1, color, alpha);
    this.graphics.moveTo(x1, y1);
    this.graphics.lineTo(x2, y2);
    this.graphics.lineTo(x3, y3);
    this.graphics.lineTo(x4, y4);
    this.graphics.lineTo(x1, y1);
    this.graphics.endFill();

    const newSize = size * 0.7;
    const branchAngle = Math.PI / 4;

    const topCenterX = (x3 + x4) / 2;
    const topCenterY = (y3 + y4) / 2;

    this.drawPythagorasTree(topCenterX, topCenterY, newSize, angle - branchAngle, depth + 1, baseHue, audio);
    this.drawPythagorasTree(topCenterX, topCenterY, newSize, angle + branchAngle, depth + 1, baseHue, audio);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
