import type { InputState, ClickEvent } from '../types';

export class Input {
  public state: InputState = {
    x: 0,
    y: 0,
    isDown: false,
    isDragging: false,
    clicks: [],
  };

  private clickRetentionTime: number = 2000; // Keep clicks for 2 seconds
  private dragThreshold: number = 5; // Pixels
  private lastDownPosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor(element: HTMLElement) {
    this.setupListeners(element);
  }

  private setupListeners(element: HTMLElement): void {
    element.addEventListener('pointermove', (e) => {
      this.state.x = e.clientX;
      this.state.y = e.clientY;

      if (this.state.isDown) {
        const dx = this.state.x - this.lastDownPosition.x;
        const dy = this.state.y - this.lastDownPosition.y;
        if (Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
          this.state.isDragging = true;
        }
      }
    });

    element.addEventListener('pointerdown', (e) => {
      this.state.isDown = true;
      this.state.x = e.clientX;
      this.state.y = e.clientY;
      this.lastDownPosition = { x: this.state.x, y: this.state.y };
      
      this.state.clicks.push({
        x: this.state.x,
        y: this.state.y,
        time: performance.now(),
      });
    });

    element.addEventListener('pointerup', () => {
      this.state.isDown = false;
      this.state.isDragging = false;
    });

    element.addEventListener('pointerleave', () => {
      this.state.isDown = false;
      this.state.isDragging = false;
    });
  }

  public update(): void {
    // Remove old clicks
    const now = performance.now();
    this.state.clicks = this.state.clicks.filter(
      (click) => now - click.time < this.clickRetentionTime
    );
  }

  public getLatestClick(): ClickEvent | null {
    return this.state.clicks.length > 0 
      ? this.state.clicks[this.state.clicks.length - 1] 
      : null;
  }

  public clearClicks(): void {
    this.state.clicks = [];
  }
}

