import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

type MandalaMode = 'lotus' | 'star' | 'geometric' | 'spiral' | 'flower' | 'kaleidoscope';

export class Mandala implements Pattern {
  public name = 'Mandala';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private seed: number = 0;
  private currentMode: MandalaMode = 'lotus';
  private targetMode: MandalaMode = 'lotus';
  private morphProgress: number = 1; // 0 = currentMode, 1 = targetMode
  private modeTimer: number = 0;
  private modeDuration: number = 8; // Switch modes every 8 seconds

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.modeTimer += dt;

    // Auto-morph to new mode
    if (this.modeTimer > this.modeDuration) {
      this.switchToNextMode();
      this.modeTimer = 0;
    }

    // Smooth morph transition (2 seconds)
    if (this.morphProgress < 1) {
      this.morphProgress = Math.min(1, this.morphProgress + dt * 0.5);
      if (this.morphProgress >= 1) {
        this.currentMode = this.targetMode;
      }
    }

    // Click switches to random mode immediately
    if (input.clicks.length > 0) {
      const latest = input.clicks[input.clicks.length - 1];
      const age = (performance.now() - latest.time) / 1000;
      if (age < 0.05) {
        this.seed = Math.random();
        this.switchToNextMode();
        this.modeTimer = 0;
      }
    }

