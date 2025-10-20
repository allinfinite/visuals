import type { InputState, ClickEvent } from '../types';
import { WebcamInput } from './WebcamInput';

export class Input {
  public state: InputState = {
    x: 0,
    y: 0,
    isDown: false,
    isDragging: false,
    clicks: [],
    webcam: undefined,
  };

  private clickRetentionTime: number = 2000; // Keep clicks for 2 seconds
  private dragThreshold: number = 5; // Pixels
  private lastDownPosition: { x: number; y: number } = { x: 0, y: 0 };
  private webcamInput: WebcamInput;
  private screenWidth: number = window.innerWidth;
  private screenHeight: number = window.innerHeight;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(element: HTMLElement) {
    this.setupListeners(element);
    this.webcamInput = new WebcamInput();
    
    // Track window resize
    window.addEventListener('resize', () => {
      this.screenWidth = window.innerWidth;
      this.screenHeight = window.innerHeight;
    });
  }

  private setupListeners(element: HTMLElement): void {
    element.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.state.isDown) {
        const dx = this.mouseX - this.lastDownPosition.x;
        const dy = this.mouseY - this.lastDownPosition.y;
        if (Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
          this.state.isDragging = true;
        }
      }
    });

    element.addEventListener('pointerdown', (e) => {
      this.state.isDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.lastDownPosition = { x: this.mouseX, y: this.mouseY };
      
      this.state.clicks.push({
        x: this.mouseX,
        y: this.mouseY,
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

  public update(dt: number = 0.016): void {
    // Update webcam
    this.webcamInput.update(dt);
    const webcamData = this.webcamInput.getWebcamData();
    this.state.webcam = webcamData;
    
    // Merge webcam and mouse positions
    if (webcamData.enabled && webcamData.hasMotion) {
      // Use webcam position when motion is detected
      this.state.x = webcamData.x * this.screenWidth;
      this.state.y = webcamData.y * this.screenHeight;
      
      // Set drag state based on webcam motion
      if (webcamData.isDragging) {
        this.state.isDown = true;
        this.state.isDragging = true;
      }
    } else {
      // Fall back to mouse position and state
      this.state.x = this.mouseX;
      this.state.y = this.mouseY;
      // Mouse state is handled by event listeners
    }
    
    // Check for webcam click gesture (only when not in drag mode)
    if (this.webcamInput.shouldTriggerClick()) {
      this.state.clicks.push({
        x: this.state.x,
        y: this.state.y,
        time: performance.now(),
      });
    }
    
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
  
  public getWebcamInput(): WebcamInput {
    return this.webcamInput;
  }
}

