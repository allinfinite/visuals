import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';
import { randomRange } from '../utils/math';

interface DrawObject {
  x: number;
  y: number;
  size: number;
  hue: number;
  alpha: number;
  lifetime: number;
  maxLifetime: number;
  shape: number; // 0-4 different shapes
}

export class SymmetryMirrors implements Pattern {
  public name = 'Symmetry Mirrors';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private objects: DrawObject[] = [];

  // Symmetry settings
  private symmetryAxes: number = 4; // Number of mirror axes
  private rotationalSymmetry: boolean = true;
  private horizontalMirror: boolean = true;
  private verticalMirror: boolean = true;

  // Center of symmetry
  private centerX: number;
  private centerY: number;

  constructor(context: RendererContext) {
    this.context = context;
    this.centerX = context.width / 2;
    this.centerY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Update symmetry center to follow cursor smoothly
    this.centerX += (input.x - this.centerX) * 2 * dt;
    this.centerY += (input.y - this.centerY) * 2 * dt;

    // Adjust symmetry based on audio
    this.symmetryAxes = Math.floor(4 + audio.rms * 4); // 4-8 axes

    // Spawn object on click
    if (input.isDown && Math.random() < 0.3) {
      this.spawnObject(input.x, input.y, audio);
    }

    // Autonomous spawning on beat
    if (audio.beat || Math.random() < audio.rms * 0.05) {
      const angle = Math.random() * Math.PI * 2;
      const radius = randomRange(50, 200);
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      this.spawnObject(x, y, audio);
    }

    // Update objects
    this.objects.forEach(obj => {
      obj.lifetime += dt;
      obj.alpha = 1 - obj.lifetime / obj.maxLifetime;

      // Expand slightly
      obj.size += dt * 10;
    });

    // Remove dead objects
    this.objects = this.objects.filter(obj => obj.lifetime < obj.maxLifetime);

    // Limit object count
    if (this.objects.length > 100) {
      this.objects.shift();
    }

    this.draw(audio);
  }

  private spawnObject(x: number, y: number, audio: AudioData): void {
    this.objects.push({
      x,
      y,
      size: 10 + audio.bass * 20,
      hue: audio.centroid * 360,
      alpha: 1,
      lifetime: 0,
      maxLifetime: 2 + audio.rms * 3,
      shape: Math.floor(Math.random() * 5),
    });
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw symmetry axes (faint lines)
    this.graphics.lineStyle(1, 0xffffff, 0.1);
    for (let i = 0; i < this.symmetryAxes; i++) {
      const angle = (i / this.symmetryAxes) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const length = Math.max(this.context.width, this.context.height);

      this.graphics.moveTo(this.centerX, this.centerY);
      this.graphics.lineTo(this.centerX + cos * length, this.centerY + sin * length);
    }

    // Draw center point
    this.graphics.beginFill(0xffffff, 0.3);
    this.graphics.drawCircle(this.centerX, this.centerY, 5 + (audio.beat ? 10 : 0));
    this.graphics.endFill();

    // Draw objects with symmetry
    this.objects.forEach(obj => {
      // Calculate relative position from center
      const relX = obj.x - this.centerX;
      const relY = obj.y - this.centerY;

      // Draw with rotational symmetry
      if (this.rotationalSymmetry) {
        for (let i = 0; i < this.symmetryAxes; i++) {
          const angle = (i / this.symmetryAxes) * Math.PI * 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          // Rotate point around center
          const rotX = relX * cos - relY * sin;
          const rotY = relX * sin + relY * cos;

          this.drawShape(
            this.centerX + rotX,
            this.centerY + rotY,
            obj.size,
            obj.hue,
            obj.alpha,
            obj.shape
          );
        }
      } else {
        // Just draw the original
        this.drawShape(obj.x, obj.y, obj.size, obj.hue, obj.alpha, obj.shape);
      }

      // Horizontal mirror
      if (this.horizontalMirror) {
        this.drawShape(
          this.centerX - relX,
          this.centerY + relY,
          obj.size,
          obj.hue,
          obj.alpha * 0.7,
          obj.shape
        );

        // With rotational symmetry
        if (this.rotationalSymmetry) {
          for (let i = 0; i < this.symmetryAxes; i++) {
            const angle = (i / this.symmetryAxes) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const rotX = -relX * cos - relY * sin;
            const rotY = -relX * sin + relY * cos;

            this.drawShape(
              this.centerX + rotX,
              this.centerY + rotY,
              obj.size,
              obj.hue,
              obj.alpha * 0.7,
              obj.shape
            );
          }
        }
      }

      // Vertical mirror
      if (this.verticalMirror) {
        this.drawShape(
          this.centerX + relX,
          this.centerY - relY,
          obj.size,
          obj.hue,
          obj.alpha * 0.7,
          obj.shape
        );

        // With rotational symmetry
        if (this.rotationalSymmetry) {
          for (let i = 0; i < this.symmetryAxes; i++) {
            const angle = (i / this.symmetryAxes) * Math.PI * 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const rotX = relX * cos + relY * sin;
            const rotY = relX * sin - relY * cos;

            this.drawShape(
              this.centerX + rotX,
              this.centerY + rotY,
              obj.size,
              obj.hue,
              obj.alpha * 0.7,
              obj.shape
            );
          }
        }
      }
    });
  }

  private drawShape(
    x: number,
    y: number,
    size: number,
    hue: number,
    alpha: number,
    shape: number
  ): void {
    const color = hslToHex(hue, 70, 50);
    const glowColor = hslToHex(hue, 100, 70);

    // Draw glow
    this.graphics.beginFill(glowColor, alpha * 0.2);
    this.graphics.drawCircle(x, y, size * 1.5);
    this.graphics.endFill();

    // Draw main shape
    this.graphics.beginFill(color, alpha);
    switch (shape) {
      case 0: // Circle
        this.graphics.drawCircle(x, y, size);
        break;

      case 1: // Square
        this.graphics.drawRect(x - size, y - size, size * 2, size * 2);
        break;

      case 2: // Triangle
        this.graphics.drawPolygon([
          x, y - size,
          x + size, y + size,
          x - size, y + size,
        ]);
        break;

      case 3: // Star (manual drawing since drawStar doesn't exist in PixiJS v7)
        const points: number[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const radius = i % 2 === 0 ? size : size / 2;
          points.push(x + Math.cos(angle) * radius);
          points.push(y + Math.sin(angle) * radius);
        }
        this.graphics.drawPolygon(points);
        break;

      case 4: // Diamond
        this.graphics.drawPolygon([
          x, y - size,
          x + size, y,
          x, y + size,
          x - size, y,
        ]);
        break;
    }
    this.graphics.endFill();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

