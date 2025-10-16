export class Clock {
  private lastTime: number = 0;
  private deltaTime: number = 0;
  private elapsedTime: number = 0;
  private frameTimeHistory: number[] = [];
  private maxFrameTimeHistory: number = 10;
  
  public bpm: number = 120;
  public beatsPerBar: number = 4;

  constructor() {
    this.lastTime = performance.now();
  }

  public update(): number {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000; // Convert to seconds
    
    // Cap delta time to prevent huge jumps (e.g., when tab is inactive)
    dt = Math.min(dt, 0.1); // Max 100ms
    
    // Smooth delta time using rolling average
    this.frameTimeHistory.push(dt);
    if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
      this.frameTimeHistory.shift();
    }
    
    // Use smoothed delta time
    const avgDt = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    this.deltaTime = avgDt;
    
    this.lastTime = now;
    this.elapsedTime += this.deltaTime;
    return this.deltaTime;
  }

  public getDelta(): number {
    return this.deltaTime;
  }

  public getElapsed(): number {
    return this.elapsedTime;
  }

  public getBeatPhase(): number {
    const beatDuration = 60 / this.bpm;
    return (this.elapsedTime % beatDuration) / beatDuration;
  }

  public getBarPhase(): number {
    const barDuration = (60 / this.bpm) * this.beatsPerBar;
    return (this.elapsedTime % barDuration) / barDuration;
  }
}

