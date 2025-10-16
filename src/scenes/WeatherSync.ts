import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';
import { hslToHex } from '../utils/color';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  type: 'rain' | 'snow' | 'fog';
  rotation: number;
  rotationSpeed: number;
}

export class WeatherSync implements Pattern {
  public name = 'Weather Sync';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private particles: Particle[] = [];
  private time: number = 0;
  private weatherMode: 'rain' | 'snow' | 'fog' = 'fog';

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Initialize with some particles for immediate visibility
    for (let i = 0; i < 30; i++) {
      this.spawnParticle('rain');
    }
    for (let i = 0; i < 20; i++) {
      this.spawnParticle('snow');
    }
    for (let i = 0; i < 10; i++) {
      this.spawnParticle('fog');
    }
  }

  private determineWeather(audio: AudioData): 'rain' | 'snow' | 'fog' {
    // More responsive weather thresholds based on audio characteristics
    const energy = audio.rms;
    const brightness = audio.treble;
    const depth = audio.bass;

    // Lower thresholds for more responsive weather changes
    if (energy > 0.4 && brightness > 0.35) {
      return 'rain'; // High energy = rain (was 0.6/0.5)
    } else if (depth > 0.35 && brightness < 0.5) {
      return 'snow'; // Deep, calm = snow (was 0.5/0.4)
    } else {
      return 'fog'; // Default ambient
    }
  }

  private spawnParticle(type: 'rain' | 'snow' | 'fog'): void {
    const { width, height } = this.context;
    
    if (type === 'rain') {
      this.particles.push({
        x: randomRange(-50, width + 50),
        y: randomRange(-20, 0),
        vx: randomRange(-20, 20),
        vy: randomRange(300, 600),
        size: randomRange(1.5, 3.5), // Slightly thicker rain (was 1-3)
        alpha: randomRange(0.4, 0.9), // Brighter (was 0.3-0.8)
        type: 'rain',
        rotation: randomRange(-0.2, 0.2),
        rotationSpeed: 0,
      });
    } else if (type === 'snow') {
      this.particles.push({
        x: randomRange(-50, width + 50),
        y: randomRange(-20, 0),
        vx: randomRange(-20, 20),
        vy: randomRange(30, 80),
        size: randomRange(3, 8), // Larger snowflakes (was 2-6)
        alpha: randomRange(0.6, 1.0), // Brighter (was 0.5-0.9)
        type: 'snow',
        rotation: randomRange(0, Math.PI * 2),
        rotationSpeed: randomRange(-1, 1),
      });
    } else { // fog
      this.particles.push({
        x: randomRange(-100, width + 100),
        y: randomRange(0, height),
        vx: randomRange(-10, 10),
        vy: randomRange(-5, 5),
        size: randomRange(50, 150), // Larger fog clouds (was 40-120)
        alpha: randomRange(0.1, 0.25), // More visible (was 0.05-0.15)
        type: 'fog',
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;

    // Determine weather from audio
    this.weatherMode = this.determineWeather(audio);

    // Increased spawn rates for more dynamic weather
    let spawnRate = 0;
    if (this.weatherMode === 'rain') {
      spawnRate = 8 + audio.rms * 20; // More rain (was 5+15)
    } else if (this.weatherMode === 'snow') {
      spawnRate = 4 + audio.bass * 12; // More snow (was 2+8)
    } else {
      spawnRate = 1.5 + audio.rms * 4; // More fog (was 0.5+2)
    }

    // Spawn particles
    const spawnCount = Math.floor(spawnRate * dt);
    for (let i = 0; i < spawnCount; i++) {
      this.spawnParticle(this.weatherMode);
    }

    // Beat effect - spawn burst
    if (audio.beat) {
      const burstCount = this.weatherMode === 'rain' ? 20 : 10;
      for (let i = 0; i < burstCount; i++) {
        this.spawnParticle(this.weatherMode);
      }
    }

    // Update particles
    this.particles.forEach((particle) => {
      // Apply velocity
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      
      // Apply gravity/wind based on type
      if (particle.type === 'rain') {
        particle.vy += 100 * dt; // Gravity
        particle.vx += (audio.centroid - 0.5) * 50 * dt; // Wind from audio
      } else if (particle.type === 'snow') {
        particle.vx += Math.sin(this.time * 2 + particle.x * 0.01) * 20 * dt;
        particle.rotation += particle.rotationSpeed * dt;
      } else { // fog
        // Drift slowly
        particle.vx += (Math.random() - 0.5) * 5 * dt;
        particle.vy += (Math.random() - 0.5) * 5 * dt;
        
        // Fade in and out (increased visibility range)
        particle.alpha += (Math.random() - 0.5) * 0.1 * dt;
        particle.alpha = Math.max(0.08, Math.min(0.35, particle.alpha)); // Was 0.02-0.2, now 0.08-0.35
      }
    });

    // Remove off-screen particles
    const margin = 200;
    this.particles = this.particles.filter(p => {
      if (p.type === 'fog') {
        // Fog cycles through
        if (p.x < -margin) p.x = this.context.width + margin;
        if (p.x > this.context.width + margin) p.x = -margin;
        if (p.y < -margin) p.y = this.context.height + margin;
        if (p.y > this.context.height + margin) p.y = -margin;
        return true;
      }
      return p.y < this.context.height + margin;
    });

    // Limit particle count
    if (this.particles.length > 500) {
      this.particles = this.particles.slice(-400);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    this.particles.forEach((particle) => {
      if (particle.type === 'rain') {
        // Rain drops (lines)
        const length = 10 + particle.vy * 0.05;
        const angle = Math.atan2(particle.vy, particle.vx);
        
        this.graphics.lineStyle(particle.size, 0x88aaff, particle.alpha * (0.6 + audio.treble * 0.4));
        this.graphics.moveTo(particle.x, particle.y);
        this.graphics.lineTo(
          particle.x - Math.cos(angle) * length,
          particle.y - Math.sin(angle) * length
        );

        // Splash effect when it would hit ground
        if (particle.y > this.context.height * 0.8) {
          this.graphics.beginFill(0x88aaff, particle.alpha * 0.3);
          this.graphics.drawCircle(particle.x, particle.y, particle.size * 2);
          this.graphics.endFill();
        }
        
      } else if (particle.type === 'snow') {
        // Snowflakes (detailed)
        const color = 0xffffff;
        
        // Center
        this.graphics.beginFill(color, particle.alpha * 0.9);
        this.graphics.drawCircle(particle.x, particle.y, particle.size * 0.3);
        this.graphics.endFill();

        // Snowflake arms
        this.graphics.lineStyle(1, color, particle.alpha * 0.7);
        const armCount = 6;
        const armLength = particle.size;
        
        for (let i = 0; i < armCount; i++) {
          const angle = (i / armCount) * Math.PI * 2 + particle.rotation;
          this.graphics.moveTo(particle.x, particle.y);
          this.graphics.lineTo(
            particle.x + Math.cos(angle) * armLength,
            particle.y + Math.sin(angle) * armLength
          );
          
          // Branches
          const branchAngle1 = angle + Math.PI / 4;
          const branchAngle2 = angle - Math.PI / 4;
          const branchLen = armLength * 0.4;
          const branchX = particle.x + Math.cos(angle) * armLength * 0.7;
          const branchY = particle.y + Math.sin(angle) * armLength * 0.7;
          
          this.graphics.moveTo(branchX, branchY);
          this.graphics.lineTo(
            branchX + Math.cos(branchAngle1) * branchLen,
            branchY + Math.sin(branchAngle1) * branchLen
          );
          
          this.graphics.moveTo(branchX, branchY);
          this.graphics.lineTo(
            branchX + Math.cos(branchAngle2) * branchLen,
            branchY + Math.sin(branchAngle2) * branchLen
          );
        }
        
      } else { // fog
        // Fog clouds (soft circles) - increased visibility
        const hue = 200 + audio.centroid * 60;
        const color = hslToHex(hue, 25, 75); // Slightly more saturated and lighter
        
        // Multiple layers for softness (increased alpha multipliers)
        this.graphics.beginFill(color, particle.alpha * 0.6); // Was 0.3
        this.graphics.drawCircle(particle.x, particle.y, particle.size);
        this.graphics.endFill();
        
        this.graphics.beginFill(color, particle.alpha * 0.4); // Was 0.2
        this.graphics.drawCircle(particle.x, particle.y, particle.size * 1.5);
        this.graphics.endFill();
        
        this.graphics.beginFill(color, particle.alpha * 0.25); // Was 0.1
        this.graphics.drawCircle(particle.x, particle.y, particle.size * 2);
        this.graphics.endFill();
      }
    });

    // Draw weather indicator (more visible)
    const weatherColor = this.weatherMode === 'rain' ? 0x88aaff : 
                        this.weatherMode === 'snow' ? 0xffffff : 0xcccccc;
    
    // Glow
    this.graphics.beginFill(weatherColor, 0.3);
    this.graphics.drawCircle(30, 30, 15);
    this.graphics.endFill();
    
    // Core
    this.graphics.beginFill(weatherColor, 0.6 + audio.rms * 0.4);
    this.graphics.drawCircle(30, 30, 10);
    this.graphics.endFill();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

