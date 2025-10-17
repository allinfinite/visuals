import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface FractalNode {
  x: number;
  y: number;
  depth: number;
  angle: number;
  size: number;
}

export class FeedbackFractal implements Pattern {
  public name = 'Feedback Fractal';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private fractalType: number = 0; // 0: Tree, 1: Sierpinski, 2: Koch, 3: Recursive Circles, 4: Pythagoras Tree
  private baseDepth: number = 12; // Base depth for visibility culling
  private branchAngle: number = Math.PI / 6; // 30 degrees
  private growthPhase: number = 0; // For animated growth (continues indefinitely)
  private zoomLevel: number = 1; // Camera zoom level
  private targetZoom: number = 1;
  private cameraX: number; // Camera center X in world space
  private cameraY: number; // Camera center Y in world space
  private targetCameraX: number;
  private targetCameraY: number;
  private rotationPhase: number = 0; // For rotation
  private clickCooldown: number = 0; // Prevent rapid clicking
  private newNodes: FractalNode[] = []; // Track newly created nodes
  private minVisibleSize: number = 0.5; // Minimum pixel size to render
  private frontierNodes: FractalNode[] = []; // Deepest/smallest nodes at growth frontier

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Initialize camera to center
    this.cameraX = context.width / 2;
    this.cameraY = context.height / 2;
    this.targetCameraX = this.cameraX;
    this.targetCameraY = this.cameraY;
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Start a fresh node collection for this frame's draw
    this.newNodes = [];
    this.frontierNodes = [];

    // Update click cooldown
    this.clickCooldown = Math.max(0, this.clickCooldown - dt);

    // Click changes fractal type to a random different one (with cooldown)
    if (this.clickCooldown <= 0) {
      for (const click of input.clicks) {
        const age = this.time - click.time;
        if (age < 0.05) {
          // Pick a random fractal type that's different from current
          let newType = this.fractalType;
          while (newType === this.fractalType) {
            newType = Math.floor(Math.random() * 5);
          }
          this.fractalType = newType;
          this.growthPhase = 0; // Reset growth animation
          this.clickCooldown = 1.0; // 1 second cooldown to prevent rapid switching
          this.newNodes = []; // Clear tracked nodes
          this.frontierNodes = []; // Clear frontier nodes
          
          // Reset camera for new fractal
          this.targetZoom = 1;
          this.zoomLevel = 1;
          this.targetCameraX = this.context.width / 2;
          this.targetCameraY = this.context.height / 2;
          this.cameraX = this.targetCameraX;
          this.cameraY = this.targetCameraY;
          
          break; // Only process one click
        }
      }
    }

    // Growth phase continues indefinitely (never stops)
    this.growthPhase += dt * 0.3; // Continuous growth
    
    // Aggressively zoom in as fractal grows
    this.targetZoom = 1 + this.growthPhase * 3; // Fast zoom
    this.zoomLevel += (this.targetZoom - this.zoomLevel) * 4 * dt;
    
    // Always aim camera at the smallest frontier nodes (deepest growth)
    if (this.frontierNodes.length > 0) {
      // Pick the smallest node at the frontier
      const targetNode = this.frontierNodes[0]; // Already sorted by size
      console.log(`Zooming to frontier node: x=${targetNode.x}, y=${targetNode.y}, size=${targetNode.size}, depth=${targetNode.depth}`);
      this.cameraX = targetNode.x;
      this.cameraY = targetNode.y;
      this.targetCameraX = targetNode.x;
      this.targetCameraY = targetNode.y;
    } else {
      // Test transform by moving to a known position (off-center)
      console.log('No frontier nodes - testing transform with fixed position');
      this.cameraX = 200; // Move to an offset position to test if transform works
      this.cameraY = 100;
      this.targetCameraX = 200;
      this.targetCameraY = 100;
    }

    // Continuous rotation (slow spin)
    this.rotationPhase = this.time * 0.05 + audio.bass * 0.3;

    // Audio controls fractal parameters
    this.branchAngle = (Math.PI / 6) * (1 + audio.treble * 0.4); // 30-42 degrees

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const baseHue = (this.time * 20) % 360;
    
    // Calculate final zoom with audio boost
    const audioZoomBoost = 1 + audio.rms * 0.2;
    const finalZoom = this.zoomLevel * audioZoomBoost;
    const initialLength = Math.min(width, height) * 0.25;

