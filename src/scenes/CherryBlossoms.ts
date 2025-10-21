import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { noise2D } from '../utils/noise';

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: number;
  alpha: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmplitude: number;
  scattered: boolean;
  scatterTime: number;
}

export class CherryBlossoms implements Pattern {
  public name = 'Cherry Blossoms';
  public container: Container;
  private graphics: Graphics;
  private petals: Petal[] = [];
  private context: RendererContext;
  private time: number = 0;
  private spawnRate: number = 15; // Petals per second
  private maxPetals: number = 300;
  
  // Cherry blossom color palette
  private colors: number[] = [
    0xffb7c5, // Light pink
    0xff9db5, // Medium pink
    0xffc0cb, // Pink
    0xffeef5, // Very light pink
    0xffffff, // White
    0xffafcc, // Soft pink
  ];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initPetals();
  }

  private initPetals(): void {
    // Start with some petals already falling
    for (let i = 0; i < 50; i++) {
      this.spawnPetal(
        randomRange(0, this.context.width),
        randomRange(-this.context.height, 0)
      );
    }
  }

  private spawnPetal(x: number, y: number, scattered: boolean = false): void {
    const petal: Petal = {
      x,
      y,
      vx: scattered ? randomRange(-100, 100) : randomRange(-10, 10),
      vy: scattered ? randomRange(-150, -50) : randomRange(20, 60),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: randomRange(-2, 2),
      size: randomRange(8, 16),
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      alpha: randomRange(0.6, 1),
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: randomRange(1, 2),
      swayAmplitude: randomRange(20, 40),
      scattered,
      scatterTime: 0,
    };
    
    this.petals.push(petal);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Handle user interaction - scatter petals on click or drag
    const interactionRadius = 100;
    
    // Click interaction
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05) {
        this.petals.forEach(p => {
          const dx = p.x - click.x;
          const dy = p.y - click.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < interactionRadius) {
            // Scatter the petal
            const angle = Math.atan2(dy, dx);
            const force = (1 - dist / interactionRadius) * 500;
            p.vx = Math.cos(angle) * force;
            p.vy = Math.sin(angle) * force - 100; // Add upward force
            p.scattered = true;
            p.scatterTime = 0;
            p.rotationSpeed = randomRange(-10, 10);
          }
        });
        
        // Spawn burst of new petals on click
        const burstCount = Math.floor(20 * (1 + audio.bass));
        for (let i = 0; i < burstCount && this.petals.length < this.maxPetals; i++) {
          const angle = (Math.PI * 2 * i) / burstCount;
          const dist = randomRange(20, 60);
          this.spawnPetal(
            click.x + Math.cos(angle) * dist,
            click.y + Math.sin(angle) * dist,
            true
          );
        }
      }
    });
    
    // Drag interaction - push petals away
    if (input.isDragging) {
      this.petals.forEach(p => {
        const dx = p.x - input.x;
        const dy = p.y - input.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < interactionRadius && dist > 0) {
          const angle = Math.atan2(dy, dx);
          const force = (1 - dist / interactionRadius) * 200;
          p.vx += Math.cos(angle) * force * dt;
          p.vy += Math.sin(angle) * force * dt;
        }
      });
    }

    // Spawn new petals from top
    const audioBoost = 1 + audio.treble * 0.5;
    const petalsToSpawn = this.spawnRate * dt * audioBoost;
    
    if (Math.random() < petalsToSpawn && this.petals.length < this.maxPetals) {
      this.spawnPetal(
        randomRange(0, this.context.width),
        randomRange(-50, -10)
      );
    }

    // Update petals
    this.petals.forEach(p => {
      if (p.scattered) {
        p.scatterTime += dt;
        // Scattered petals gradually return to normal falling
        if (p.scatterTime > 1) {
          const returnFactor = Math.min((p.scatterTime - 1) / 2, 1);
          p.vx *= (1 - returnFactor * 0.1);
          p.vy = p.vy * (1 - returnFactor * 0.05) + 50 * returnFactor * dt * 10;
          p.rotationSpeed *= (1 - returnFactor * 0.05);
          
          if (p.scatterTime > 3) {
            p.scattered = false;
          }
        }
      } else {
        // Normal gentle swaying motion
        p.swayPhase += p.swaySpeed * dt;
        const swayForce = Math.sin(p.swayPhase) * p.swayAmplitude;
        p.vx = swayForce;
      }

      // Apply wind using Perlin noise
      const windX = noise2D(p.x * 0.005, this.time * 0.3) * 30;
      const windY = noise2D(p.x * 0.005 + 100, this.time * 0.3) * 10;
      
      p.vx += windX * dt;
      p.vy += windY * dt;

      // Apply velocity
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Rotation
      p.rotation += p.rotationSpeed * dt;

      // Gentle gravity
      if (!p.scattered) {
        p.vy += 5 * dt;
      } else {
        p.vy += 100 * dt; // Stronger gravity for scattered petals
      }

      // Air resistance
      p.vx *= 0.98;
      if (p.scattered) {
        p.vy *= 0.98;
      }

      // Audio reactivity - flutter on beats
      if (audio.beat && !p.scattered) {
        p.rotationSpeed += randomRange(-2, 2);
        p.vx += randomRange(-20, 20);
      }

      // Wrap horizontally
      if (p.x < -50) p.x = this.context.width + 50;
      if (p.x > this.context.width + 50) p.x = -50;
    });

    // Remove petals that have fallen off screen
    this.petals = this.petals.filter(p => p.y < this.context.height + 100);

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw petals
    this.petals.forEach(p => {
      // Draw petal shape (5-petaled cherry blossom style)
      const size = p.size * (0.9 + audio.rms * 0.1);
      const alpha = p.alpha * (0.8 + audio.treble * 0.2);

      // Outer glow
      this.graphics.beginFill(p.color, alpha * 0.2);
      this.drawPetalShapeAt(p.x, p.y, p.rotation, size * 1.5);
      this.graphics.endFill();

      // Main petal
      this.graphics.beginFill(p.color, alpha);
      this.drawPetalShapeAt(p.x, p.y, p.rotation, size);
      this.graphics.endFill();

      // Inner highlight
      this.graphics.beginFill(0xffffff, alpha * 0.3);
      this.drawPetalShapeAt(p.x, p.y, p.rotation, size * 0.4);
      this.graphics.endFill();

      // Center dot
      this.graphics.beginFill(0xffb7c5, alpha * 0.6);
      this.graphics.drawCircle(p.x, p.y, size * 0.15);
      this.graphics.endFill();
    });

    // Draw ground petals (accumulation effect)
    this.drawGroundPetals();
  }

  private rotatePoint(x: number, y: number, cx: number, cy: number, angle: number): [number, number] {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = x - cx;
    const dy = y - cy;
    return [
      cx + dx * cos - dy * sin,
      cy + dx * sin + dy * cos
    ];
  }

  private drawPetalShapeAt(centerX: number, centerY: number, rotation: number, size: number): void {
    // Draw a stylized 5-petal cherry blossom shape
    const petals = 5;
    
    for (let i = 0; i < petals; i++) {
      const angle = (Math.PI * 2 * i) / petals - Math.PI / 2;
      const nextAngle = (Math.PI * 2 * (i + 1)) / petals - Math.PI / 2;
      
      // Calculate local coordinates
      const x1 = Math.cos(angle) * size * 0.4;
      const y1 = Math.sin(angle) * size * 0.4;
      const x2 = Math.cos(angle + (nextAngle - angle) / 2) * size;
      const y2 = Math.sin(angle + (nextAngle - angle) / 2) * size * 0.8;
      const x3 = Math.cos(nextAngle) * size * 0.4;
      const y3 = Math.sin(nextAngle) * size * 0.4;
      
      // Transform to world coordinates with rotation
      const [wx1, wy1] = this.rotatePoint(x1, y1, 0, 0, rotation);
      const [wx2, wy2] = this.rotatePoint(x2, y2, 0, 0, rotation);
      const [wx3, wy3] = this.rotatePoint(x3, y3, 0, 0, rotation);
      const [wcp1x, wcp1y] = this.rotatePoint(
        x1 + (x2 - x1) * 0.5,
        y1 + (y2 - y1) * 0.3,
        0, 0, rotation
      );
      
      // Draw petal using bezier curve
      this.graphics.moveTo(centerX, centerY);
      this.graphics.lineTo(centerX + wx1, centerY + wy1);
      this.graphics.bezierCurveTo(
        centerX + wcp1x, centerY + wcp1y,
        centerX + wx2, centerY + wy2,
        centerX + wx3, centerY + wy3
      );
      this.graphics.lineTo(centerX, centerY);
    }
  }

  private drawGroundPetals(): void {
    // Draw a subtle layer of accumulated petals at the bottom
    const groundY = this.context.height - 100;
    const petalCount = 30;
    
    for (let i = 0; i < petalCount; i++) {
      const x = (this.context.width / petalCount) * i + (Math.sin(this.time + i) * 10);
      const y = groundY + Math.sin(this.time * 0.5 + i) * 5;
      const size = randomRange(6, 12);
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      const rotation = Math.sin(this.time + i * 0.5) * 0.1;
      
      // Semi-transparent ground petals
      this.graphics.beginFill(color, 0.2);
      this.drawPetalShapeAt(x, y, rotation, size);
      this.graphics.endFill();
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

