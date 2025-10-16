import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { noise2D } from '../utils/noise';

interface Bloom {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  targetSize: number;
  life: number;
  maxLife: number;
  intensity: number;
  offsetX: number; // RGB offset
  offsetY: number;
}

export class ChromaticBloom implements Pattern {
  public name = 'Chromatic Bloom';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private blooms: Bloom[] = [];
  private time: number = 0;
  private spawnTimer: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Initialize with some blooms so pattern is immediately visible
    for (let i = 0; i < 8; i++) {
      this.spawnBloom();
    }
  }

  private spawnBloom(x?: number, y?: number, audio?: AudioData): void {
    const { width, height } = this.context;
    const spawnX = x ?? randomRange(width * 0.2, width * 0.8);
    const spawnY = y ?? randomRange(height * 0.2, height * 0.8);

    const intensity = audio ? audio.rms : 0.5;
    const offset = audio ? audio.centroid * 20 : 5;

    this.blooms.push({
      x: spawnX,
      y: spawnY,
      vx: randomRange(-30, 30),
      vy: randomRange(-30, 30),
      size: randomRange(5, 15),
      targetSize: randomRange(40, 100) * (1 + intensity),
      life: 0,
      maxLife: randomRange(2, 4),
      intensity,
      offsetX: randomRange(-offset, offset),
      offsetY: randomRange(-offset, offset),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.spawnTimer += dt;

    // Auto-spawn blooms based on audio
    const spawnInterval = 0.3 - audio.rms * 0.2;
    if (this.spawnTimer > spawnInterval && this.blooms.length < 50) {
      this.spawnBloom(undefined, undefined, audio);
      this.spawnTimer = 0;
    }

    // Beat spawns burst
    if (audio.beat && this.blooms.length < 80) {
      const { width, height } = this.context;
      const centerX = width / 2;
      const centerY = height / 2;
      for (let i = 0; i < 5; i++) {
        this.spawnBloom(
          centerX + randomRange(-100, 100),
          centerY + randomRange(-100, 100),
          audio
        );
      }
    }

    // Click spawns bloom
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        for (let i = 0; i < 3; i++) {
          this.spawnBloom(
            click.x + randomRange(-30, 30),
            click.y + randomRange(-30, 30),
            audio
          );
        }
      }
    });

    // Update blooms
    this.blooms.forEach((bloom) => {
      bloom.life += dt;

      // Grow to target size
      if (bloom.size < bloom.targetSize) {
        bloom.size += 40 * dt * (1 + audio.rms);
      }

      // Movement with noise
      const noiseScale = 0.002;
      const noiseSpeed = this.time * 0.5;
      const nx = noise2D(bloom.x * noiseScale, noiseSpeed);
      const ny = noise2D(bloom.y * noiseScale, noiseSpeed + 100);
      
      bloom.vx += nx * 50 * dt;
      bloom.vy += ny * 50 * dt;

      // Apply velocity
      bloom.x += bloom.vx * dt;
      bloom.y += bloom.vy * dt;

      // Friction
      bloom.vx *= 0.95;
      bloom.vy *= 0.95;

      // RGB offset shifts with audio
      bloom.offsetX += Math.sin(this.time * 2 + bloom.x * 0.01) * audio.centroid * 2;
      bloom.offsetY += Math.cos(this.time * 2 + bloom.y * 0.01) * audio.centroid * 2;
      bloom.offsetX = Math.max(-30, Math.min(30, bloom.offsetX));
      bloom.offsetY = Math.max(-30, Math.min(30, bloom.offsetY));

      // Wrap at edges
      const { width, height } = this.context;
      if (bloom.x < -50) bloom.x = width + 50;
      if (bloom.x > width + 50) bloom.x = -50;
      if (bloom.y < -50) bloom.y = height + 50;
      if (bloom.y > height + 50) bloom.y = -50;
    });

    // Remove dead blooms
    this.blooms = this.blooms.filter((bloom) => bloom.life < bloom.maxLife);

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    this.blooms.forEach((bloom) => {
      const progress = bloom.life / bloom.maxLife;
      // Increased base alpha for visibility (0.6 → 0.9)
      const alpha = Math.sin(progress * Math.PI) * 0.9 * (0.5 + bloom.intensity * 0.5);

      const size = bloom.size * (1 + Math.sin(this.time * 3 + bloom.x * 0.1) * 0.2);
      const beatBoost = audio.beat ? 1.3 : 1;

      // Chromatic aberration: draw RGB channels with offset
      const baseX = bloom.x;
      const baseY = bloom.y;

      // Increased RGB offset for more visible effect
      const offsetMultiplier = 1.2;

      // Red channel (offset left/up) - increased alpha (0.8 → 1.0)
      const redX = baseX - bloom.offsetX * offsetMultiplier;
      const redY = baseY - bloom.offsetY * offsetMultiplier;
      this.graphics.beginFill(0xff0000, Math.min(1, alpha * 1.0));
      this.graphics.drawCircle(redX, redY, size * beatBoost);
      this.graphics.endFill();

      // Green channel (center) - increased alpha
      this.graphics.beginFill(0x00ff00, Math.min(1, alpha * 1.0));
      this.graphics.drawCircle(baseX, baseY, size * beatBoost);
      this.graphics.endFill();

      // Blue channel (offset right/down) - increased alpha
      const blueX = baseX + bloom.offsetX * offsetMultiplier;
      const blueY = baseY + bloom.offsetY * offsetMultiplier;
      this.graphics.beginFill(0x0000ff, Math.min(1, alpha * 1.0));
      this.graphics.drawCircle(blueX, blueY, size * beatBoost);
      this.graphics.endFill();

      // Core white bloom (brighter)
      this.graphics.beginFill(0xffffff, Math.min(1, alpha * 0.5));
      this.graphics.drawCircle(baseX, baseY, size * 0.6 * beatBoost);
      this.graphics.endFill();
    });

    // Draw debug info
    const { width } = this.context;
    this.graphics.lineStyle(0);
    this.graphics.beginFill(0xffffff, 0.6);
    // Small indicator text would go here (simplified without text rendering)
    const indicatorSize = 4 + audio.centroid * 8;
    this.graphics.drawCircle(width - 30, 30, indicatorSize);
    this.graphics.endFill();

    // RGB split indicator
    this.graphics.beginFill(0xff0000, 0.5);
    this.graphics.drawCircle(width - 45, 30, 6);
    this.graphics.endFill();
    this.graphics.beginFill(0x00ff00, 0.5);
    this.graphics.drawCircle(width - 30, 30, 6);
    this.graphics.endFill();
    this.graphics.beginFill(0x0000ff, 0.5);
    this.graphics.drawCircle(width - 15, 30, 6);
    this.graphics.endFill();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

