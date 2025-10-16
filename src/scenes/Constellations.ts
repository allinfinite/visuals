import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  time: number;
  brightness: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
}

export class Constellations implements Pattern {
  public name = 'Constellations';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private stars: Star[] = [];
  private shootingStars: ShootingStar[] = [];
  private time: number = 0;
  private maxStars: number = 80; // Increased from 30
  private connectionDistance: number = 200;
  private spawnTimer: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Initialize with some stars for immediate visibility
    for (let i = 0; i < 40; i++) {
      this.spawnStar();
    }
  }

  private spawnStar(): void {
    const { width, height } = this.context;
    this.stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 10, // Slow drift
      vy: (Math.random() - 0.5) * 10,
      time: this.time,
      brightness: 0.5 + Math.random() * 0.5,
      life: 0,
      maxLife: 10 + Math.random() * 20, // 10-30 second lifecycle
      size: 2 + Math.random() * 3,
    });
  }

  private spawnShootingStar(): void {
    const { width, height } = this.context;
    // Spawn from edges
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    
    switch (side) {
      case 0: // Top
        x = Math.random() * width;
        y = -20;
        vx = (Math.random() - 0.5) * 200;
        vy = 200 + Math.random() * 200;
        break;
      case 1: // Right
        x = width + 20;
        y = Math.random() * height;
        vx = -200 - Math.random() * 200;
        vy = (Math.random() - 0.5) * 200;
        break;
      case 2: // Bottom
        x = Math.random() * width;
        y = height + 20;
        vx = (Math.random() - 0.5) * 200;
        vy = -200 - Math.random() * 200;
        break;
      default: // Left
        x = -20;
        y = Math.random() * height;
        vx = 200 + Math.random() * 200;
        vy = (Math.random() - 0.5) * 200;
    }
    
    this.shootingStars.push({
      x, y, vx, vy,
      life: 0,
      maxLife: 2 + Math.random() * 2,
      length: 30 + Math.random() * 70,
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    this.spawnTimer += dt;

    // Continuous star spawning
    const spawnInterval = 0.3 - audio.rms * 0.2; // Faster with more audio
    if (this.spawnTimer > spawnInterval && this.stars.length < this.maxStars) {
      this.spawnStar();
      this.spawnTimer = 0;
    }

    // Add stars on click
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.stars.length < this.maxStars) {
        this.stars.push({
          x: click.x,
          y: click.y,
          vx: 0,
          vy: 0,
          time: this.time,
          brightness: 1,
          life: 0,
          maxLife: 15,
          size: 4,
        });
        // Spawn shooting star from click
        if (Math.random() < 0.3) {
          this.spawnShootingStar();
        }
      }
    });

    // Shooting stars on beats
    if (audio.beat && Math.random() < 0.5) {
      this.spawnShootingStar();
    }

    // Random shooting stars
    if (Math.random() < dt * 0.3) {
      this.spawnShootingStar();
    }

    // Update stars
    this.stars.forEach((star) => {
      star.life += dt;
      
      // Movement
      star.x += star.vx * dt;
      star.y += star.vy * dt;
      
      // Wrap around edges
      if (star.x < 0) star.x = this.context.width;
      if (star.x > this.context.width) star.x = 0;
      if (star.y < 0) star.y = this.context.height;
      if (star.y > this.context.height) star.y = 0;
      
      // Twinkle effect
      const age = this.time - star.time;
      star.brightness = 0.5 + Math.sin(age * 2 + star.x * 0.1) * 0.3 + audio.treble * 0.2;
      
      // Lifecycle fade
      const lifeProgress = star.life / star.maxLife;
      if (lifeProgress < 0.1) {
        star.brightness *= lifeProgress / 0.1; // Fade in
      } else if (lifeProgress > 0.9) {
        star.brightness *= (1 - lifeProgress) / 0.1; // Fade out
      }
    });

    // Remove dead stars
    this.stars = this.stars.filter(s => s.life < s.maxLife);

    // Update shooting stars
    this.shootingStars.forEach((ss) => {
      ss.life += dt;
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
    });

    // Remove old shooting stars
    this.shootingStars = this.shootingStars.filter(ss => {
      const inBounds = ss.x > -100 && ss.x < this.context.width + 100 &&
                       ss.y > -100 && ss.y < this.context.height + 100;
      return ss.life < ss.maxLife && inBounds;
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();

    // Draw shooting stars
    this.shootingStars.forEach((ss) => {
      const progress = ss.life / ss.maxLife;
      const alpha = Math.sin(progress * Math.PI) * 0.8; // Fade in and out
      
      // Calculate trail
      const angle = Math.atan2(ss.vy, ss.vx);
      const endX = ss.x - Math.cos(angle) * ss.length;
      const endY = ss.y - Math.sin(angle) * ss.length;
      
      // Outer glow
      this.graphics.lineStyle(5, 0xffffff, alpha * 0.2);
      this.graphics.moveTo(endX, endY);
      this.graphics.lineTo(ss.x, ss.y);
      
      // Bright core trail
      this.graphics.lineStyle(2, 0xffffaa, alpha * 0.8);
      this.graphics.moveTo(endX, endY);
      this.graphics.lineTo(ss.x, ss.y);
      
      // Head glow
      this.graphics.beginFill(0xffffff, alpha * 0.5);
      this.graphics.drawCircle(ss.x, ss.y, 8);
      this.graphics.endFill();
      
      // Bright head
      this.graphics.beginFill(0xffffdd, alpha);
      this.graphics.drawCircle(ss.x, ss.y, 4);
      this.graphics.endFill();
    });

    // Draw connections between nearby stars (animated)
    const connectionPulse = 1 + Math.sin(this.time * 2) * 0.3;
    for (let i = 0; i < this.stars.length; i++) {
      for (let j = i + 1; j < this.stars.length; j++) {
        const star1 = this.stars[i];
        const star2 = this.stars[j];
        
        const dx = star2.x - star1.x;
        const dy = star2.y - star1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.connectionDistance) {
          const alpha = (1 - dist / this.connectionDistance) * 0.4 * connectionPulse;
          const glow = audio.beat ? 2 : 1;

          this.graphics.lineStyle(
            1 * glow,
            0x8888ff,
            alpha * (0.5 + audio.mid * 0.5)
          );
          this.graphics.moveTo(star1.x, star1.y);
          this.graphics.lineTo(star2.x, star2.y);
        }
      }
    }

    // Draw stars
    this.stars.forEach((star) => {
      const size = star.size + star.brightness * 2 + (audio.beat ? 2 : 0);
      const alpha = Math.max(0, Math.min(1, 0.7 + star.brightness * 0.3));

      // Large glow
      this.graphics.beginFill(0xaaaaff, alpha * 0.15);
      this.graphics.drawCircle(star.x, star.y, size * 3);
      this.graphics.endFill();

      // Medium glow
      this.graphics.beginFill(0xddddff, alpha * 0.3);
      this.graphics.drawCircle(star.x, star.y, size * 2);
      this.graphics.endFill();

      // Star core
      this.graphics.beginFill(0xffffff, alpha);
      this.graphics.drawCircle(star.x, star.y, size);
      this.graphics.endFill();
      
      // Twinkle sparkle
      if (star.brightness > 0.8) {
        this.graphics.lineStyle(1, 0xffffff, (star.brightness - 0.8) * 2);
        const sparkleSize = size * 1.5;
        this.graphics.moveTo(star.x - sparkleSize, star.y);
        this.graphics.lineTo(star.x + sparkleSize, star.y);
        this.graphics.moveTo(star.x, star.y - sparkleSize);
        this.graphics.lineTo(star.x, star.y + sparkleSize);
      }
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

