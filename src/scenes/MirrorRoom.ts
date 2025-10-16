import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { noise2D } from '../utils/noise';

interface ReflectedObject {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  shape: number;
  rotation: number;
}

export class MirrorRoom implements Pattern {
  public name = 'Mirror Room';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private objects: ReflectedObject[] = [];
  private time: number = 0;
  private reflectionCount: number = 4; // Number of mirror reflections
  private roomRotation: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize some objects
    for (let i = 0; i < 5; i++) {
      this.spawnObject();
    }
  }

  private spawnObject(): void {
    const { width, height } = this.context;
    
    this.objects.push({
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height / 2 + (Math.random() - 0.5) * height * 0.3,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
      size: 20 + Math.random() * 40,
      hue: Math.random() * 360,
      shape: Math.floor(Math.random() * 4),
      rotation: Math.random() * Math.PI * 2,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Reflection count based on amplitude (1-8 reflections)
    this.reflectionCount = Math.floor(2 + audio.rms * 6);

    // Room rotation
    this.roomRotation += dt * 0.3 * (1 + audio.treble);

    // Click spawns new object
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.objects.length < 15) {
        this.spawnObject();
      }
    });

    // Beat spawns object
    if (audio.beat && this.objects.length < 20) {
      this.spawnObject();
    }

    // Update objects
    this.objects.forEach((obj) => {
      // Movement with noise
      const noiseX = noise2D(obj.x * 0.01, this.time * 0.5);
      const noiseY = noise2D(obj.y * 0.01, this.time * 0.5 + 100);
      
      obj.vx += noiseX * 100 * dt;
      obj.vy += noiseY * 100 * dt;

      // Apply velocity
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // Bounce off "room" boundaries
      const { width, height } = this.context;
      const margin = 50;
      
      if (obj.x < margin || obj.x > width - margin) {
        obj.vx *= -0.8; // Damping on bounce
        obj.x = Math.max(margin, Math.min(width - margin, obj.x));
      }
      if (obj.y < margin || obj.y > height - margin) {
        obj.vy *= -0.8;
        obj.y = Math.max(margin, Math.min(height - margin, obj.y));
      }

      // Friction
      obj.vx *= 0.98;
      obj.vy *= 0.98;

      // Rotation
      obj.rotation += dt * (1 + audio.mid);

      // Hue shifts
      obj.hue = (obj.hue + dt * 30 + audio.centroid * 50) % 360;

      // Size pulses
      obj.size *= 1 + (audio.beat ? 0.1 : -0.05 * dt);
      obj.size = Math.max(15, Math.min(60, obj.size));
    });

    // Remove excess objects
    if (this.objects.length > 12) {
      this.objects = this.objects.slice(-10);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw room boundaries (walls)
    const wallAlpha = 0.2 + audio.rms * 0.3;
    this.graphics.lineStyle(3, 0xffffff, wallAlpha);
    this.graphics.drawRect(50, 50, width - 100, height - 100);

    // Draw corner indicators
    const cornerSize = 20 + audio.bass * 20;
    const cornerColor = hslToHex((this.time * 100) % 360, 70, 50);
    this.graphics.beginFill(cornerColor, 0.5);
    this.graphics.drawCircle(50, 50, cornerSize);
    this.graphics.drawCircle(width - 50, 50, cornerSize);
    this.graphics.drawCircle(width - 50, height - 50, cornerSize);
    this.graphics.drawCircle(50, height - 50, cornerSize);
    this.graphics.endFill();

    // Draw each object with its reflections
    this.objects.forEach((obj) => {
      // Draw the original object
      this.drawObject(obj, 1, audio);

      // Draw reflections
      for (let i = 1; i <= this.reflectionCount; i++) {
        const reflectionAlpha = Math.pow(0.7, i); // Fade with each reflection
        const reflectivity = 0.5 + audio.rms * 0.5; // Audio controls reflectivity

        // Rotational symmetry (kaleidoscope effect)
        const angle = (i / this.reflectionCount) * Math.PI * 2 + this.roomRotation;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Calculate reflected position
        const dx = obj.x - centerX;
        const dy = obj.y - centerY;
        const reflectedX = centerX + dx * cos - dy * sin;
        const reflectedY = centerY + dx * sin + dy * cos;

        const reflectedObj = {
          ...obj,
          x: reflectedX,
          y: reflectedY,
          rotation: obj.rotation + angle,
        };

        this.drawObject(reflectedObj, reflectionAlpha * reflectivity, audio);

        // Mirror reflections (flip horizontally/vertically)
        if (i % 2 === 0) {
          const mirroredObj = {
            ...obj,
            x: width - obj.x,
            y: obj.y,
          };
          this.drawObject(mirroredObj, reflectionAlpha * reflectivity * 0.7, audio);
        }

        if (i % 3 === 0) {
          const mirroredObj = {
            ...obj,
            x: obj.x,
            y: height - obj.y,
          };
          this.drawObject(mirroredObj, reflectionAlpha * reflectivity * 0.7, audio);
        }
      }
    });

    // Draw reflection lines (connecting objects to their reflections)
    if (audio.beat) {
      this.objects.forEach((obj) => {
        for (let i = 1; i <= Math.min(2, this.reflectionCount); i++) {
          const angle = (i / this.reflectionCount) * Math.PI * 2 + this.roomRotation;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const dx = obj.x - centerX;
          const dy = obj.y - centerY;
          const reflectedX = centerX + dx * cos - dy * sin;
          const reflectedY = centerY + dx * sin + dy * cos;

          const color = hslToHex(obj.hue, 70, 50);
          this.graphics.lineStyle(1, color, 0.3);
          this.graphics.moveTo(obj.x, obj.y);
          this.graphics.lineTo(reflectedX, reflectedY);
        }
      });
    }
  }

  private drawObject(obj: ReflectedObject, alpha: number, audio: AudioData): void {
    if (alpha < 0.05) return;

    const color = hslToHex(obj.hue, 70, 50);
    const glowColor = hslToHex(obj.hue, 100, 70);

    // Glow
    this.graphics.beginFill(glowColor, alpha * 0.3 * (1 + audio.rms * 0.5));
    this.graphics.drawCircle(obj.x, obj.y, obj.size * 1.5);
    this.graphics.endFill();

    // Draw shape based on type
    switch (obj.shape) {
      case 0: // Circle
        this.graphics.beginFill(color, alpha * 0.8);
        this.graphics.drawCircle(obj.x, obj.y, obj.size);
        this.graphics.endFill();
        break;

      case 1: // Square
        this.graphics.beginFill(color, alpha * 0.8);
        this.drawRotatedRect(obj.x, obj.y, obj.size * 2, obj.size * 2, obj.rotation);
        this.graphics.endFill();
        break;

      case 2: // Triangle
        this.graphics.beginFill(color, alpha * 0.8);
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + obj.rotation;
          const px = obj.x + Math.cos(angle) * obj.size;
          const py = obj.y + Math.sin(angle) * obj.size;
          if (i === 0) this.graphics.moveTo(px, py);
          else this.graphics.lineTo(px, py);
        }
        this.graphics.closePath();
        this.graphics.endFill();
        break;

      case 3: // Star
        this.graphics.beginFill(color, alpha * 0.8);
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2 + obj.rotation;
          const radius = i % 2 === 0 ? obj.size : obj.size * 0.5;
          const px = obj.x + Math.cos(angle) * radius;
          const py = obj.y + Math.sin(angle) * radius;
          if (i === 0) this.graphics.moveTo(px, py);
          else this.graphics.lineTo(px, py);
        }
        this.graphics.closePath();
        this.graphics.endFill();
        break;
    }

    // Core highlight
    this.graphics.beginFill(0xffffff, alpha * 0.3);
    this.graphics.drawCircle(obj.x, obj.y, obj.size * 0.3);
    this.graphics.endFill();
  }

  private drawRotatedRect(x: number, y: number, w: number, h: number, rotation: number): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const hw = w / 2;
    const hh = h / 2;

    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];

    corners.forEach((corner, i) => {
      const rx = corner.x * cos - corner.y * sin + x;
      const ry = corner.x * sin + corner.y * cos + y;
      if (i === 0) this.graphics.moveTo(rx, ry);
      else this.graphics.lineTo(rx, ry);
    });
    this.graphics.closePath();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

