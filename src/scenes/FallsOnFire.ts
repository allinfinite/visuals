import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';
import { randomRange } from '../utils/math';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  heat: number; // 0-1, determines color
  turbulence: number;
}

export class FallsOnFire implements Pattern {
  public name = 'Falls on Fire';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private particles: FireParticle[] = [];
  private textOverlays: Text[] = [];
  private textTimer: number = 0;
  private textInterval: number = 12; // Show text every 12 seconds
  
  // Waterfall parameters
  private waterfallWidth: number = 400;
  private sourceY: number = -50;
  private spawnRate: number = 200; // Particles per second
  private maxParticles: number = 600;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Update text timer
    this.textTimer += dt;
    if (this.textTimer >= this.textInterval) {
      this.textTimer = 0;
      this.spawnTextOverlay();
    }
    
    // Position waterfall at cursor or center
    const centerX = input.isDragging ? input.x : this.context.width / 2;
    
    // Spawn fire particles from top (waterfall source)
    const audioBoost = 1 + audio.bass * 0.5;
    const particlesToSpawn = Math.floor(this.spawnRate * dt * audioBoost);
    
    for (let i = 0; i < particlesToSpawn && this.particles.length < this.maxParticles; i++) {
      const offsetX = (Math.random() - 0.5) * this.waterfallWidth;
      
      this.particles.push({
        x: centerX + offsetX,
        y: this.sourceY,
        vx: (Math.random() - 0.5) * 20,
        vy: randomRange(200, 400), // Falling speed
        life: 1,
        maxLife: randomRange(2, 4),
        size: randomRange(8, 20),
        heat: randomRange(0.7, 1),
        turbulence: Math.random() * 2,
      });
    }
    
    // Update particles
    this.particles.forEach(p => {
      // Apply turbulence using Perlin noise
      const noiseX = noise2D(p.x * 0.01, p.y * 0.01 + this.time * 2);
      const noiseY = noise2D(p.x * 0.01 + 100, p.y * 0.01 + this.time * 2);
      
      p.vx += noiseX * 100 * dt * p.turbulence;
      p.vy += noiseY * 50 * dt * p.turbulence;
      
      // Apply velocity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Gravity
      p.vy += 100 * dt;
      
      // Air resistance
      p.vx *= 0.99;
      p.vy *= 0.995;
      
      // Cool down and fade
      p.life -= dt / p.maxLife;
      p.heat -= dt * 0.3;
      
      // Audio reactivity - heat pulse
      p.heat += audio.beat ? 0.2 : 0;
      p.heat = Math.min(1, p.heat);
    });
    
    // Remove dead particles
    this.particles = this.particles.filter(p => p.life > 0 && p.y < this.context.height + 100);
    
    // Update text overlays
    this.textOverlays.forEach(text => {
      const data = (text as any).userData;
      if (data) {
        data.age += dt;
        
        // Fade in
        if (data.age < 1) {
          text.alpha = data.age;
        }
        // Stay visible
        else if (data.age < 4) {
          text.alpha = 1;
        }
        // Fade out
        else if (data.age < 6) {
          text.alpha = 1 - (data.age - 4) / 2;
        }
        // Remove
        else {
          text.alpha = 0;
        }
        
        // Subtle drift
        text.y += dt * 10;
        text.x += Math.sin(data.age * 2) * dt * 5;
      }
    });
    
    // Remove old text overlays
    this.textOverlays = this.textOverlays.filter(text => {
      const data = (text as any).userData;
      if (data && data.age > 6) {
        this.container.removeChild(text);
        text.destroy();
        return false;
      }
      return true;
    });
    
    this.draw(audio);
  }

  private spawnTextOverlay(): void {
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 72,
      fontWeight: 'bold',
      fill: ['#ff6600', '#ff0000'], // Gradient: orange to red
      stroke: '#000000',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#ff4400',
      dropShadowBlur: 20,
      dropShadowAngle: Math.PI / 2,
      dropShadowDistance: 0,
    });
    
    const text = new Text('FALLS ON FIRE', style);
    text.anchor.set(0.5, 0.5);
    text.x = this.context.width / 2 + (Math.random() - 0.5) * 100;
    text.y = this.context.height / 2 + (Math.random() - 0.5) * 200;
    text.alpha = 0;
    text.rotation = (Math.random() - 0.5) * 0.2;
    
    // Store age data
    (text as any).userData = { age: 0 };
    
    this.container.addChild(text);
    this.textOverlays.push(text);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();
    
    // Draw particles with fire colors
    this.particles.forEach(p => {
      const alpha = p.life * (0.6 + audio.rms * 0.4);
      
      // Color based on heat: white -> yellow -> orange -> red -> dark red
      let color: number;
      if (p.heat > 0.8) {
        // White hot
        color = 0xffffff;
      } else if (p.heat > 0.6) {
        // Yellow
        color = 0xffff00;
      } else if (p.heat > 0.4) {
        // Orange
        color = 0xff8800;
      } else if (p.heat > 0.2) {
        // Red
        color = 0xff3300;
      } else {
        // Dark red / smoke
        color = 0x880000;
      }
      
      const size = p.size * p.life * (1 + audio.treble * 0.3);
      
      // Glow
      this.graphics.beginFill(color, alpha * 0.3);
      this.graphics.drawCircle(p.x, p.y, size * 1.5);
      this.graphics.endFill();
      
      // Core
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(p.x, p.y, size);
      this.graphics.endFill();
      
      // Hot center
      if (p.heat > 0.7) {
        this.graphics.beginFill(0xffffff, alpha * 0.8);
        this.graphics.drawCircle(p.x, p.y, size * 0.4);
        this.graphics.endFill();
      }
    });
    
    // Draw title at top (subtle, always visible)
    const titleY = 30;
    const titleX = this.context.width / 2;
    
    // Title background
    this.graphics.beginFill(0x000000, 0.4);
    this.graphics.drawRoundedRect(titleX - 150, titleY - 20, 300, 50, 10);
    this.graphics.endFill();
    
    // Title border with fire glow
    const glowIntensity = 0.5 + audio.bass * 0.5;
    this.graphics.lineStyle(3, 0xff4400, glowIntensity);
    this.graphics.drawRoundedRect(titleX - 150, titleY - 20, 300, 50, 10);
  }

  public destroy(): void {
    // Clean up text overlays
    this.textOverlays.forEach(text => {
      this.container.removeChild(text);
      text.destroy();
    });
    this.textOverlays = [];
    
    this.graphics.destroy();
    this.container.destroy();
  }
}

