import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Plant {
  x: number;
  y: number;
  instructions: string;
  age: number;
  hue: number;
}

export class LSystem implements Pattern {
  public name = 'L-System Plants';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private plants: Plant[] = [];
  private time: number = 0;

  // L-System rules
  private axiom = 'F';
  private rules: { [key: string]: string } = {
    'F': 'FF+[+F-F-F]-[-F+F+F]', // Branching pattern
  };

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Spawn initial plants
    for (let i = 0; i < 5; i++) {
      const x = (i + 1) * (this.context.width / 6);
      const y = this.context.height - randomRange(50, 150);
      this.spawnPlant(x, y);
    }
  }

  private generate(axiom: string, iterations: number): string {
    let current = axiom;
    for (let i = 0; i < iterations; i++) {
      let next = '';
      for (const char of current) {
        next += this.rules[char] || char;
      }
      current = next;
    }
    return current;
  }

  private spawnPlant(x: number, y: number): void {
    this.plants.push({
      x,
      y,
      instructions: this.axiom,
      age: 0,
      hue: Math.random() * 120 + 80, // Green-ish
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Spawn plants on click
    input.clicks.forEach((click) => {
      const age = (performance.now() - click.time) / 1000;
      if (age < 0.05 && this.plants.length < 20) {
        this.spawnPlant(click.x, click.y);
      }
    });
    
    // Autonomous spawning - grow new plants from bottom
    if (this.plants.length < 15 && Math.random() < 0.01 + audio.beat * 0.05) {
      const x = randomRange(this.context.width * 0.2, this.context.width * 0.8);
      const y = this.context.height - randomRange(50, 150);
      this.spawnPlant(x, y);
    }

    // Grow plants over time
    this.plants.forEach((plant) => {
      plant.age += dt * (0.5 + audio.rms);
      const iterations = Math.min(4, Math.floor(plant.age));
      plant.instructions = this.generate(this.axiom, iterations);
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    // Don't clear - let trails build up via feedback system
    // this.graphics.clear();

    this.plants.forEach((plant) => {
      const length = 8 * (1 + audio.bass * 0.3);
      const angle = 25 * (Math.PI / 180); // 25 degrees
      const alpha = 0.6 + audio.mid * 0.3;

      // Set line style for this plant
      this.graphics.lineStyle(
        1.5,
        this.hslToHex(plant.hue, 70, 40 + audio.treble * 20),
        alpha
      );

      // Turtle graphics state
      const stack: { x: number; y: number; dir: number }[] = [];
      let x = plant.x;
      let y = plant.y;
      let dir = -Math.PI / 2; // Start pointing up

      for (const char of plant.instructions) {
        switch (char) {
          case 'F': // Move forward and draw
            const newX = x + Math.cos(dir) * length;
            const newY = y + Math.sin(dir) * length;
            
            this.graphics.moveTo(x, y);
            this.graphics.lineTo(newX, newY);

            x = newX;
            y = newY;
            break;

          case '+': // Turn right
            dir += angle;
            break;

          case '-': // Turn left
            dir -= angle;
            break;

          case '[': // Save state
            stack.push({ x, y, dir });
            break;

          case ']': // Restore state
            const state = stack.pop();
            if (state) {
              x = state.x;
              y = state.y;
              dir = state.dir;
            }
            break;
        }
      }
    });
  }

  private hslToHex(h: number, s: number, l: number): number {
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

