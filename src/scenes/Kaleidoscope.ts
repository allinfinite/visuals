import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface KaleidoShape {
  x: number; // Position in the first segment (0-1 normalized)
  y: number; // Distance from center (0-1 normalized)
  vx: number;
  vy: number;
  size: number;
  hue: number;
  rotation: number;
  rotationSpeed: number;
  type: 'circle' | 'triangle' | 'square' | 'star';
  life: number;
  maxLife: number;
}

export class Kaleidoscope implements Pattern {
  public name = 'Kaleidoscope';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private segments: number = 8;
  private shapes: KaleidoShape[] = [];
  private maxRadius: number;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Calculate max radius for full-screen coverage
    this.maxRadius = Math.sqrt(
      Math.pow(context.width / 2, 2) + Math.pow(context.height / 2, 2)
    );
    
    // Initialize with some shapes
    for (let i = 0; i < 15; i++) {
      this.spawnShape();
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt * (0.3 + audio.rms);
    
    // Change segment count on beat
    if (audio.beat && Math.random() < 0.2) {
      this.segments = 6 + Math.floor(Math.random() * 7) * 2; // 6, 8, 10, 12, 14, 16, 18
    }
    
    // Spawn new shapes
    const spawnRate = (0.5 + audio.rms * 2 + (audio.beat ? 5 : 0)) * dt;
    if (Math.random() < spawnRate && this.shapes.length < 40) {
      this.spawnShape();
    }
    
    // Update shapes
    this.shapes.forEach(shape => {
      shape.x += shape.vx * dt;
      shape.y += shape.vy * dt * (0.5 + audio.bass);
      shape.rotation += shape.rotationSpeed * dt;
      shape.life += dt;
      shape.hue = (shape.hue + dt * 20 + audio.treble * 30) % 360;
      
      // Bounce off edges
      if (shape.y > 1) {
        shape.y = 1;
        shape.vy *= -0.5;
      }
      if (shape.y < 0) {
        shape.y = 0;
        shape.vy *= -0.5;
      }
    });
    
    // Remove old shapes
    this.shapes = this.shapes.filter(s => s.life < s.maxLife);
    
    // Mouse interaction
    if (input.isDown || input.isDragging) {
      const { width, height } = this.context;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Convert mouse position to segment coordinates
      const dx = input.x - centerX;
      const dy = input.y - centerY;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      
      // Normalize to first segment
      const segmentAngle = (Math.PI * 2) / this.segments;
      const normalizedAngle = ((angle % segmentAngle) + segmentAngle) % segmentAngle;
      
      this.spawnShape(normalizedAngle / segmentAngle, dist / this.maxRadius);
    }

    this.draw(audio, input);
  }
  
  private spawnShape(x?: number, y?: number): void {
    this.shapes.push({
      x: x !== undefined ? x : Math.random(),
      y: y !== undefined ? y : Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: Math.random() * 0.1 + 0.05,
      size: 5 + Math.random() * 15,
      hue: Math.random() * 360,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 2,
      type: ['circle', 'triangle', 'square', 'star'][Math.floor(Math.random() * 4)] as any,
      life: 0,
      maxLife: 10 + Math.random() * 10,
    });
  }

