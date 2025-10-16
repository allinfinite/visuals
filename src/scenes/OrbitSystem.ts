import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Planet {
  angle: number;
  speed: number;
  radius: number;
  orbitRadius: number;
  hue: number;
  size: number;
  satellites: Satellite[];
}

interface Satellite {
  angle: number;
  speed: number;
  orbitRadius: number;
  size: number;
  hue: number;
}

export class OrbitSystem implements Pattern {
  public name = 'Orbit System';
  public container: Container;
  private graphics: Graphics;
  private planets: Planet[] = [];
  private time: number = 0;
  private centerX: number;
  private centerY: number;

  constructor(context: RendererContext) {
    this.centerX = context.width / 2;
    this.centerY = context.height / 2;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.initPlanets();
  }

  private initPlanets(): void {
    for (let i = 0; i < 5; i++) {
      this.addPlanet();
    }
  }

  private addPlanet(): void {
    const orbitRadius = 50 + this.planets.length * 60;
    const planet: Planet = {
      angle: Math.random() * Math.PI * 2,
      speed: randomRange(0.3, 0.8),
      radius: orbitRadius,
      orbitRadius,
      hue: randomRange(0, 360),
      size: randomRange(5, 12),
      satellites: [],
    };

    // Add 1-3 satellites to some planets
    if (Math.random() < 0.6) {
      const satCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < satCount; i++) {
        planet.satellites.push({
          angle: Math.random() * Math.PI * 2,
          speed: randomRange(1, 3),
          orbitRadius: randomRange(15, 30),
          size: randomRange(2, 5),
          hue: planet.hue + randomRange(-30, 30),
        });
      }
    }

    this.planets.push(planet);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Add planet on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.planets.length < 12) {
        const dx = click.x - this.centerX;
        const dy = click.y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.planets.push({
          angle: Math.atan2(dy, dx),
          speed: randomRange(0.5, 1.5),
          radius: distance,
          orbitRadius: distance,
          hue: audio.centroid * 360,
          size: 8 + audio.bass * 8,
          satellites: [],
        });
      }
    });

    // Update planet positions with BPM modulation
    const speedMod = 1 + audio.rms * 0.5;
    
    this.planets.forEach((planet) => {
      planet.angle += planet.speed * dt * speedMod;
      
      // Update satellites
      planet.satellites.forEach((sat) => {
        sat.angle += sat.speed * dt * speedMod;
      });
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up
    this.graphics.clear();

    // Draw center star
    const starSize = 15 + audio.bass * 10;
    this.graphics.beginFill(0xffff00, 0.8 + audio.rms * 0.2);
    this.graphics.drawCircle(this.centerX, this.centerY, starSize);
    this.graphics.endFill();

    // Draw glow
    this.graphics.beginFill(0xffff00, 0.2);
    this.graphics.drawCircle(this.centerX, this.centerY, starSize * 2);
    this.graphics.endFill();

    // Draw planets and their orbits
    this.planets.forEach((planet) => {
      const x = this.centerX + Math.cos(planet.angle) * planet.orbitRadius;
      const y = this.centerY + Math.sin(planet.angle) * planet.orbitRadius;

      // Draw orbit path (faint)
      this.graphics.lineStyle(1, 0xffffff, 0.1);
      this.graphics.drawCircle(this.centerX, this.centerY, planet.orbitRadius);

      // Draw planet
      const size = planet.size * (audio.beat ? 1.2 : 1);
      this.graphics.beginFill(this.hslToHex(planet.hue, 70, 60), 0.7);
      this.graphics.drawCircle(x, y, size);
      this.graphics.endFill();

      // Draw satellites
      planet.satellites.forEach((sat) => {
        const satX = x + Math.cos(sat.angle) * sat.orbitRadius;
        const satY = y + Math.sin(sat.angle) * sat.orbitRadius;

        this.graphics.beginFill(this.hslToHex(sat.hue, 70, 70), 0.6);
        this.graphics.drawCircle(satX, satY, sat.size);
        this.graphics.endFill();
      });
    });
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

