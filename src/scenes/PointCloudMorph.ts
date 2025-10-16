import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface Point {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
}

export class PointCloudMorph implements Pattern {
  public name = 'Point Cloud Morph';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private points: Point[] = [];
  private time: number = 0;
  private currentFormation: number = 0;
  private transitionProgress: number = 0;
  private morphSpeed: number = 1;

  private readonly pointCount = 500;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initializePoints();
    this.setFormation(this.currentFormation);
  }

  private initializePoints(): void {
    const { width, height } = this.context;
    for (let i = 0; i < this.pointCount; i++) {
      this.points.push({
        x: width / 2,
        y: height / 2,
        targetX: width / 2,
        targetY: height / 2,
        vx: 0,
        vy: 0,
        size: 2 + Math.random() * 2,
        hue: Math.random() * 360,
        alpha: 0.8,
      });
    }
  }

  private setFormation(formationIndex: number): void {
    const formations = [
      this.sphereFormation,
      this.cubeFormation,
      this.torusFormation,
      this.spiralFormation,
      this.waveFormation,
      this.dnaHelixFormation,
      this.latticeFormation,
      this.galaxyFormation,
    ];

    const formation = formations[formationIndex % formations.length];
    formation.call(this);
  }

  private sphereFormation(): void {
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;

    this.points.forEach((point, i) => {
      const phi = Math.acos(2 * (i / this.pointCount) - 1);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      // 3D sphere projection
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      
      // Simple orthographic projection
      point.targetX = centerX + x * radius;
      point.targetY = centerY + y * radius * 0.7 + z * radius * 0.3;
    });
  }

  private cubeFormation(): void {
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.3;
    const pointsPerEdge = Math.ceil(Math.pow(this.pointCount / 12, 1 / 2));

    let idx = 0;
    // 12 edges of a cube
    for (let edge = 0; edge < 12 && idx < this.pointCount; edge++) {
      for (let i = 0; i < pointsPerEdge && idx < this.pointCount; i++) {
        const t = i / pointsPerEdge;
        let x = 0, y = 0, z = 0;

        // Define 12 edges
        if (edge < 4) {
          // Bottom square
          const corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]];
          const c1 = corners[edge];
          const c2 = corners[(edge + 1) % 4];
          x = c1[0] + (c2[0] - c1[0]) * t;
          y = c1[1] + (c2[1] - c1[1]) * t;
          z = c1[2] + (c2[2] - c1[2]) * t;
        } else if (edge < 8) {
          // Top square
          const corners = [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
          const c1 = corners[edge - 4];
          const c2 = corners[(edge - 3) % 4];
          x = c1[0] + (c2[0] - c1[0]) * t;
          y = c1[1] + (c2[1] - c1[1]) * t;
          z = c1[2] + (c2[2] - c1[2]) * t;
        } else {
          // Vertical edges
          const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
          const corner = corners[edge - 8];
          x = corner[0];
          y = corner[1];
          z = -1 + 2 * t;
        }

        this.points[idx].targetX = centerX + x * size;
        this.points[idx].targetY = centerY + y * size * 0.7 + z * size * 0.3;
        idx++;
      }
    }
  }

  private torusFormation(): void {
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const majorRadius = Math.min(width, height) * 0.25;
    const minorRadius = majorRadius * 0.4;

    this.points.forEach((point, i) => {
      const u = (i / this.pointCount) * Math.PI * 2;
      const v = ((i * 17) % this.pointCount / this.pointCount) * Math.PI * 2;
      
      const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
      const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
      const z = minorRadius * Math.sin(v);
      
      point.targetX = centerX + x;
      point.targetY = centerY + y * 0.7 + z * 0.3;
    });
  }

  private spiralFormation(): void {
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.35;

    this.points.forEach((point, i) => {
      const t = i / this.pointCount;
      const angle = t * Math.PI * 8;
      const radius = t * maxRadius;
      const z = (t - 0.5) * 200;
      
      point.targetX = centerX + Math.cos(angle) * radius;
      point.targetY = centerY + Math.sin(angle) * radius + z * 0.3;
    });
  }

  private waveFormation(): void {
    const { width, height } = this.context;
    const gridSize = Math.ceil(Math.sqrt(this.pointCount));
    const spacing = Math.min(width, height) * 0.7 / gridSize;
    const offsetX = (width - spacing * gridSize) / 2;
    const offsetY = (height - spacing * gridSize) / 2;

    this.points.forEach((point, i) => {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      const x = col * spacing + offsetX;
      const y = row * spacing + offsetY;
      const z = Math.sin(col * 0.5) * Math.cos(row * 0.5) * 50;
      
      point.targetX = x;
      point.targetY = y + z;
    });
  }

  private dnaHelixFormation(): void {
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.15;
    const length = Math.min(width, height) * 0.6;

    this.points.forEach((point, i) => {
      const t = i / this.pointCount;
      const helix = Math.floor((i / this.pointCount) * 2) % 2;
      const angle = t * Math.PI * 6 + helix * Math.PI;
      const y = (t - 0.5) * length;
      
      point.targetX = centerX + Math.cos(angle) * radius;
      point.targetY = centerY + y;
    });
  }

  private latticeFormation(): void {
    const { width, height } = this.context;
    const gridSize = Math.ceil(Math.pow(this.pointCount, 1 / 3));
    const spacing = Math.min(width, height) * 0.5 / gridSize;
    const offsetX = (width - spacing * gridSize) / 2;
    const offsetY = (height - spacing * gridSize) / 2;

    this.points.forEach((point, i) => {
      const layer = Math.floor(i / (gridSize * gridSize));
      const remaining = i % (gridSize * gridSize);
      const row = Math.floor(remaining / gridSize);
      const col = remaining % gridSize;
      
      const x = col * spacing + offsetX;
      const y = row * spacing + offsetY;
      const z = layer * spacing * 0.5;
      
      point.targetX = x;
      point.targetY = y + z;
    });
  }

  private galaxyFormation(): void {
    const { width, height } = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.35;

    this.points.forEach((point, i) => {
      const t = i / this.pointCount;
      const arm = Math.floor(t * 3);
      const armT = (t * 3) % 1;
      
      const angle = armT * Math.PI * 4 + arm * (Math.PI * 2 / 3);
      const radius = armT * maxRadius;
      const spread = (Math.random() - 0.5) * radius * 0.2;
      
      point.targetX = centerX + (Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * spread);
      point.targetY = centerY + (Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * spread);
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.transitionProgress += dt;

    // Click changes formation
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.currentFormation = (this.currentFormation + 1) % 8;
        this.setFormation(this.currentFormation);
        this.transitionProgress = 0;
      }
    });

    // Auto-morph every 10 seconds based on audio
    const morphInterval = 10 - audio.rms * 5;
    if (this.transitionProgress > morphInterval) {
      this.currentFormation = (this.currentFormation + 1) % 8;
      this.setFormation(this.currentFormation);
      this.transitionProgress = 0;
    }

    // Beat accelerates morph
    if (audio.beat) {
      this.morphSpeed = 5;
    } else {
      this.morphSpeed = Math.max(1, this.morphSpeed * 0.95);
    }

    // Update points
    this.points.forEach((point, i) => {
      // Move towards target
      const dx = point.targetX - point.x;
      const dy = point.targetY - point.y;
      const speed = 3 * this.morphSpeed * (1 + audio.rms);
      
      point.vx += dx * speed * dt;
      point.vy += dy * speed * dt;
      
      // Apply velocity
      point.x += point.vx * dt;
      point.y += point.vy * dt;
      
      // Friction
      point.vx *= 0.9;
      point.vy *= 0.9;
      
      // Hue based on position and spectrum
      const bandIndex = Math.floor((i / this.pointCount) * audio.spectrum.length);
      const spectrumValue = audio.spectrum[bandIndex];
      point.hue = (i / this.pointCount) * 360 + spectrumValue * 180 + this.time * 20;
      
      // Size pulses with spectrum
      point.size = 2 + spectrumValue * 4 + (audio.beat ? 2 : 0);
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // this.graphics.clear(); // Commented for feedback trails

    this.points.forEach((point) => {
      const color = hslToHex(point.hue % 360, 70, 50);
      const glowColor = hslToHex(point.hue % 360, 100, 70);
      
      // Glow
      this.graphics.beginFill(glowColor, point.alpha * 0.4 * (1 + audio.rms * 0.5));
      this.graphics.drawCircle(point.x, point.y, point.size * 1.5);
      this.graphics.endFill();
      
      // Core
      this.graphics.beginFill(color, point.alpha);
      this.graphics.drawCircle(point.x, point.y, point.size);
      this.graphics.endFill();
    });

    // Draw connections for nearby points (sample for performance)
    const connectionDistance = 50 + audio.bass * 50;
    const sampleRate = 10;
    
    for (let i = 0; i < this.points.length; i += sampleRate) {
      const p1 = this.points[i];
      
      for (let j = i + sampleRate; j < this.points.length && j < i + 50; j += sampleRate) {
        const p2 = this.points[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < connectionDistance) {
          const alpha = (1 - dist / connectionDistance) * 0.2 * (1 + audio.treble);
          const hue = ((p1.hue + p2.hue) / 2) % 360;
          const color = hslToHex(hue, 70, 50);
          
          this.graphics.lineStyle(1, color, alpha);
          this.graphics.moveTo(p1.x, p1.y);
          this.graphics.lineTo(p2.x, p2.y);
        }
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

