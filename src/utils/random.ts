import Alea from 'alea';

export class SeededRandom {
  private prng: () => number;

  constructor(seed: number | string = Date.now()) {
    this.prng = new Alea(seed);
  }

  public random(): number {
    return this.prng();
  }

  public range(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public bool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  public choose<T>(array: T[]): T {
    return array[this.int(0, array.length - 1)];
  }

  public shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public gaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = this.random();
    const u2 = this.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  public onCircle(radius: number = 1): [number, number] {
    const angle = this.range(0, Math.PI * 2);
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  }

  public inCircle(radius: number = 1): [number, number] {
    const angle = this.range(0, Math.PI * 2);
    const r = Math.sqrt(this.random()) * radius;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  }
}

// Default instance
export const random = new SeededRandom();