  private draw(audio: AudioData, _input: InputState): void {
    this.graphics.clear();

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const segmentAngle = (Math.PI * 2) / this.segments;

    // Draw segment divider lines for visual clarity
    this.graphics.lineStyle(1, 0xffffff, 0.1);
    for (let seg = 0; seg < this.segments; seg++) {
      const angle = seg * segmentAngle;
      const x = centerX + Math.cos(angle) * this.maxRadius;
      const y = centerY + Math.sin(angle) * this.maxRadius;
      this.graphics.moveTo(centerX, centerY);
      this.graphics.lineTo(x, y);
    }

    // Draw all shapes mirrored across all segments
    this.shapes.forEach(shape => {
      // Calculate fade in/out alpha
      const lifeProgress = shape.life / shape.maxLife;
      let alphaMultiplier = 1;
      if (lifeProgress < 0.1) {
        alphaMultiplier = lifeProgress / 0.1; // Fade in
      } else if (lifeProgress > 0.9) {
        alphaMultiplier = 1 - (lifeProgress - 0.9) / 0.1; // Fade out
      }
      
      // Draw this shape in all segments with mirroring
      for (let seg = 0; seg < this.segments; seg++) {
        const baseAngle = seg * segmentAngle;
        
        // Alternate segments are mirrored (true kaleidoscope effect)
        const mirror = seg % 2 === 0;
        const normalizedX = mirror ? shape.x : (1 - shape.x);
        
        // Calculate position in this segment
        const angleInSegment = normalizedX * segmentAngle;
        const radius = shape.y * this.maxRadius;
        
        const finalAngle = baseAngle + angleInSegment;
        const x = centerX + Math.cos(finalAngle) * radius;
        const y = centerY + Math.sin(finalAngle) * radius;
        
        // Calculate audio-reactive size
        const beatBoost = audio.beat ? 1.3 : 1;
        const size = shape.size * (1 + audio.rms * 0.5) * beatBoost;
        const alpha = (0.6 + audio.mid * 0.4) * alphaMultiplier;
        
        // Draw shape with glow
        this.drawShape(shape.type, x, y, size, shape.hue, shape.rotation, alpha, audio);
      }
    });

    // Draw pulsing center
    const centerRadius = 15 + audio.bass * 30;
    const centerHue = (this.time * 50 + audio.centroid * 180) % 360;
    
    // Outer glow
    this.graphics.beginFill(this.hslToHex(centerHue, 100, 50), 0.3);
    this.graphics.drawCircle(centerX, centerY, centerRadius * 2);
    this.graphics.endFill();
    
    // Main circle
    this.graphics.beginFill(this.hslToHex(centerHue, 100, 60), 0.7);
    this.graphics.drawCircle(centerX, centerY, centerRadius);
    this.graphics.endFill();
    
    // Inner highlight
    this.graphics.beginFill(0xffffff, 0.9);
    this.graphics.drawCircle(centerX, centerY, centerRadius * 0.4);
    this.graphics.endFill();
  }
  
  private drawShape(
    type: string, 
    x: number, 
    y: number, 
    size: number, 
    hue: number, 
    rotation: number, 
    alpha: number,
    _audio: AudioData
  ): void {
    const color = this.hslToHex(hue, 100, 60);
    const glowColor = this.hslToHex(hue, 100, 70);
    
    // Draw glow
    this.graphics.beginFill(glowColor, alpha * 0.3);
    
    switch (type) {
      case 'circle':
        this.graphics.drawCircle(x, y, size * 1.5);
        this.graphics.endFill();
        this.graphics.beginFill(color, alpha);
        this.graphics.drawCircle(x, y, size);
        break;
        
      case 'triangle':
        this.drawPolygon(x, y, size * 1.5, 3, rotation);
        this.graphics.endFill();
        this.graphics.beginFill(color, alpha);
        this.drawPolygon(x, y, size, 3, rotation);
        break;
        
      case 'square':
        this.drawPolygon(x, y, size * 1.5, 4, rotation);
        this.graphics.endFill();
        this.graphics.beginFill(color, alpha);
        this.drawPolygon(x, y, size, 4, rotation);
        break;
        
      case 'star':
        this.drawStar(x, y, size * 1.5, 5, rotation);
        this.graphics.endFill();
        this.graphics.beginFill(color, alpha);
        this.drawStar(x, y, size, 5, rotation);
        break;
    }
    this.graphics.endFill();
    
    // Add bright center dot
    this.graphics.beginFill(0xffffff, alpha * 0.6);
    this.graphics.drawCircle(x, y, size * 0.3);
    this.graphics.endFill();
  }
  
  private drawPolygon(x: number, y: number, radius: number, sides: number, rotation: number): void {
    const points: number[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + rotation;
      points.push(x + Math.cos(angle) * radius);
      points.push(y + Math.sin(angle) * radius);
    }
    this.graphics.drawPolygon(points);
  }
  
  private drawStar(x: number, y: number, radius: number, points: number, rotation: number): void {
    const path: number[] = [];
    const innerRadius = radius * 0.5;
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 + rotation;
      const r = i % 2 === 0 ? radius : innerRadius;
      path.push(x + Math.cos(angle) * r);
      path.push(y + Math.sin(angle) * r);
    }
    
    this.graphics.drawPolygon(path);
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

