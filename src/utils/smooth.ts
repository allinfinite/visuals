// Utility for smooth value interpolation

export class SmoothedValue {
  private current: number;
  private target: number;
  private smoothing: number;

  constructor(initialValue: number = 0, smoothing: number = 0.1) {
    this.current = initialValue;
    this.target = initialValue;
    this.smoothing = smoothing; // 0 = instant, 1 = no movement
  }

  public setTarget(value: number): void {
    this.target = value;
  }

  public update(dt: number): number {
    // Exponential smoothing
    const factor = Math.exp(-this.smoothing * dt * 60); // Normalized to 60fps
    this.current = this.current * factor + this.target * (1 - factor);
    return this.current;
  }

  public getValue(): number {
    return this.current;
  }

  public setValue(value: number): void {
    this.current = value;
    this.target = value;
  }
}

export class SmoothedVector2 {
  private currentX: number;
  private currentY: number;
  private targetX: number;
  private targetY: number;
  private smoothing: number;

  constructor(x: number = 0, y: number = 0, smoothing: number = 0.1) {
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;
    this.smoothing = smoothing;
  }

  public setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  public update(dt: number): { x: number; y: number } {
    const factor = Math.exp(-this.smoothing * dt * 60);
    this.currentX = this.currentX * factor + this.targetX * (1 - factor);
    this.currentY = this.currentY * factor + this.targetY * (1 - factor);
    return { x: this.currentX, y: this.currentY };
  }

  public getValue(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }
}

// Smoothly interpolate between values using various easing functions
export function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function smootherStep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function exponentialEaseOut(t: number, power: number = 2): number {
  return 1 - Math.pow(1 - t, power);
}

