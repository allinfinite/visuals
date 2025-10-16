import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface TunnelRing {
  z: number; // Depth (0 = far, 1 = near)
  rotation: number;
  sides: number;
  radius: number;
  offset: { x: number; y: number };
}

export class WireframeTunnel implements Pattern {
  public name = 'Wireframe Tunnel';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private rings: TunnelRing[] = [];
  private time: number = 0;
  private tunnelSpeed: number = 0.5;
  private cameraOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initializeTunnel();
  }

  private initializeTunnel(): void {
    const ringCount = 30;
    const sideOptions = [3, 4, 5, 6, 8, 12]; // Different polygon shapes

    for (let i = 0; i < ringCount; i++) {
      this.rings.push({
        z: i / ringCount,
        rotation: Math.random() * Math.PI * 2,
        sides: sideOptions[Math.floor(Math.random() * sideOptions.length)],
        radius: 100 + Math.random() * 50,
        offset: { x: 0, y: 0 },
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Camera follows cursor
    const { width, height } = this.context;
    const targetOffsetX = (input.x - width / 2) * 0.2;
    const targetOffsetY = (input.y - height / 2) * 0.2;
    
    this.cameraOffset.x += (targetOffsetX - this.cameraOffset.x) * 3 * dt;
    this.cameraOffset.y += (targetOffsetY - this.cameraOffset.y) * 3 * dt;

    // Tunnel speed varies with audio
    this.tunnelSpeed = 0.3 + audio.rms * 0.7 + (audio.beat ? 0.5 : 0);

    // Move rings forward and recycle
    this.rings.forEach((ring) => {
      ring.z += this.tunnelSpeed * dt;
      
      // Recycle ring when it passes camera
      if (ring.z > 1) {
        ring.z -= 1;
        
        // Randomize on reset
        const sideOptions = [3, 4, 5, 6, 8, 12];
        ring.sides = sideOptions[Math.floor(Math.random() * sideOptions.length)];
        ring.radius = 100 + Math.random() * 50;
        ring.rotation = Math.random() * Math.PI * 2;
      }

      // Rotation speed varies with audio
      ring.rotation += dt * (0.5 + audio.treble * 2) * (ring.z < 0.5 ? 1 : -1);

      // Tunnel curvature (offset)
      const curveAmount = Math.sin(ring.z * Math.PI * 4 + this.time) * 30 * (1 + audio.mid);
      ring.offset.x = Math.cos(ring.z * Math.PI * 2 + this.time * 0.5) * curveAmount;
      ring.offset.y = Math.sin(ring.z * Math.PI * 2 + this.time * 0.7) * curveAmount;

      // Radius pulses
      ring.radius *= 1 + (audio.beat ? 0.1 : -0.05 * dt);
      ring.radius = Math.max(50, Math.min(200, ring.radius));
    });

    // Sort rings by depth (far to near)
    this.rings.sort((a, b) => a.z - b.z);

    this.draw(audio);
  }

  private projectPoint(
    x: number,
    y: number,
    z: number
  ): { x: number; y: number; scale: number; alpha: number } {
    const { width, height } = this.context;
    const perspective = 500;
    
    // Z from 0 (far) to 1 (near), map to distance
    const depth = 3 + z * 5; // 3 to 8
    const projectionScale = perspective / (perspective + depth);
    
    return {
      x: width / 2 + x * projectionScale + this.cameraOffset.x * (1 - z),
      y: height / 2 + y * projectionScale + this.cameraOffset.y * (1 - z),
      scale: projectionScale,
      alpha: Math.min(1, z * 2), // Fade in as approaching
    };
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw rings from far to near
    this.rings.forEach((ring, idx) => {
      const hue = (idx / this.rings.length) * 360 + this.time * 50 + audio.centroid * 100;
      const color = hslToHex(hue % 360, 70, 50);
      const glowColor = hslToHex(hue % 360, 100, 70);

      // Draw polygon
      const vertices: { x: number; y: number; scale: number; alpha: number }[] = [];
      for (let i = 0; i <= ring.sides; i++) {
        const angle = (i / ring.sides) * Math.PI * 2 + ring.rotation;
        const x = Math.cos(angle) * ring.radius + ring.offset.x;
        const y = Math.sin(angle) * ring.radius + ring.offset.y;
        
        const projected = this.projectPoint(x, y, ring.z);
        vertices.push(projected);
      }

      // Calculate line thickness based on depth and audio
      const baseThickness = 1 + audio.rms * 3;
      const thickness = baseThickness * vertices[0].scale;
      const alpha = vertices[0].alpha;

      if (alpha > 0.05) {
        // Glow
        this.graphics.lineStyle(thickness * 2, glowColor, alpha * 0.3);
        vertices.forEach((v, i) => {
          if (i === 0) this.graphics.moveTo(v.x, v.y);
          else this.graphics.lineTo(v.x, v.y);
        });

        // Core line
        this.graphics.lineStyle(thickness, color, alpha * 0.8);
        vertices.forEach((v, i) => {
          if (i === 0) this.graphics.moveTo(v.x, v.y);
          else this.graphics.lineTo(v.x, v.y);
        });

        // Draw connections to next ring (if close enough)
        if (idx < this.rings.length - 1) {
          const nextRing = this.rings[idx + 1];
          if (nextRing.z - ring.z < 0.1) {
            // Draw some connecting lines
            const connectionCount = Math.min(ring.sides, nextRing.sides);
            for (let i = 0; i < connectionCount; i += 2) {
              const angle1 = (i / ring.sides) * Math.PI * 2 + ring.rotation;
              const x1 = Math.cos(angle1) * ring.radius + ring.offset.x;
              const y1 = Math.sin(angle1) * ring.radius + ring.offset.y;
              const p1 = this.projectPoint(x1, y1, ring.z);

              const angle2 = (i / nextRing.sides) * Math.PI * 2 + nextRing.rotation;
              const x2 = Math.cos(angle2) * nextRing.radius + nextRing.offset.x;
              const y2 = Math.sin(angle2) * nextRing.radius + nextRing.offset.y;
              const p2 = this.projectPoint(x2, y2, nextRing.z);

              this.graphics.lineStyle(thickness * 0.5, color, alpha * 0.4);
              this.graphics.moveTo(p1.x, p1.y);
              this.graphics.lineTo(p2.x, p2.y);
            }
          }
        }

        // Draw vertices
        if (ring.z > 0.7) {
          // Only draw vertices for nearby rings
          const vertexSize = 3 * vertices[0].scale + audio.bass * 3;
          vertices.forEach((v) => {
            this.graphics.beginFill(glowColor, alpha * 0.5);
            this.graphics.drawCircle(v.x, v.y, vertexSize * 1.5);
            this.graphics.endFill();
            
            this.graphics.beginFill(color, alpha);
            this.graphics.drawCircle(v.x, v.y, vertexSize);
            this.graphics.endFill();
          });
        }
      }
    });

    // Draw center crosshair
    const { width, height } = this.context;
    const centerX = width / 2 + this.cameraOffset.x * 0.5;
    const centerY = height / 2 + this.cameraOffset.y * 0.5;
    const crosshairSize = 10 + audio.rms * 10;

    this.graphics.lineStyle(2, 0xffffff, 0.5);
    this.graphics.moveTo(centerX - crosshairSize, centerY);
    this.graphics.lineTo(centerX + crosshairSize, centerY);
    this.graphics.moveTo(centerX, centerY - crosshairSize);
    this.graphics.lineTo(centerX, centerY + crosshairSize);

    this.graphics.beginFill(0xffffff, 0.3);
    this.graphics.drawCircle(centerX, centerY, 3);
    this.graphics.endFill();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

