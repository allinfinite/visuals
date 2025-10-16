import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class FeedbackFractal implements Pattern {
  public name = 'Feedback Fractal';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private fractalType: number = 0; // 0: Tree, 1: Sierpinski, 2: Koch, 3: Dragon curve, 4: Spiral
  private maxDepth: number = 5;
  private branchAngle: number = Math.PI / 6; // 30 degrees
  private growthPhase: number = 0; // For animated growth

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Click changes fractal type
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.fractalType = (this.fractalType + 1) % 5;
        this.growthPhase = 0; // Reset growth animation
      }
    });

    // Growth phase for animated expansion (0 to 1)
    this.growthPhase = (this.time * 0.3) % 1;

    // Audio controls fractal parameters
    this.branchAngle = (Math.PI / 6) * (1 + audio.treble * 0.5); // 30-45 degrees
    this.maxDepth = Math.floor(4 + audio.rms * 3); // 4-7 levels based on volume

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const baseHue = (this.time * 20) % 360;
    const initialLength = Math.min(width, height) * 0.25;

    switch (this.fractalType) {
      case 0: // Fractal Tree
        this.drawFractalTree(centerX, height * 0.8, -Math.PI / 2, initialLength, 0, baseHue, audio);
        break;
      case 1: // Sierpinski Triangle
        this.drawSierpinski(
          centerX, height * 0.7, 
          centerX - initialLength * 1.5, height * 0.2,
          centerX + initialLength * 1.5, height * 0.2,
          0, baseHue, audio
        );
        break;
      case 2: // Koch Snowflake
        this.drawKochSnowflake(centerX, centerY, initialLength * 1.2, baseHue, audio);
        break;
      case 3: // Recursive Circles (Apollonian Gasket style)
        this.drawRecursiveCircles(centerX, centerY, initialLength, 0, baseHue, audio);
        break;
      case 4: // Recursive Squares (Pythagoras Tree style)
        this.drawPythagorasTree(centerX, height * 0.85, initialLength * 0.8, -Math.PI / 2, 0, baseHue, audio);
        break;
    }

    // Draw fractal type indicator
    const indicatorY = 30;
    const color = hslToHex(baseHue, 70, 50);
    
    for (let i = 0; i < 5; i++) {
      const alpha = i === this.fractalType ? 0.8 : 0.2;
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(30 + i * 20, indicatorY, 5);
      this.graphics.endFill();
    }
  }

  // Fractal Tree - classic recursive branching
  private drawFractalTree(x: number, y: number, angle: number, length: number, depth: number, baseHue: number, audio: AudioData): void {
    if (depth > this.maxDepth || length < 2) return;
    
    // Fade branches as they grow
    const depthProgress = depth / this.maxDepth;
    if (depthProgress > this.growthPhase) return; // Animated growth
    
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    
    const hue = (baseHue + depth * 30) % 360;
    const color = hslToHex(hue, 70, 50);
    const lineWidth = Math.max(1, 8 - depth * 1.2);
    const alpha = 0.9 - depth * 0.1;
    
    this.graphics.lineStyle(lineWidth, color, alpha);
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x2, y2);
    
    // Recursive branches
    const angleVariation = this.branchAngle * (1 + audio.bass * 0.3);
    const lengthRatio = 0.67 + audio.treble * 0.1;
    
    this.drawFractalTree(x2, y2, angle - angleVariation, length * lengthRatio, depth + 1, baseHue, audio);
    this.drawFractalTree(x2, y2, angle + angleVariation, length * lengthRatio, depth + 1, baseHue, audio);
  }

  // Sierpinski Triangle - recursive triangle subdivision
  private drawSierpinski(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, depth: number, baseHue: number, audio: AudioData): void {
    if (depth > this.maxDepth) return;
    
    const depthProgress = depth / this.maxDepth;
    if (depthProgress > this.growthPhase) return;
    
    const hue = (baseHue + depth * 40) % 360;
    const color = hslToHex(hue, 70, 50);
    const alpha = 0.8 - depth * 0.1;
    
    this.graphics.lineStyle(2, color, alpha);
    this.graphics.moveTo(x1, y1);
    this.graphics.lineTo(x2, y2);
    this.graphics.lineTo(x3, y3);
    this.graphics.lineTo(x1, y1);
    
    // Calculate midpoints
    const mid1x = (x1 + x2) / 2;
    const mid1y = (y1 + y2) / 2;
    const mid2x = (x2 + x3) / 2;
    const mid2y = (y2 + y3) / 2;
    const mid3x = (x3 + x1) / 2;
    const mid3y = (y3 + y1) / 2;
    
    // Recurse on three outer triangles
    this.drawSierpinski(x1, y1, mid1x, mid1y, mid3x, mid3y, depth + 1, baseHue, audio);
    this.drawSierpinski(mid1x, mid1y, x2, y2, mid2x, mid2y, depth + 1, baseHue, audio);
    this.drawSierpinski(mid3x, mid3y, mid2x, mid2y, x3, y3, depth + 1, baseHue, audio);
  }

  // Koch Snowflake - recursive line subdivision
  private drawKochSnowflake(cx: number, cy: number, radius: number, baseHue: number, audio: AudioData): void {
    // Start with equilateral triangle
    const angles = [Math.PI / 2, Math.PI / 2 + (Math.PI * 2 / 3), Math.PI / 2 + (Math.PI * 4 / 3)];
    
    for (let i = 0; i < 3; i++) {
      const x1 = cx + Math.cos(angles[i]) * radius;
      const y1 = cy + Math.sin(angles[i]) * radius;
      const x2 = cx + Math.cos(angles[(i + 1) % 3]) * radius;
      const y2 = cy + Math.sin(angles[(i + 1) % 3]) * radius;
      
      this.drawKochLine(x1, y1, x2, y2, 0, baseHue, audio);
    }
  }

  private drawKochLine(x1: number, y1: number, x2: number, y2: number, depth: number, baseHue: number, audio: AudioData): void {
    const maxKochDepth = Math.min(4, this.maxDepth);
    if (depth > maxKochDepth) {
      const hue = (baseHue + depth * 25) % 360;
      const color = hslToHex(hue, 70, 50);
      this.graphics.lineStyle(2, color, 0.8);
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      return;
    }
    
    const depthProgress = depth / maxKochDepth;
    if (depthProgress > this.growthPhase) {
      const hue = (baseHue + depth * 25) % 360;
      const color = hslToHex(hue, 70, 50);
      this.graphics.lineStyle(2, color, 0.8);
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      return;
    }
    
    // Divide line into thirds
    const dx = x2 - x1;
    const dy = y2 - y1;
    const x3 = x1 + dx / 3;
    const y3 = y1 + dy / 3;
    const x5 = x1 + dx * 2 / 3;
    const y5 = y1 + dy * 2 / 3;
    
    // Calculate peak of equilateral triangle
    const angle = Math.atan2(dy, dx) - Math.PI / 3;
    const length = Math.sqrt(dx * dx + dy * dy) / 3;
    const x4 = x3 + Math.cos(angle) * length;
    const y4 = y3 + Math.sin(angle) * length;
    
    // Recurse on four segments
    this.drawKochLine(x1, y1, x3, y3, depth + 1, baseHue, audio);
    this.drawKochLine(x3, y3, x4, y4, depth + 1, baseHue, audio);
    this.drawKochLine(x4, y4, x5, y5, depth + 1, baseHue, audio);
    this.drawKochLine(x5, y5, x2, y2, depth + 1, baseHue, audio);
  }

  // Recursive Circles - Apollonian gasket style
  private drawRecursiveCircles(x: number, y: number, radius: number, depth: number, baseHue: number, audio: AudioData): void {
    if (depth > this.maxDepth || radius < 3) return;
    
    const depthProgress = depth / this.maxDepth;
    if (depthProgress > this.growthPhase) return;
    
    const hue = (baseHue + depth * 35) % 360;
    const color = hslToHex(hue, 70, 50);
    const alpha = 0.7 - depth * 0.08;
    
    this.graphics.lineStyle(2, color, alpha);
    this.graphics.drawCircle(x, y, radius);
    
    // Draw smaller circles around the perimeter
    const childRadius = radius * 0.35;
    const angleOffset = this.time + depth;
    const count = 6;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + angleOffset;
      const distance = radius - childRadius;
      const cx = x + Math.cos(angle) * distance;
      const cy = y + Math.sin(angle) * distance;
      
      this.drawRecursiveCircles(cx, cy, childRadius, depth + 1, baseHue, audio);
    }
  }

  // Pythagoras Tree - recursive squares
  private drawPythagorasTree(x: number, y: number, size: number, angle: number, depth: number, baseHue: number, audio: AudioData): void {
    if (depth > this.maxDepth || size < 3) return;
    
    const depthProgress = depth / this.maxDepth;
    if (depthProgress > this.growthPhase) return;
    
    const hue = (baseHue + depth * 30) % 360;
    const color = hslToHex(hue, 70, 50);
    const fillColor = hslToHex(hue, 80, 40);
    const alpha = 0.8 - depth * 0.1;
    
    // Draw square
    this.graphics.lineStyle(1, color, alpha);
    this.graphics.beginFill(fillColor, alpha * 0.3);
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const corners = [
      { x: 0, y: 0 },
      { x: size, y: 0 },
      { x: size, y: -size },
      { x: 0, y: -size }
    ];
    
    corners.forEach((corner, i) => {
      const rx = x + corner.x * cos - corner.y * sin;
      const ry = y + corner.x * sin + corner.y * cos;
      if (i === 0) this.graphics.moveTo(rx, ry);
      else this.graphics.lineTo(rx, ry);
    });
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Calculate positions for two child squares (forming Pythagoras theorem triangle)
    const topLeftX = x - size * sin;
    const topLeftY = y - size * cos;
    const topRightX = x + size * cos - size * sin;
    const topRightY = y + size * sin - size * cos;
    
    const leftAngle = angle - this.branchAngle * (1 + audio.bass * 0.2);
    const rightAngle = angle + this.branchAngle * (1 + audio.treble * 0.2);
    const shrink = 0.6;
    
    this.drawPythagorasTree(topLeftX, topLeftY, size * shrink, leftAngle, depth + 1, baseHue, audio);
    this.drawPythagorasTree(topRightX, topRightY, size * shrink, rightAngle, depth + 1, baseHue, audio);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