    this.draw(audio);
  }

  private switchToNextMode(): void {
    const modes: MandalaMode[] = ['lotus', 'star', 'geometric', 'spiral', 'flower', 'kaleidoscope'];
    let nextMode: MandalaMode;
    do {
      nextMode = modes[Math.floor(Math.random() * modes.length)];
    } while (nextMode === this.targetMode);
    
    this.currentMode = this.targetMode;
    this.targetMode = nextMode;
    this.morphProgress = 0;
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;

    // Draw morphing between current and target modes
    if (this.morphProgress < 1) {
      // During morph, draw both modes with interpolated alpha
      this.graphics.alpha = 1 - this.morphProgress;
      this.drawMode(this.currentMode, centerX, centerY, audio);
      
      this.graphics.alpha = this.morphProgress;
      this.drawMode(this.targetMode, centerX, centerY, audio);
      
      this.graphics.alpha = 1;
    } else {
      // Only draw target mode when morph complete
      this.drawMode(this.targetMode, centerX, centerY, audio);
    }

    // Always draw center ornament
    this.drawCenterOrnament(centerX, centerY, audio);
  }

  private drawMode(mode: MandalaMode, cx: number, cy: number, audio: AudioData): void {
    switch (mode) {
      case 'lotus':
        this.drawLotusMode(cx, cy, audio);
        break;
      case 'star':
        this.drawStarMode(cx, cy, audio);
        break;
      case 'geometric':
        this.drawGeometricMode(cx, cy, audio);
        break;
      case 'spiral':
        this.drawSpiralMode(cx, cy, audio);
        break;
      case 'flower':
        this.drawFlowerMode(cx, cy, audio);
        break;
      case 'kaleidoscope':
        this.drawKaleidoscopeMode(cx, cy, audio);
        break;
    }
  }

  private drawLotusMode(cx: number, cy: number, audio: AudioData): void {
    const layers = 8;
    const petalsPerLayer = 12;

    for (let layer = 0; layer < layers; layer++) {
      const radius = 60 + layer * 50 * (1 + audio.bass * 0.2);
      const petalSize = 40 + layer * 8;
      const hue = (layer * 45 + this.time * 20 + this.seed * 360) % 360;
      const rotation = this.time * 0.3 + layer * 0.2;

      for (let i = 0; i < petalsPerLayer; i++) {
        const angle = (i / petalsPerLayer) * Math.PI * 2 + rotation;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        // Draw lotus petal (teardrop shape)
        this.drawPetal(x, y, angle, petalSize, hue, 0.6 + audio.mid * 0.3);
      }
    }
  }

  private drawStarMode(cx: number, cy: number, audio: AudioData): void {
    const layers = 6;
    const points = 8;

    for (let layer = 0; layer < layers; layer++) {
      const innerRadius = 50 + layer * 60;
      const outerRadius = innerRadius * 1.8;
      const hue = (layer * 60 + this.time * 30 + this.seed * 360) % 360;
      const rotation = this.time * 0.4 + layer * 0.3;
      const pulse = 1 + Math.sin(this.time * 3 + layer) * 0.1 + audio.bass * 0.3;

      this.graphics.lineStyle(3 + (audio.beat ? 2 : 0), this.hslToHex(hue, 85, 65), 0.7);
      this.graphics.beginFill(this.hslToHex(hue, 80, 50), 0.2 + audio.rms * 0.2);

      // Draw star polygon
      for (let i = 0; i <= points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2 + rotation;
        const r = (i % 2 === 0 ? outerRadius : innerRadius) * pulse;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        
        if (i === 0) {
          this.graphics.moveTo(x, y);
        } else {
          this.graphics.lineTo(x, y);
        }
      }
      this.graphics.closePath();
      this.graphics.endFill();
    }
  }

  private drawGeometricMode(cx: number, cy: number, audio: AudioData): void {
    const layers = 7;
    const shapes = [3, 4, 5, 6, 8, 12, 16]; // Triangle, square, pentagon, hexagon, etc.

    for (let layer = 0; layer < layers; layer++) {
      const radius = 40 + layer * 55 * (1 + audio.bass * 0.2);
      const sides = shapes[layer];
      const hue = (layer * 50 + this.time * 25 + this.seed * 360) % 360;
      const rotation = this.time * 0.5 - layer * 0.15;
      
      this.graphics.lineStyle(2 + layer * 0.3, this.hslToHex(hue, 90, 60), 0.8);
      this.graphics.beginFill(this.hslToHex(hue, 85, 55), 0.15 + audio.treble * 0.15);

      // Draw polygon
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + rotation;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        
        if (i === 0) {
          this.graphics.moveTo(x, y);
        } else {
          this.graphics.lineTo(x, y);
        }
      }
      this.graphics.endFill();
    }
  }

  private drawSpiralMode(cx: number, cy: number, audio: AudioData): void {
    const spirals = 6;
    const pointsPerSpiral = 80;

    for (let s = 0; s < spirals; s++) {
      const hue = (s * 60 + this.time * 40 + this.seed * 360) % 360;
      const offset = (s / spirals) * Math.PI * 2;

      this.graphics.lineStyle(2 + audio.bass * 2, this.hslToHex(hue, 85, 65), 0.7);

      for (let i = 0; i < pointsPerSpiral; i++) {
        const t = i / pointsPerSpiral;
        const angle = t * Math.PI * 6 + this.time * 0.5 + offset;
        const radius = t * 250 * (1 + audio.rms * 0.3);
        const wave = Math.sin(i * 0.3 + this.time * 2) * 15 * audio.treble;
        
        const x = cx + Math.cos(angle) * (radius + wave);
        const y = cy + Math.sin(angle) * (radius + wave);

        if (i === 0) {
          this.graphics.moveTo(x, y);
        } else {
          this.graphics.lineTo(x, y);
        }

        // Draw dots along spiral
        if (i % 5 === 0) {
          this.graphics.beginFill(this.hslToHex(hue, 90, 70), 0.6);
          this.graphics.drawCircle(x, y, 3 + (audio.beat ? 2 : 0));
          this.graphics.endFill();
        }
      }
    }
  }

  private drawFlowerMode(cx: number, cy: number, audio: AudioData): void {
    const layers = 5;
    const petalsPerLayer = [8, 12, 16, 24, 32];

    for (let layer = 0; layer < layers; layer++) {
      const radius = 80 + layer * 45;
      const petals = petalsPerLayer[layer];
      const hue = (layer * 70 + this.time * 25 + this.seed * 360) % 360;
      const rotation = this.time * 0.3 - layer * 0.2;

      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2 + rotation;
        const petalLength = 35 + layer * 5;
        const petalWidth = 20 + layer * 3;
        
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        // Draw almond-shaped petal
        this.drawAlmondPetal(x, y, angle, petalLength, petalWidth, hue, 0.6 + audio.mid * 0.3);
      }
    }
  }

  private drawKaleidoscopeMode(cx: number, cy: number, audio: AudioData): void {
    const symmetry = 16;
    const layers = 12;

    for (let layer = 0; layer < layers; layer++) {
      const radius = 30 + layer * 30;
      const hue = (layer * 30 + this.time * 50 + this.seed * 360) % 360;
      
      for (let i = 0; i < symmetry; i++) {
        const angle = (i / symmetry) * Math.PI * 2 + this.time + layer * 0.1;
        const wave = Math.sin(this.time * 2 + i + layer) * 10 * audio.bass;
        const r = radius + wave;
        
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        // Draw complex shapes
        const size = 8 + layer * 1.5;
        const innerHue = (hue + 180) % 360;
        
        // Outer shape
        this.graphics.beginFill(this.hslToHex(hue, 90, 55), 0.5);
        this.graphics.drawCircle(x, y, size);
        this.graphics.endFill();
        
        // Inner contrast
        this.graphics.beginFill(this.hslToHex(innerHue, 85, 70), 0.7);
        this.graphics.drawCircle(x, y, size * 0.5);
        this.graphics.endFill();

        // Connecting lines
        if (layer > 0 && i % 2 === 0) {
          const prevAngle = angle - Math.PI / symmetry;
          const px = cx + Math.cos(prevAngle) * r;
          const py = cy + Math.sin(prevAngle) * r;
          
          this.graphics.lineStyle(1, this.hslToHex(hue, 80, 60), 0.4);
          this.graphics.moveTo(x, y);
          this.graphics.lineTo(px, py);
        }
      }
    }
  }

  private drawPetal(x: number, y: number, angle: number, size: number, hue: number, alpha: number): void {
    const points = 20;
    const width = size * 0.6;
    
    this.graphics.beginFill(this.hslToHex(hue, 85, 60), alpha);
    this.graphics.lineStyle(1, this.hslToHex(hue, 90, 40), alpha * 0.8);

    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const dist = Math.sin(t * Math.PI) * size;
      const perpDist = Math.sin(t * Math.PI) * width * (1 - t * 0.5);
      
      const side = i < points / 2 ? 1 : -1;
      const px = x + Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * perpDist * side;
      const py = y + Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * perpDist * side;
      
      if (i === 0) {
        this.graphics.moveTo(px, py);
      } else {
        this.graphics.lineTo(px, py);
      }
    }
    
    this.graphics.closePath();
    this.graphics.endFill();
  }

  private drawAlmondPetal(x: number, y: number, angle: number, length: number, width: number, hue: number, alpha: number): void {
    this.graphics.beginFill(this.hslToHex(hue, 88, 62), alpha);
    this.graphics.lineStyle(1.5, this.hslToHex(hue, 95, 45), alpha * 0.9);

    const points = 16;
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const dist = Math.sin(t * Math.PI) * length;
      const perpDist = Math.sin(t * Math.PI) * width;
      
      const side = i <= points / 2 ? 1 : -1;
      const px = x + Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * perpDist * side;
      const py = y + Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * perpDist * side;
      
      if (i === 0) {
        this.graphics.moveTo(px, py);
      } else {
        this.graphics.lineTo(px, py);
      }
    }
    
    this.graphics.closePath();
    this.graphics.endFill();
  }

  private drawCenterOrnament(cx: number, cy: number, audio: AudioData): void {
    const rings = 3;
    const pulse = 1 + audio.rms * 0.3;
    
    for (let i = 0; i < rings; i++) {
      const radius = (15 + i * 8) * pulse;
      const hue = (this.time * 60 + i * 120) % 360;
      
      this.graphics.lineStyle(2, this.hslToHex(hue, 90, 70), 0.8);
      this.graphics.drawCircle(cx, cy, radius);
    }
    
    // Central dot
    this.graphics.beginFill(0xffffff, 0.9);
    this.graphics.drawCircle(cx, cy, 8 * pulse);
    this.graphics.endFill();
    
    // Mode indicator text (simplified as dots)
    const modes: MandalaMode[] = ['lotus', 'star', 'geometric', 'spiral', 'flower', 'kaleidoscope'];
    const currentIndex = modes.indexOf(this.targetMode);
    
    for (let i = 0; i < modes.length; i++) {
      const angle = (i / modes.length) * Math.PI * 2 - Math.PI / 2;
      const indicatorRadius = 50;
      const ix = cx + Math.cos(angle) * indicatorRadius;
      const iy = cy + Math.sin(angle) * indicatorRadius;
      
      const isActive = i === currentIndex;
      this.graphics.beginFill(0xffffff, isActive ? 0.8 : 0.2);
      this.graphics.drawCircle(ix, iy, isActive ? 4 : 2);
      this.graphics.endFill();
    }
  }

  private hslToHex(h: number, s: number, l: number): number {
    // Clamp inputs to valid ranges
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