    // Store transform state for drawing fractal with zoom, pan, and rotation
    const originalTransform = {
      x: this.graphics.x,
      y: this.graphics.y,
      scaleX: this.graphics.scale.x,
      scaleY: this.graphics.scale.y,
      rotation: this.graphics.rotation,
    };

    // Simple camera transform: zoom around camera position
    // Pivot is the world position that appears at the screen center
    this.graphics.pivot.set(this.cameraX, this.cameraY);
    this.graphics.position.set(centerX, centerY);
    this.graphics.scale.set(finalZoom, finalZoom);
    this.graphics.rotation = this.rotationPhase;

    // Coordinates for fractal drawing (in world space)
    const adjustedCenterX = centerX;
    const adjustedCenterY = centerY;

    switch (this.fractalType) {
      case 0: // Fractal Tree
        this.drawFractalTree(adjustedCenterX, height * 0.8, -Math.PI / 2, initialLength, 0, baseHue, audio);
        break;
      case 1: // Sierpinski Triangle
        this.drawSierpinski(
          adjustedCenterX, height * 0.7, 
          adjustedCenterX - initialLength * 1.5, height * 0.2,
          adjustedCenterX + initialLength * 1.5, height * 0.2,
          0, baseHue, audio
        );
        break;
      case 2: // Koch Snowflake
        this.drawKochSnowflake(adjustedCenterX, adjustedCenterY, initialLength * 1.2, baseHue, audio);
        break;
      case 3: // Recursive Circles (Apollonian Gasket style)
        this.drawRecursiveCircles(adjustedCenterX, adjustedCenterY, initialLength, 0, baseHue, audio);
        break;
      case 4: // Recursive Squares (Pythagoras Tree style)
        this.drawPythagorasTree(adjustedCenterX, height * 0.85, initialLength * 0.8, -Math.PI / 2, 0, baseHue, audio);
        break;
    }

    // Collect frontier nodes (smallest/deepest nodes)
    console.log(`Draw complete: newNodes.length = ${this.newNodes.length}, growthPhase = ${this.growthPhase}`);
    if (this.newNodes.length > 0) {
      // Sort by size (smallest first = deepest/newest)
      this.newNodes.sort((a, b) => a.size - b.size);
      // Take the smallest 10% or at least 5 nodes
      const frontierCount = Math.max(5, Math.floor(this.newNodes.length * 0.1));
      this.frontierNodes = this.newNodes.slice(0, frontierCount);
      console.log(`Collected ${this.frontierNodes.length} frontier nodes, smallest size: ${this.frontierNodes[0]?.size}`);
    } else {
      console.log('No newNodes collected during draw');
    }

    // Reset transform
    this.graphics.pivot.set(0, 0);
    this.graphics.position.set(originalTransform.x, originalTransform.y);
    this.graphics.scale.set(originalTransform.scaleX, originalTransform.scaleY);
    this.graphics.rotation = originalTransform.rotation;

    // Draw fractal type indicator (not affected by zoom/rotation)
    const indicatorY = 30;
    const color = hslToHex(baseHue, 70, 50);
    
    for (let i = 0; i < 5; i++) {
      const alpha = i === this.fractalType ? 0.8 : 0.2;
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(30 + i * 20, indicatorY, 5);
      this.graphics.endFill();
    }
    
    // Draw zoom indicator (progress bar)
    const zoomBarWidth = 100;
    const zoomBarX = width - zoomBarWidth - 20;
    const zoomBarY = 30;
    
    this.graphics.lineStyle(2, 0xffffff, 0.3);
    this.graphics.drawRect(zoomBarX, zoomBarY - 5, zoomBarWidth, 10);
    
    const zoomProgress = Math.min(1, (finalZoom - 1) / 2); // Normalize to 0-1 (1x to 3x)
    this.graphics.beginFill(hslToHex(baseHue, 70, 50), 0.7);
    this.graphics.drawRect(zoomBarX, zoomBarY - 5, zoomBarWidth * zoomProgress, 10);
    this.graphics.endFill();
    
    // Draw growth indicator
    const growthBarWidth = 80;
    const growthBarX = width - growthBarWidth - 20;
    const growthBarY = 50;
    
    this.graphics.lineStyle(2, 0xffffff, 0.3);
    this.graphics.drawRect(growthBarX, growthBarY - 5, growthBarWidth, 8);
    
