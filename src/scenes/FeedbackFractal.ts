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
  private baseDepth: number = 8; // Reduced depth for performance
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
  private currentRootNode: FractalNode | null = null; // Current node we're growing from
  private redrawCounter: number = 0; // Counter for redrawing every 3 steps

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize with root node at origin
    this.currentRootNode = { x: 0, y: 0, depth: 0, angle: 0, size: 100 };
    this.cameraX = 0;
    this.cameraY = 0;
    this.targetCameraX = this.cameraX;
    this.targetCameraY = this.cameraY;
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

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
          this.redrawCounter = 0; // Reset redraw counter
          this.clickCooldown = 1.0; // 1 second cooldown

          // Reset camera for new fractal
          this.currentRootNode = { x: 0, y: 0, depth: 0, angle: 0, size: 100 };
          this.targetZoom = 1;
          this.zoomLevel = 1;
          this.cameraX = 0;
          this.cameraY = 0;
          this.targetCameraX = 0;
          this.targetCameraY = 0;

          break; // Only process one click
        }
      }
    }

    // Increment growth and redraw counter
    this.growthPhase += dt * 0.3;
    this.redrawCounter += dt * 0.3;

    // Every 3 growth steps, find a new root node and redraw
    if (this.redrawCounter >= 3 && this.currentRootNode) {
      this.redrawCounter = 0;

      // Find the smallest/deepest node by exploring from current root
      const newRoot = this.findSmallestNode(this.currentRootNode);
      if (newRoot) {
        this.currentRootNode = newRoot;
        // Camera jumps to the new root
        this.cameraX = newRoot.x;
        this.cameraY = newRoot.y;
        this.targetCameraX = newRoot.x;
        this.targetCameraY = newRoot.y;
      }
    }

    // Continuously zoom in
    this.targetZoom = 1 + this.growthPhase * 2;
    this.zoomLevel += (this.targetZoom - this.zoomLevel) * 2 * dt;

    // Camera stays at current root position
    this.cameraX += (this.targetCameraX - this.cameraX) * 2 * dt;
    this.cameraY += (this.targetCameraY - this.cameraY) * 2 * dt;

    // Continuous rotation (slow spin)
    this.rotationPhase = this.time * 0.05 + audio.bass * 0.3;

    // Audio controls fractal parameters
    this.branchAngle = (Math.PI / 6) * (1 + audio.treble * 0.4);

    this.draw(audio);
  }

  private findSmallestNode(root: FractalNode): FractalNode | null {
    // Explore the fractal from the root and find the smallest/deepest node
    let smallest: FractalNode = root;
    const exploreQueue: FractalNode[] = [root];
    const visited = new Set<string>();

    while (exploreQueue.length > 0) {
      const current = exploreQueue.shift()!;
      const key = `${current.x.toFixed(2)},${current.y.toFixed(2)}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Update smallest if this node is smaller
      if (current.size < smallest.size) {
        smallest = current;
      }

      // Generate child nodes based on fractal type
      const children = this.generateChildNodes(current);

      // Only explore children that are smaller (deeper)
      for (const child of children) {
        if (child.size < current.size && child.depth <= this.baseDepth) {
          exploreQueue.push(child);
        }
      }

      // Limit exploration to prevent infinite loops
      if (visited.size > 100) break;
    }

    return smallest !== root ? smallest : null;
  }

  private drawFractalFromNode(root: FractalNode, baseHue: number, audio: AudioData): void {
    // Draw the fractal starting from this root node
    const drawQueue: FractalNode[] = [root];
    const visited = new Set<string>();

    while (drawQueue.length > 0) {
      const current = drawQueue.shift()!;
      const key = `${current.x.toFixed(2)},${current.y.toFixed(2)}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Draw this node based on fractal type
      this.drawNode(current, baseHue, audio);

      // Generate and queue children
      const children = this.generateChildNodes(current);
      for (const child of children) {
        if (child.depth <= this.baseDepth && child.size > this.minVisibleSize) {
          drawQueue.push(child);
        }
      }

      // Limit drawing to prevent performance issues
      if (visited.size > 200) break;
    }
  }

  private drawNode(node: FractalNode, baseHue: number, audio: AudioData): void {
    const hue = (baseHue + node.depth * 25) % 360;
    const color = hslToHex(hue, 80, 60);
    const alpha = Math.min(1, 1 - node.depth * 0.1 + (audio.beat ? 0.2 : 0));

    switch (this.fractalType) {
      case 0: // Tree - draw branch
        if (node.depth > 0) {
          const parentX = node.x - Math.cos(node.angle) * node.size;
          const parentY = node.y - Math.sin(node.angle) * node.size;
          const lineWidth = Math.max(1, 8 - node.depth * 1.2);

          this.graphics.lineStyle(lineWidth, color, alpha);
          this.graphics.moveTo(parentX, parentY);
          this.graphics.lineTo(node.x, node.y);
        }
        break;

      // Add other fractal types as needed...
    }
  }

  private generateChildNodes(node: FractalNode): FractalNode[] {
    const children: FractalNode[] = [];

    switch (this.fractalType) {
      case 0: // Tree - generate branches
        const length = node.size * 0.65;
        if (length > 2) {
          const angle1 = node.angle - this.branchAngle;
          const angle2 = node.angle + this.branchAngle;

          const x1 = node.x + Math.cos(angle1) * length;
          const y1 = node.y + Math.sin(angle1) * length;
          const x2 = node.x + Math.cos(angle2) * length;
          const y2 = node.y + Math.sin(angle2) * length;

          children.push(
            { x: x1, y: y1, depth: node.depth + 1, angle: angle1, size: length },
            { x: x2, y: y2, depth: node.depth + 1, angle: angle2, size: length }
          );
        }
        break;

      // Add other fractal types as needed...
    }

    return children;
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

    // Draw fractal starting from current root node
    if (this.currentRootNode) {
      this.drawFractalFromNode(this.currentRootNode, baseHue, audio);
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


  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

