import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface ImpossibleShape {
  type: 'penrose' | 'stairs' | 'ring' | 'cube' | 'triangle-grid';
  rotation: number;
  phase: number;
  scale: number;
  hue: number;
}

export class ImpossibleGeometry implements Pattern {
  public name = 'Impossible Geometry';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private shapes: ImpossibleShape[] = [];
  private currentMode: number = 0; // 0-4 different impossible structures
  private rotationSpeed: number = 0.3;
  private globalRotation: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Initialize with multiple layered shapes
    this.initShapes();
  }
  
  private initShapes(): void {
    const types: Array<'penrose' | 'stairs' | 'ring' | 'cube' | 'triangle-grid'> = 
      ['penrose', 'stairs', 'ring', 'cube', 'triangle-grid'];
    
    for (let i = 0; i < 3; i++) {
      this.shapes.push({
        type: types[i % types.length],
        rotation: (i / 3) * Math.PI * 2,
        phase: i * Math.PI / 3,
        scale: 0.6 + i * 0.2,
        hue: i * 120,
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Click cycles through modes
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.currentMode = (this.currentMode + 1) % 5;
        this.initShapes(); // Reinitialize for new mode
      }
    });
    
    // Audio-reactive rotation speed
    this.rotationSpeed = 0.3 + audio.treble * 0.5;
    this.globalRotation += dt * this.rotationSpeed;
    
    // Update each shape
    this.shapes.forEach((shape, i) => {
      shape.rotation += dt * (0.5 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      shape.phase += dt * (1 + audio.mid);
      shape.scale = 0.6 + i * 0.15 + audio.rms * 0.2 + (audio.beat ? 0.1 : 0);
      shape.hue = (i * 120 + this.time * 20 + audio.centroid * 60) % 360;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;
    const cx = width / 2;
    const cy = height / 2;
    
    // Draw based on current mode
    switch (this.currentMode) {
      case 0:
        this.drawInfinitePenrose(cx, cy, audio);
        break;
      case 1:
        this.drawEscherStairwell(cx, cy, audio);
        break;
      case 2:
        this.drawInterlockingRings(cx, cy, audio);
        break;
      case 3:
        this.drawImpossibleLatice(cx, cy, audio);
        break;
      case 4:
        this.drawMorphingCube(cx, cy, audio);
        break;
    }
    
    // Draw mode indicator
    this.graphics.lineStyle(0);
    this.graphics.beginFill(0xffffff, 0.7);
    
    // Simple text rendering using shapes
    const indicatorY = 30;
    const indicatorX = 20;
    for (let i = 0; i < 5; i++) {
      const active = i === this.currentMode;
      const size = active ? 8 : 4;
      const alpha = active ? 0.9 : 0.3;
      this.graphics.beginFill(0xffffff, alpha);
      this.graphics.drawCircle(indicatorX + i * 20, indicatorY, size);
      this.graphics.endFill();
    }
  }
  
  // Mode 0: Infinite Penrose Triangle with recursive patterns
  private drawInfinitePenrose(cx: number, cy: number, audio: AudioData): void {
    const baseSize = 200 + audio.bass * 100;
    const layers = 5;
    
    for (let layer = 0; layer < layers; layer++) {
      const layerScale = 1 - layer * 0.15;
      const size = baseSize * layerScale;
      const rotation = this.globalRotation + layer * 0.3;
      const depth = layer / layers;
      const hue = (this.time * 30 + layer * 60 + audio.centroid * 120) % 360;
      
      // Draw Penrose triangle
      this.drawPenroseTriangle(cx, cy, size, rotation, hue, depth, audio);
      
      // Draw smaller orbiting Penrose triangles
      const orbitCount = 3;
      for (let i = 0; i < orbitCount; i++) {
        const angle = (i / orbitCount) * Math.PI * 2 + this.time + layer;
        const orbitRadius = size * 1.5;
        const ox = cx + Math.cos(angle) * orbitRadius;
        const oy = cy + Math.sin(angle) * orbitRadius;
        const orbitSize = size * 0.3;
        
        this.drawPenroseTriangle(ox, oy, orbitSize, rotation * 2, (hue + i * 120) % 360, depth, audio);
      }
    }
  }
  
  private drawPenroseTriangle(cx: number, cy: number, size: number, rotation: number, hue: number, depth: number, audio: AudioData): void {
    const points = 3;
    const angleStep = (Math.PI * 2) / points;
    const innerRatio = 0.5;
    
    // Calculate vertices
    const vertices: Array<{x: number, y: number}> = [];
    const innerVertices: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i < points; i++) {
      const angle = i * angleStep + rotation;
      vertices.push({
        x: cx + Math.cos(angle) * size,
        y: cy + Math.sin(angle) * size
      });
      
      const innerAngle = (i + 0.5) * angleStep + rotation;
      innerVertices.push({
        x: cx + Math.cos(innerAngle) * size * innerRatio,
        y: cy + Math.sin(innerAngle) * size * innerRatio
      });
    }
    
    // Draw the impossible connections
    const baseAlpha = 0.7 - depth * 0.3;
    const beatBoost = audio.beat ? 1.3 : 1;
    
    for (let i = 0; i < points; i++) {
      const next = (i + 1) % points;
      const innerCurr = innerVertices[i];
      const innerNext = innerVertices[next];
      const outerCurr = vertices[i];
      const outerNext = vertices[next];
      
      // Draw faces with shading for 3D effect
      const faceHue = (hue + i * 20) % 360;
      const lightness = 40 + Math.sin(this.time + i) * 20 + audio.mid * 20;
      
      // Outer face
      this.graphics.beginFill(this.hslToHex(faceHue, 80, lightness), baseAlpha);
      this.graphics.moveTo(outerCurr.x, outerCurr.y);
      this.graphics.lineTo(outerNext.x, outerNext.y);
      this.graphics.lineTo(innerNext.x, innerNext.y);
      this.graphics.lineTo(innerCurr.x, innerCurr.y);
      this.graphics.closePath();
      this.graphics.endFill();
      
      // Edge highlight
      this.graphics.lineStyle(2 * beatBoost, this.hslToHex(faceHue, 100, 70), baseAlpha * 0.8);
      this.graphics.moveTo(outerCurr.x, outerCurr.y);
      this.graphics.lineTo(outerNext.x, outerNext.y);
      this.graphics.lineStyle(0);
      
      // Impossible connection (creates the illusion)
      this.graphics.lineStyle(3 * beatBoost, this.hslToHex((faceHue + 180) % 360, 100, 80), baseAlpha);
      this.graphics.moveTo(innerCurr.x, innerCurr.y);
      this.graphics.lineTo(outerNext.x, outerNext.y);
      this.graphics.lineStyle(0);
    }
    
    // Center glow
    const glowSize = size * 0.2 * beatBoost;
    this.graphics.beginFill(this.hslToHex(hue, 100, 80), baseAlpha * 0.5);
    this.graphics.drawCircle(cx, cy, glowSize);
    this.graphics.endFill();
    
    this.graphics.beginFill(0xffffff, baseAlpha * 0.8);
    this.graphics.drawCircle(cx, cy, glowSize * 0.4);
    this.graphics.endFill();
  }
  
  // Mode 1: Escher-style infinite stairwell
  private drawEscherStairwell(cx: number, cy: number, audio: AudioData): void {
    const stepCount = 16;
    const baseSize = 150;
    const perspective = 0.7;
    
    for (let i = 0; i < stepCount; i++) {
      const progress = (i + this.time * 0.5) % stepCount;
      const depth = progress / stepCount;
      const scale = 1 - depth * perspective;
      const rotation = this.globalRotation;
      
      // Calculate position with spiral
      const angle = (progress / stepCount) * Math.PI * 2;
      const spiralRadius = 200 - depth * 100;
      const x = cx + Math.cos(angle + rotation) * spiralRadius * scale;
      const y = cy + Math.sin(angle + rotation) * spiralRadius * scale - progress * 10;
      
      const size = baseSize * scale;
      const hue = (progress * 20 + audio.centroid * 180) % 360;
      const alpha = 0.8 - depth * 0.5;
      
      this.drawStep(x, y, size, angle + rotation, hue, alpha, audio);
    }
  }
  
  private drawStep(x: number, y: number, size: number, _rotation: number, hue: number, alpha: number, audio: AudioData): void {
    const stepWidth = size;
    const stepHeight = size * 0.3;
    const stepDepth = size * 0.5;
    
    // Top face
    this.graphics.beginFill(this.hslToHex(hue, 70, 60), alpha);
    this.graphics.drawRect(x - stepWidth / 2, y - stepHeight / 2, stepWidth, stepHeight);
    this.graphics.endFill();
    
    // Front face (darker)
    this.graphics.beginFill(this.hslToHex(hue, 70, 40), alpha * 0.8);
    this.graphics.moveTo(x - stepWidth / 2, y + stepHeight / 2);
    this.graphics.lineTo(x + stepWidth / 2, y + stepHeight / 2);
    this.graphics.lineTo(x + stepWidth / 2, y + stepHeight / 2 + stepDepth);
    this.graphics.lineTo(x - stepWidth / 2, y + stepHeight / 2 + stepDepth);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Side face (darkest)
    this.graphics.beginFill(this.hslToHex(hue, 70, 30), alpha * 0.6);
    this.graphics.moveTo(x + stepWidth / 2, y - stepHeight / 2);
    this.graphics.lineTo(x + stepWidth / 2 + stepDepth * 0.5, y);
    this.graphics.lineTo(x + stepWidth / 2 + stepDepth * 0.5, y + stepHeight + stepDepth);
    this.graphics.lineTo(x + stepWidth / 2, y + stepHeight / 2 + stepDepth);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Edge highlights
    const beatBoost = audio.beat ? 1.5 : 1;
    this.graphics.lineStyle(1 * beatBoost, this.hslToHex(hue, 100, 80), alpha);
    this.graphics.drawRect(x - stepWidth / 2, y - stepHeight / 2, stepWidth, stepHeight);
    this.graphics.lineStyle(0);
  }
  
  // Mode 2: Interlocking Borromean Rings (impossible linkage)
  private drawInterlockingRings(cx: number, cy: number, audio: AudioData): void {
    const ringCount = 3;
    const baseRadius = 150 + audio.bass * 50;
    const thickness = 30 + audio.rms * 20;
    
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2 + this.globalRotation;
      const offset = 80;
      const x = cx + Math.cos(angle) * offset;
      const y = cy + Math.sin(angle) * offset;
      const hue = (i * 120 + this.time * 30 + audio.treble * 60) % 360;
      const rotation = angle + this.time * 0.5;
      
      this.drawImpossibleRing(x, y, baseRadius, thickness, rotation, hue, i, audio);
    }
  }
  
  private drawImpossibleRing(x: number, y: number, radius: number, thickness: number, rotation: number, hue: number, layer: number, audio: AudioData): void {
    const segments = 32;
    const twist = this.time + layer * Math.PI / 3;
    
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2 + rotation;
      const angle2 = ((i + 1) / segments) * Math.PI * 2 + rotation;
      
      // Calculate 3D twist for impossible effect
      const depth1 = Math.sin(twist + angle1 * 3);
      const depth2 = Math.sin(twist + angle2 * 3);
      
      const x1 = x + Math.cos(angle1) * radius;
      const y1 = y + Math.sin(angle1) * radius + depth1 * 20;
      const x2 = x + Math.cos(angle2) * radius;
      const y2 = y + Math.sin(angle2) * radius + depth2 * 20;
      
      // Determine shading based on depth
      const lightness = 50 + depth1 * 30 + audio.mid * 20;
      const alpha = 0.7 + Math.abs(depth1) * 0.3;
      
      // Draw segment
      const localThickness = thickness * (1 + Math.abs(depth1) * 0.3);
      this.graphics.lineStyle(localThickness, this.hslToHex(hue, 80, lightness), alpha);
      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      
      // Add highlights on top half
      if (depth1 > 0) {
        this.graphics.lineStyle(localThickness * 0.3, this.hslToHex(hue, 100, 90), alpha * 0.6);
        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
      }
    }
    
    this.graphics.lineStyle(0);
  }
  
  // Mode 3: Impossible lattice with recursive depth
  private drawImpossibleLatice(cx: number, cy: number, audio: AudioData): void {
    const gridSize = 5;
    const cellSize = 100 + audio.rms * 50;
    const startX = cx - (gridSize * cellSize) / 2;
    const startY = cy - (gridSize * cellSize) / 2;
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = startX + col * cellSize;
        const y = startY + row * cellSize;
        const distance = Math.hypot(col - gridSize / 2, row - gridSize / 2);
        const phase = this.time + distance * 0.5;
        const hue = (row * 72 + col * 51 + this.time * 20 + audio.centroid * 120) % 360;
        
        this.drawImpossibleCube(x, y, cellSize * 0.4, phase, hue, audio);
      }
    }
  }
  
  private drawImpossibleCube(x: number, y: number, size: number, _phase: number, hue: number, audio: AudioData): void {
    const beatBoost = audio.beat ? 1.2 : 1;
    const s = size * beatBoost;
    const d = s * 0.5; // Depth offset
    
    // Front face
    this.graphics.beginFill(this.hslToHex(hue, 70, 60), 0.7);
    this.graphics.drawRect(x - s / 2, y - s / 2, s, s);
    this.graphics.endFill();
    
    // Top face (impossible connection)
    this.graphics.beginFill(this.hslToHex(hue, 70, 75), 0.6);
    this.graphics.moveTo(x - s / 2, y - s / 2);
    this.graphics.lineTo(x + s / 2, y - s / 2);
    this.graphics.lineTo(x + s / 2 + d, y - s / 2 - d);
    this.graphics.lineTo(x - s / 2 + d, y - s / 2 - d);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Right face (impossible connection)
    this.graphics.beginFill(this.hslToHex(hue, 70, 45), 0.6);
    this.graphics.moveTo(x + s / 2, y - s / 2);
    this.graphics.lineTo(x + s / 2, y + s / 2);
    this.graphics.lineTo(x + s / 2 + d, y + s / 2 - d);
    this.graphics.lineTo(x + s / 2 + d, y - s / 2 - d);
    this.graphics.closePath();
    this.graphics.endFill();
    
    // Draw edges
    this.graphics.lineStyle(2, this.hslToHex((hue + 180) % 360, 100, 80), 0.8);
    
    // Impossible edge connections
    this.graphics.moveTo(x - s / 2, y - s / 2);
    this.graphics.lineTo(x + s / 2 + d, y + s / 2 - d);
    
    this.graphics.moveTo(x + s / 2, y - s / 2);
    this.graphics.lineTo(x - s / 2 + d, y + s / 2 - d);
    
    this.graphics.lineStyle(0);
  }
  
  // Mode 4: Morphing impossible cube with rotating faces
  private drawMorphingCube(cx: number, cy: number, audio: AudioData): void {
    const size = 250 + audio.bass * 100;
    const layers = 4;
    
    for (let layer = 0; layer < layers; layer++) {
      const layerScale = 1 - layer * 0.2;
      const s = size * layerScale;
      const rotation = this.globalRotation + layer * 0.5;
      const hue = (layer * 90 + this.time * 30 + audio.centroid * 120) % 360;
      const alpha = 0.8 - layer * 0.15;
      
      // Calculate morphing vertices
      const morph = Math.sin(this.time + layer) * 0.3;
      const vertices = this.calculateMorphingCubeVertices(cx, cy, s, rotation, morph);
      
      // Draw faces
      this.drawCubeFace(vertices, [0, 1, 5, 4], hue, alpha, 60, audio); // Front
      this.drawCubeFace(vertices, [1, 2, 6, 5], hue + 30, alpha, 75, audio); // Right
      this.drawCubeFace(vertices, [0, 4, 7, 3], hue - 30, alpha, 45, audio); // Left
      this.drawCubeFace(vertices, [4, 5, 6, 7], hue + 60, alpha, 80, audio); // Top
      
      // Draw impossible edges
      this.graphics.lineStyle(3, this.hslToHex((hue + 180) % 360, 100, 90), alpha * 0.8);
      this.drawCubeEdges(vertices);
      this.graphics.lineStyle(0);
    }
  }
  
  private calculateMorphingCubeVertices(cx: number, cy: number, size: number, rotation: number, morph: number): Array<{x: number, y: number}> {
    const s = size / 2;
    const d = s * 0.7; // Isometric depth
    
    // 8 vertices of a cube in isometric projection
    const baseVertices = [
      {x: -s, y: s},      // 0: bottom-left-front
      {x: s, y: s},       // 1: bottom-right-front
      {x: s + d, y: d},   // 2: bottom-right-back
      {x: -s + d, y: d},  // 3: bottom-left-back
      {x: -s, y: -s},     // 4: top-left-front
      {x: s, y: -s},      // 5: top-right-front
      {x: s + d, y: -s - d}, // 6: top-right-back
      {x: -s + d, y: -s - d}, // 7: top-left-back
    ];
    
    // Apply morphing and rotation
    return baseVertices.map(v => {
      const angle = Math.atan2(v.y, v.x) + rotation;
      const dist = Math.hypot(v.x, v.y) * (1 + morph * 0.3);
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist
      };
    });
  }
  
  private drawCubeFace(vertices: Array<{x: number, y: number}>, indices: number[], hue: number, alpha: number, lightness: number, _audio: AudioData): void {
    this.graphics.beginFill(this.hslToHex(hue, 70, lightness), alpha);
    this.graphics.moveTo(vertices[indices[0]].x, vertices[indices[0]].y);
    for (let i = 1; i < indices.length; i++) {
      this.graphics.lineTo(vertices[indices[i]].x, vertices[indices[i]].y);
    }
    this.graphics.closePath();
    this.graphics.endFill();
  }
  
  private drawCubeEdges(vertices: Array<{x: number, y: number}>): void {
    // Draw all 12 edges of the cube
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Bottom
      [4, 5], [5, 6], [6, 7], [7, 4], // Top
      [0, 4], [1, 5], [2, 6], [3, 7]  // Vertical
    ];
    
    edges.forEach(([i, j]) => {
      this.graphics.moveTo(vertices[i].x, vertices[i].y);
      this.graphics.lineTo(vertices[j].x, vertices[j].y);
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
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