    this.graphics.beginFill(hslToHex((baseHue + 60) % 360, 70, 50), 0.7);
    this.graphics.drawRect(growthBarX, growthBarY - 5, growthBarWidth * Math.min(1, this.growthPhase), 8);
    this.graphics.endFill();
  }

  // Fractal Tree - classic recursive branching
  private drawFractalTree(x: number, y: number, angle: number, length: number, depth: number, baseHue: number, audio: AudioData): void {
    // Check if branch is visible (size in screen space)
    const screenSize = length * this.zoomLevel;
    if (screenSize < this.minVisibleSize || depth > this.baseDepth) {
      console.log(`Tree branch rejected: depth=${depth}, screenSize=${screenSize}, zoomLevel=${this.zoomLevel}`);
      return;
    }

    // Animated growth based on continuous growth phase
    const depthProgress = depth / this.baseDepth;
    if (depthProgress > this.growthPhase && this.growthPhase < 1) {
      console.log(`Tree branch growth rejected: depth=${depth}, depthProgress=${depthProgress}, growthPhase=${this.growthPhase}`);
      return; // Initial growth animation
    }
    
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    
    // Track this node for zoom targeting
    this.newNodes.push({ x: x2, y: y2, depth, angle, size: length });
    
    const hue = (baseHue + depth * 25) % 360;
    const color = hslToHex(hue, 80, 60);
    const lineWidth = Math.max(1, 10 - depth * 1.5);
    const alpha = Math.min(1, 1 - depthProgress * 0.3 + (audio.beat ? 0.2 : 0));
    
    this.graphics.lineStyle(lineWidth, color, alpha);
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x2, y2);
    
    // Recursive branches with audio reactivity
    const angleVariation = this.branchAngle * (1 + audio.bass * 0.4);
    const lengthRatio = 0.65 + audio.treble * 0.15;
    
    this.drawFractalTree(x2, y2, angle - angleVariation, length * lengthRatio, depth + 1, baseHue, audio);
    this.drawFractalTree(x2, y2, angle + angleVariation, length * lengthRatio, depth + 1, baseHue, audio);
    
    // Add a third branch on strong beats for more complexity
    if (audio.beat && depth < 3) {
      const middleAngle = angle + (Math.random() - 0.5) * this.branchAngle * 0.5;
      this.drawFractalTree(x2, y2, middleAngle, length * lengthRatio * 0.8, depth + 1, baseHue, audio);
    }
  }

  // Sierpinski Triangle - recursive triangle subdivision
  private drawSierpinski(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, depth: number, baseHue: number, audio: AudioData): void {
    // Check if triangle is visible
    const size = Math.abs(x2 - x1);
    const screenSize = size * this.zoomLevel;
    if (screenSize < this.minVisibleSize || depth > this.baseDepth) return;
    
    // Animated growth based on continuous growth phase
    const depthProgress = depth / this.baseDepth;
    if (depthProgress > this.growthPhase && this.growthPhase < 1) return;
    
    const hue = (baseHue + depth * 35) % 360;
    const color = hslToHex(hue, 80, 60);
    const alpha = Math.min(1, 0.9 - depthProgress * 0.2 + (audio.beat ? 0.1 : 0));
    
    this.graphics.lineStyle(Math.max(1, 3 - depth * 0.3), color, alpha);
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
    
    // Track midpoints as new nodes
    const s = Math.abs(x2 - x1);
    this.newNodes.push(
      { x: mid1x, y: mid1y, depth, angle: 0, size: s },
      { x: mid2x, y: mid2y, depth, angle: 0, size: s },
      { x: mid3x, y: mid3y, depth, angle: 0, size: s }
    );
    
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
    // Check if line is visible
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const screenSize = length * this.zoomLevel;
    
    const maxKochDepth = Math.min(8, this.baseDepth);
    if (screenSize < this.minVisibleSize || depth > maxKochDepth) {
      const hue = (baseHue + depth * 30) % 360;
      const color = hslToHex(hue, 80, 60);
      this.graphics.lineStyle(Math.max(1, 3 - depth * 0.4), color, 0.8);
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      return;
    }
    
    // Animated growth based on continuous growth phase
    const depthProgress = depth / maxKochDepth;
    if (depthProgress > this.growthPhase && this.growthPhase < 1) {
      const hue = (baseHue + depth * 30) % 360;
      const color = hslToHex(hue, 80, 60);
      this.graphics.lineStyle(Math.max(1, 3 - depth * 0.4), color, 0.8);
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      return;
    }
    
    // Divide line into thirds
    const x3 = x1 + dx / 3;
    const y3 = y1 + dy / 3;
    const x5 = x1 + dx * 2 / 3;
    const y5 = y1 + dy * 2 / 3;
    
    // Calculate peak of equilateral triangle
    const angle = Math.atan2(dy, dx) - Math.PI / 3;
    const segmentLength = Math.sqrt(dx * dx + dy * dy) / 3;
    const x4 = x3 + Math.cos(angle) * segmentLength;
    const y4 = y3 + Math.sin(angle) * segmentLength;
    
    // Track the peak point as a new node
    this.newNodes.push({ x: x4, y: y4, depth, angle, size: segmentLength });
    
    // Recurse on four segments
    this.drawKochLine(x1, y1, x3, y3, depth + 1, baseHue, audio);
    this.drawKochLine(x3, y3, x4, y4, depth + 1, baseHue, audio);
    this.drawKochLine(x4, y4, x5, y5, depth + 1, baseHue, audio);
    this.drawKochLine(x5, y5, x2, y2, depth + 1, baseHue, audio);
  }

  // Recursive Circles - Apollonian gasket style
  private drawRecursiveCircles(x: number, y: number, radius: number, depth: number, baseHue: number, audio: AudioData): void {
    // Check if circle is visible
    const screenSize = radius * this.zoomLevel;
    if (screenSize < this.minVisibleSize || depth > this.baseDepth) return;
    
    // Animated growth based on continuous growth phase
    const depthProgress = depth / this.baseDepth;
    if (depthProgress > this.growthPhase && this.growthPhase < 1) return;
    
    const hue = (baseHue + depth * 40) % 360;
    const color = hslToHex(hue, 80, 60);
    const alpha = Math.min(1, 0.8 - depthProgress * 0.15 + (audio.beat ? 0.1 : 0));
    
    this.graphics.lineStyle(Math.max(1, 3 - depth * 0.3), color, alpha);
    this.graphics.drawCircle(x, y, radius);
    
    // Draw smaller circles around the perimeter
    const childRadius = radius * (0.3 + audio.treble * 0.1);
    const angleOffset = this.time * 0.5 + depth;
    const count = 6 + Math.floor(audio.rms * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + angleOffset;
      const distance = radius - childRadius;
      const cx = x + Math.cos(angle) * distance;
      const cy = y + Math.sin(angle) * distance;
      
      // Track child circle positions as new nodes
      this.newNodes.push({ x: cx, y: cy, depth, angle, size: childRadius });
      
      this.drawRecursiveCircles(cx, cy, childRadius, depth + 1, baseHue, audio);
    }
  }

  // Pythagoras Tree - recursive squares
  private drawPythagorasTree(x: number, y: number, size: number, angle: number, depth: number, baseHue: number, audio: AudioData): void {
    // Check if square is visible
    const screenSize = size * this.zoomLevel;
    if (screenSize < this.minVisibleSize || depth > this.baseDepth) return;
    
    // Animated growth based on continuous growth phase
    const depthProgress = depth / this.baseDepth;
    if (depthProgress > this.growthPhase && this.growthPhase < 1) return;
    
    const hue = (baseHue + depth * 35) % 360;
    const color = hslToHex(hue, 80, 60);
    const fillColor = hslToHex(hue, 90, 40);
    const alpha = Math.min(1, 0.9 - depthProgress * 0.2 + (audio.beat ? 0.1 : 0));
    
    // Draw square
    this.graphics.lineStyle(Math.max(1, 2 - depth * 0.2), color, alpha);
    this.graphics.beginFill(fillColor, alpha * 0.4);
    
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
    
    // Track child square positions as new nodes
    this.newNodes.push(
      { x: topLeftX, y: topLeftY, depth, angle, size },
      { x: topRightX, y: topRightY, depth, angle, size }
    );
    
    const leftAngle = angle - this.branchAngle * (1 + audio.bass * 0.3);
    const rightAngle = angle + this.branchAngle * (1 + audio.treble * 0.3);
    const shrink = 0.65 + audio.rms * 0.05;
    
    this.drawPythagorasTree(topLeftX, topLeftY, size * shrink, leftAngle, depth + 1, baseHue, audio);
    this.drawPythagorasTree(topRightX, topRightY, size * shrink, rightAngle, depth + 1, baseHue, audio);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

