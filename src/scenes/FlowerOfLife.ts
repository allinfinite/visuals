import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface Circle {
  x: number;
  y: number;
  ring: number;
  index: number;
  birthTime: number;
  targetRadius: number;
}

export class FlowerOfLife implements Pattern {
  public name = 'Flower of Life';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private circles: Circle[] = [];
  private growthPhase: number = 0;
  private maxRings: number = 4; // Increased from 3 for fuller pattern
  private cycleTime: number = 15; // Time for one full growth cycle
  private colorOffset: number = 0; // Color offset changed by clicks
  private zoomScale: number = 1; // Scale that increases as pattern expands

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initializeCircles();
  }

  private initializeCircles(): void {
    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;
    const baseRadius = 70;

    // Generate all circle positions
    for (let ring = 0; ring <= this.maxRings; ring++) {
      const circleCount = ring === 0 ? 1 : ring * 6;
      
      for (let i = 0; i < circleCount; i++) {
        let x = centerX;
        let y = centerY;

        if (ring > 0) {
          const angle = (i / circleCount) * Math.PI * 2;
          const distance = ring * baseRadius;
          x = centerX + Math.cos(angle) * distance;
          y = centerY + Math.sin(angle) * distance;
        }

        // Stagger birth times based on ring
        const birthTime = ring * 2 + (i / circleCount) * 0.5;

        this.circles.push({
          x,
          y,
          ring,
          index: i,
          birthTime,
          targetRadius: baseRadius,
        });
      }
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Update growth phase (cycles from 0 to cycleTime, then resets)
    this.growthPhase += dt * (1 + audio.rms * 0.5); // Audio speeds up growth
    if (this.growthPhase > this.cycleTime) {
      this.growthPhase = 0;
      this.zoomScale = 1; // Reset zoom when pattern resets
    }
    
    // Click changes color palette
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05) {
        this.colorOffset = (this.colorOffset + 120) % 360; // Shift hue by 120 degrees
      }
    });
    
    // Zoom increases as pattern expands (from 1.0 to 2.0)
    const expansionProgress = this.growthPhase / this.cycleTime;
    const targetZoom = 1 + expansionProgress * 1.0; // Scale from 1.0x to 2.0x
    this.zoomScale += (targetZoom - this.zoomScale) * 3 * dt; // Smooth zoom
    
    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    const baseRadius = 70 + audio.bass * 30;
    
    // Gradually shifting hue over time
    const globalHueShift = (this.time * 10) % 360; // Slow color rotation
    
    // Get center for zoom calculation
    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;

    this.circles.forEach((circle) => {
      // Calculate circle age relative to growth phase
      const age = this.growthPhase - circle.birthTime;
      
      // Skip if not yet born
      if (age < 0) return;
      
      // Expansion animation (0 to 1 over 1.5 seconds)
      const expansionDuration = 1.5;
      const expansionProgress = Math.min(1, age / expansionDuration);
      const easedProgress = this.easeOutElastic(expansionProgress);
      
      // Radius grows from 0 to target with elastic ease, scaled by zoom
      const radius = baseRadius * easedProgress * this.zoomScale;
      if (radius < 1) return; // Don't draw tiny circles
      
      // Apply zoom to circle position (zoom from center)
      const dx = circle.x - centerX;
      const dy = circle.y - centerY;
      const zoomedX = centerX + dx * this.zoomScale;
      const zoomedY = centerY + dy * this.zoomScale;
      
      // Fade in alpha (0 to 1 over 0.5 seconds)
      const fadeDuration = 0.5;
      const fadeProgress = Math.min(1, age / fadeDuration);
      const alpha = fadeProgress * (0.7 + audio.treble * 0.3);
      
      // Vibration effect (subtle breathing)
      const vibration = Math.sin(this.time * 3 + circle.ring * 0.5 + circle.index) * audio.bass * 3;
      const finalRadius = radius + vibration;
      
      // Color gradients: shift based on ring position, time, and click offset
      const ringHue = (circle.ring * 40 + globalHueShift + this.colorOffset) % 360;
      const indexOffset = (circle.index / (circle.ring === 0 ? 1 : circle.ring * 6)) * 60;
      const hue = (ringHue + indexOffset) % 360;
      const saturation = 60 + audio.mid * 30;
      const lightness = 50 + Math.sin(this.time * 2 + circle.ring) * 10 + audio.rms * 20;
      
      // Line thickness varies with audio and zoom
      const lineWidth = (2 + (audio.beat ? 2 : 0) + expansionProgress * 0.5) * this.zoomScale;
      
      // Draw the circle
      this.graphics.lineStyle(
        lineWidth,
        this.hslToHex(hue, saturation, lightness),
        alpha
      );
      this.graphics.drawCircle(zoomedX, zoomedY, finalRadius);
      
      // Draw subtle fill when fully grown
      if (expansionProgress > 0.9) {
        const fillAlpha = (expansionProgress - 0.9) / 0.1 * 0.1 * (1 + (audio.beat ? 0.1 : 0));
        this.graphics.beginFill(this.hslToHex(hue, saturation, lightness), fillAlpha);
        this.graphics.drawCircle(zoomedX, zoomedY, finalRadius);
        this.graphics.endFill();
      }
    });
    
    // Draw growth progress indicator
    const indicatorX = this.context.width - 30;
    const indicatorY = this.context.height - 30;
    const indicatorProgress = this.growthPhase / this.cycleTime;
    
    this.graphics.lineStyle(2, 0xffffff, 0.3);
    this.graphics.drawCircle(indicatorX, indicatorY, 10);
    
    this.graphics.lineStyle(0);
    this.graphics.beginFill(0xffffff, 0.5);
    this.graphics.moveTo(indicatorX, indicatorY);
    this.graphics.arc(indicatorX, indicatorY, 8, -Math.PI / 2, -Math.PI / 2 + indicatorProgress * Math.PI * 2);
    this.graphics.lineTo(indicatorX, indicatorY);
    this.graphics.endFill();
  }
  
  private easeOutElastic(x: number): number {
    const c4 = (2 * Math.PI) / 3;
    return x === 0
      ? 0
      : x === 1
      ? 1
      : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
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

