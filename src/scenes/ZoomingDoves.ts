import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { hslToHex } from '../utils/color';

interface Dove {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  targetX: number;
  targetY: number;
  wingPhase: number;
  wingSpeed: number;
  rotation: number;
  size: number;
  lastFlowerTime: number;
}

interface Flower {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  size: number;
  maxSize: number;
  hue: number;
  petalCount: number;
  rotation: number;
  rotationSpeed: number;
}

export class ZoomingDoves implements Pattern {
  public name = 'Zooming Doves';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private doves: Dove[] = [];
  private flowers: Flower[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize doves zipping around
    for (let i = 0; i < 8; i++) {
      this.spawnDove();
    }
  }

  private spawnDove(): void {
    const { width, height } = this.context;
    const x = randomRange(0, width);
    const y = randomRange(0, height);
    
    this.doves.push({
      x,
      y,
      vx: 0,
      vy: 0,
      speed: randomRange(200, 400), // Fast zipping speed
      targetX: randomRange(0, width),
      targetY: randomRange(0, height),
      wingPhase: randomRange(0, Math.PI * 2),
      wingSpeed: randomRange(15, 25),
      rotation: 0,
      size: randomRange(20, 35),
      lastFlowerTime: 0,
    });
  }

  private spawnFlower(x: number, y: number, hue: number): void {
    this.flowers.push({
      x,
      y,
      age: 0,
      maxAge: randomRange(2, 4),
      size: 0,
      maxSize: randomRange(30, 60),
      hue,
      petalCount: Math.floor(randomRange(5, 8)),
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-0.5, 0.5),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    const { width, height } = this.context;

    // Update doves - zip around the screen
    this.doves.forEach((dove) => {
      // Calculate direction to target
      const dx = dove.targetX - dove.x;
      const dy = dove.targetY - dove.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If close to target, pick a new one
      if (dist < 50) {
        dove.targetX = randomRange(0, width);
        dove.targetY = randomRange(0, height);
      }

      // Accelerate towards target (zipping motion)
      const acceleration = dove.speed * (1 + audio.rms * 0.5);
      dove.vx += (dx / dist) * acceleration * dt;
      dove.vy += (dy / dist) * acceleration * dt;

      // Limit max speed for zipping effect
      const maxSpeed = 500 + audio.treble * 300;
      const currentSpeed = Math.sqrt(dove.vx * dove.vx + dove.vy * dove.vy);
      if (currentSpeed > maxSpeed) {
        dove.vx = (dove.vx / currentSpeed) * maxSpeed;
        dove.vy = (dove.vy / currentSpeed) * maxSpeed;
      }

      // Apply velocity
      dove.x += dove.vx * dt;
      dove.y += dove.vy * dt;

      // Friction
      dove.vx *= 0.98;
      dove.vy *= 0.98;

      // Rotation based on movement direction
      dove.rotation = Math.atan2(dove.vy, dove.vx);

      // Wing flapping
      dove.wingPhase += dove.wingSpeed * dt;

      // Spawn flower trail as dove moves (leave trail periodically)
      const flowerInterval = 0.15 - audio.rms * 0.1; // Faster trail with more audio
      if (this.time - dove.lastFlowerTime > flowerInterval) {
        const speed = Math.sqrt(dove.vx * dove.vx + dove.vy * dove.vy);
        if (speed > 100) { // Only spawn flowers when moving fast enough
          const hue = (this.time * 30 + dove.x * 0.1) % 360;
          this.spawnFlower(dove.x, dove.y, hue);
          dove.lastFlowerTime = this.time;
        }
      }

      // Wrap around screen edges
      if (dove.x < -50) dove.x = width + 50;
      if (dove.x > width + 50) dove.x = -50;
      if (dove.y < -50) dove.y = height + 50;
      if (dove.y > height + 50) dove.y = -50;
    });

    // Update flowers - expand over time
    this.flowers.forEach((flower) => {
      flower.age += dt;
      flower.rotation += flower.rotationSpeed * dt;

      // Expand flower size
      const progress = flower.age / flower.maxAge;
      flower.size = flower.maxSize * Math.sin(progress * Math.PI); // Smooth expansion and fade
    });

    // Remove old flowers
    this.flowers = this.flowers.filter(f => f.age < f.maxAge);

    // Click spawns dove
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.doves.length < 20) {
        this.spawnDove();
        // Also spawn a flower at click location
        this.spawnFlower(click.x, click.y, (this.time * 50) % 360);
      }
    });

    // Beat spawns more doves
    if (audio.beat && this.doves.length < 15) {
      this.spawnDove();
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw flowers first (behind doves)
    this.flowers.forEach((flower) => {
      this.drawFlower(flower, audio);
    });

    // Draw doves
    this.doves.forEach((dove) => {
      const wingOpen = Math.abs(Math.sin(dove.wingPhase)) * 0.8 + 0.2;
      this.drawDove(dove.x, dove.y, dove.size, wingOpen, 1.0, dove.rotation, audio);
    });
  }

  private drawFlower(flower: Flower, audio: AudioData): void {
    if (flower.size < 1) return;

    const progress = flower.age / flower.maxAge;
    const alpha = Math.sin(progress * Math.PI) * 0.8; // Fade in and out

    const petalColor = hslToHex(flower.hue, 70, 60);
    const centerColor = hslToHex((flower.hue + 40) % 360, 80, 50);

    // Draw petals
    for (let i = 0; i < flower.petalCount; i++) {
      const angle = (i / flower.petalCount) * Math.PI * 2 + flower.rotation;
      const petalLength = flower.size * 0.8;
      const petalWidth = flower.size * 0.4;

      // Petal position
      const px = flower.x + Math.cos(angle) * flower.size * 0.3;
      const py = flower.y + Math.sin(angle) * flower.size * 0.3;

      // Draw petal as ellipse
      this.graphics.lineStyle(0);
      this.graphics.beginFill(petalColor, alpha * 0.9);
      
      // Rotate graphics context for petal
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Draw petal manually with transformed points
      this.graphics.moveTo(px, py);
      for (let t = 0; t <= 1; t += 0.1) {
        const a = t * Math.PI * 2;
        const rx = Math.cos(a) * petalLength * 0.5;
        const ry = Math.sin(a) * petalWidth * 0.5;
        const x = px + rx * cos - ry * sin;
        const y = py + rx * sin + ry * cos;
        this.graphics.lineTo(x, y);
      }
      this.graphics.endFill();
    }

    // Draw center
    this.graphics.beginFill(centerColor, alpha);
    this.graphics.drawCircle(flower.x, flower.y, flower.size * 0.25);
    this.graphics.endFill();

    // Draw center details (stamens)
    this.graphics.beginFill(0xffff00, alpha * 0.8);
    this.graphics.drawCircle(flower.x, flower.y, flower.size * 0.12);
    this.graphics.endFill();

    // Pulsing glow with audio
    if (audio.beat && progress < 0.5) {
      this.graphics.beginFill(petalColor, alpha * 0.2);
      this.graphics.drawCircle(flower.x, flower.y, flower.size * 1.3);
      this.graphics.endFill();
    }
  }

  private drawDove(x: number, y: number, size: number, wingOpen: number, alpha: number, rotation: number, audio: AudioData): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // Helper to rotate points
    const rotate = (px: number, py: number) => {
      return {
        x: x + px * cos - py * sin,
        y: y + px * sin + py * cos
      };
    };

    // Body
    this.graphics.beginFill(0xffffff, alpha * 0.9);
    for (let i = 0; i <= 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const bx = Math.cos(angle) * size * 0.6;
      const by = Math.sin(angle) * size * 0.4;
      const rp = rotate(bx, by);
      if (i === 0) this.graphics.moveTo(rp.x, rp.y);
      else this.graphics.lineTo(rp.x, rp.y);
    }
    this.graphics.endFill();

    // Head
    const headPos = rotate(size * 0.5, -size * 0.1);
    this.graphics.beginFill(0xffffff, alpha * 0.95);
    this.graphics.drawCircle(headPos.x, headPos.y, size * 0.35);
    this.graphics.endFill();

    // Beak
    const beak1 = rotate(size * 0.7, -size * 0.1);
    const beak2 = rotate(size * 0.9, -size * 0.15);
    const beak3 = rotate(size * 0.9, -size * 0.05);
    this.graphics.beginFill(0xffa500, alpha * 0.8);
    this.graphics.moveTo(beak1.x, beak1.y);
    this.graphics.lineTo(beak2.x, beak2.y);
    this.graphics.lineTo(beak3.x, beak3.y);
    this.graphics.endFill();

    // Eye
    const eyePos = rotate(size * 0.6, -size * 0.15);
    this.graphics.beginFill(0x000000, alpha * 0.9);
    this.graphics.drawCircle(eyePos.x, eyePos.y, size * 0.08);
    this.graphics.endFill();

    // Wings (animated)
    const wingSpan = size * 1.2 * wingOpen;
    
    // Left wing
    const wing1 = rotate(-size * 0.3, -wingSpan * 0.5);
    const wing2 = rotate(-size * 0.7, -wingSpan * 0.3);
    const wing3 = rotate(-size * 0.7, wingSpan * 0.3);
    const wing4 = rotate(-size * 0.3, wingSpan * 0.5);
    
    this.graphics.beginFill(0xf5f5f5, alpha * 0.85);
    this.graphics.moveTo(rotate(0, 0).x, rotate(0, 0).y);
    this.graphics.lineTo(wing1.x, wing1.y);
    this.graphics.lineTo(wing2.x, wing2.y);
    this.graphics.lineTo(wing3.x, wing3.y);
    this.graphics.lineTo(wing4.x, wing4.y);
    this.graphics.endFill();

    // Tail
    const tail1 = rotate(-size * 0.6, 0);
    const tail2 = rotate(-size * 1.0, -size * 0.2);
    const tail3 = rotate(-size * 1.0, size * 0.2);
    this.graphics.beginFill(0xf0f0f0, alpha * 0.8);
    this.graphics.moveTo(tail1.x, tail1.y);
    this.graphics.lineTo(tail2.x, tail2.y);
    this.graphics.lineTo(tail3.x, tail3.y);
    this.graphics.endFill();

    // Motion trail glow
    if (audio.beat) {
      this.graphics.beginFill(0xffffff, alpha * 0.15);
      this.graphics.drawCircle(x, y, size * 1.3);
      this.graphics.endFill();
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

