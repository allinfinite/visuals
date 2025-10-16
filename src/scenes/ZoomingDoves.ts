import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Dove {
  x: number;
  y: number;
  z: number; // Depth (0 = far, 1000 = close)
  vz: number; // Z velocity
  wingPhase: number;
  wingSpeed: number;
  xOffset: number;
  yOffset: number;
  rotation: number;
}

export class ZoomingDoves implements Pattern {
  public name = 'Zooming Doves';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private doves: Dove[] = [];
  private time: number = 0;
  private vanishingPointX: number;
  private vanishingPointY: number;

  constructor(context: RendererContext) {
    this.context = context;
    this.vanishingPointX = context.width / 2;
    this.vanishingPointY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize doves
    for (let i = 0; i < 30; i++) {
      this.spawnDove();
    }
  }

  private spawnDove(): void {
    this.doves.push({
      x: 0,
      y: 0,
      z: randomRange(0, 100),
      vz: randomRange(150, 400),
      wingPhase: randomRange(0, Math.PI * 2),
      wingSpeed: randomRange(10, 18),
      xOffset: randomRange(-300, 300),
      yOffset: randomRange(-300, 300),
      rotation: randomRange(-0.3, 0.3),
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Move vanishing point to mouse when dragging
    if (input.isDragging || input.isDown) {
      this.vanishingPointX += (input.x - this.vanishingPointX) * 0.1;
      this.vanishingPointY += (input.y - this.vanishingPointY) * 0.1;
    } else {
      // Return to center
      this.vanishingPointX += (this.context.width / 2 - this.vanishingPointX) * 0.02;
      this.vanishingPointY += (this.context.height / 2 - this.vanishingPointY) * 0.02;
    }

    // Update doves
    this.doves.forEach((dove) => {
      // Move towards camera (increase z)
      const speedMultiplier = 1 + audio.rms * 2 + (audio.beat ? 1 : 0);
      dove.z += dove.vz * dt * speedMultiplier;

      // Wing flapping (faster as they approach)
      const depthFactor = dove.z / 1000;
      dove.wingPhase += dove.wingSpeed * dt * (1 + depthFactor * 2);

      // Respawn when passing camera
      if (dove.z > 1000) {
        dove.z = randomRange(0, 50);
        dove.xOffset = randomRange(-300, 300);
        dove.yOffset = randomRange(-300, 300);
        dove.rotation = randomRange(-0.3, 0.3);
        dove.vz = randomRange(150, 400);
      }
    });

    // Spawn more doves on beat
    if (audio.beat && this.doves.length < 60) {
      for (let i = 0; i < 3; i++) {
        this.spawnDove();
      }
    }

    // Remove excess doves when calm
    if (this.doves.length > 40 && audio.rms < 0.3) {
      this.doves = this.doves.filter(d => d.z < 900);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Sort doves by z (draw far ones first)
    const sortedDoves = [...this.doves].sort((a, b) => a.z - b.z);

    sortedDoves.forEach((dove) => {
      // Perspective projection
      const perspective = dove.z / 1000;
      const scale = perspective * 2; // Size increases as it gets closer
      
      // Project 3D position to 2D screen
      const screenX = this.vanishingPointX + dove.xOffset * perspective;
      const screenY = this.vanishingPointY + dove.yOffset * perspective;

      // Skip if off screen
      const margin = 200;
      if (
        screenX < -margin ||
        screenX > this.context.width + margin ||
        screenY < -margin ||
        screenY > this.context.height + margin
      ) {
        return;
      }

      // Calculate dove size based on depth
      const baseSize = 15 + scale * 40;
      const size = baseSize * (1 + audio.bass * 0.3);

      // Wing animation
      const wingOpen = Math.abs(Math.sin(dove.wingPhase)) * 0.8 + 0.2;

      // Alpha based on distance (fade in as approaching)
      const alpha = Math.min(1, 0.3 + perspective * 0.7);

      // Draw dove
      this.drawDove(screenX, screenY, size, wingOpen, alpha, audio);

      // Motion blur trail for close doves
      if (perspective > 0.5) {
        const trailSteps = 5;

        for (let i = 1; i <= trailSteps; i++) {
          const trailZ = dove.z - i * 50;
          if (trailZ < 0) continue;

          const trailPerspective = trailZ / 1000;
          const trailX = this.vanishingPointX + dove.xOffset * trailPerspective;
          const trailY = this.vanishingPointY + dove.yOffset * trailPerspective;
          const trailSize = (15 + trailPerspective * 2 * 40) * 0.8;
          const trailAlpha = alpha * (1 - i / trailSteps) * 0.3;

          this.graphics.beginFill(0xffffff, trailAlpha);
          this.graphics.drawCircle(trailX, trailY, trailSize * 0.5);
          this.graphics.endFill();
        }
      }
    });

    // Draw vanishing point indicator
    const pulseSize = 5 + Math.sin(this.time * 3) * 2;
    this.graphics.beginFill(0xffffff, 0.1 + audio.rms * 0.2);
    this.graphics.drawCircle(this.vanishingPointX, this.vanishingPointY, pulseSize);
    this.graphics.endFill();
  }

  private drawDove(x: number, y: number, size: number, wingOpen: number, alpha: number, audio: AudioData): void {
    // Body (white with slight gradient)
    this.graphics.beginFill(0xffffff, alpha * 0.9);
    this.graphics.drawEllipse(x, y, size * 0.6, size * 0.4);
    this.graphics.endFill();

    // Head
    this.graphics.beginFill(0xffffff, alpha * 0.95);
    this.graphics.drawCircle(x + size * 0.5, y - size * 0.1, size * 0.35);
    this.graphics.endFill();

    // Beak
    this.graphics.beginFill(0xffa500, alpha * 0.8);
    this.graphics.moveTo(x + size * 0.7, y - size * 0.1);
    this.graphics.lineTo(x + size * 0.9, y - size * 0.15);
    this.graphics.lineTo(x + size * 0.9, y - size * 0.05);
    this.graphics.endFill();

    // Eye
    this.graphics.beginFill(0x000000, alpha * 0.9);
    this.graphics.drawCircle(x + size * 0.6, y - size * 0.15, size * 0.08);
    this.graphics.endFill();

    // Wings
    const wingSpan = size * 1.5 * wingOpen;
    
    // Left wing
    this.graphics.beginFill(0xf5f5f5, alpha * 0.85);
    this.graphics.drawEllipse(
      x - size * 0.3,
      y,
      wingSpan * 0.8,
      size * 0.5
    );
    this.graphics.endFill();

    // Right wing
    this.graphics.beginFill(0xf5f5f5, alpha * 0.85);
    this.graphics.drawEllipse(
      x - size * 0.3,
      y,
      wingSpan * 0.8,
      size * 0.5
    );
    this.graphics.endFill();

    // Wing feathers (detail)
    if (size > 20) {
      this.graphics.lineStyle(1, 0xdddddd, alpha * 0.6);
      for (let i = 0; i < 3; i++) {
        this.graphics.moveTo(x - size * 0.3, y);
        this.graphics.lineTo(
          x - size * 0.3 - wingSpan * 0.6,
          y + (i - 1) * size * 0.2
        );
      }
    }

    // Tail
    this.graphics.beginFill(0xf0f0f0, alpha * 0.8);
    this.graphics.moveTo(x - size * 0.6, y);
    this.graphics.lineTo(x - size * 1.2, y - size * 0.2);
    this.graphics.lineTo(x - size * 1.2, y + size * 0.2);
    this.graphics.endFill();

    // Glow for close doves
    if (size > 40) {
      this.graphics.beginFill(0xffffff, alpha * 0.2 * audio.rms);
      this.graphics.drawEllipse(x, y, size * 1.5, size * 1.2);
      this.graphics.endFill();
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

