import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class TimeDisplacement implements Pattern {
  public name = 'Time Displacement';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 80;
  private processHeight: number = 60;
  
  // Frame history for chronophotography
  private frameHistory: ImageData[] = [];
  private maxFrames: number = 30; // 30 frames = ~0.5 seconds at 60fps
  private frameSkip: number = 2; // Only store every Nth frame
  private frameCounter: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Create video processing canvas
    this.videoCanvas = document.createElement('canvas');
    this.videoCanvas.width = this.processWidth;
    this.videoCanvas.height = this.processHeight;
    const ctx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    this.videoCtx = ctx;
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;
    
    // Audio affects time spread
    this.maxFrames = Math.floor(20 + audio.rms * 40);
    
    this.draw(dt, audio);
  }

  private draw(_dt: number, audio: AudioData): void {
    this.graphics.clear();
    
    // Get webcam
    const webcamInput = (window as any).__webcamInput;
    const video = webcamInput?.video;
    
    if (!video || video.readyState !== 4) {
      this.drawInstructions();
      return;
    }
    
    // Process video frame
    this.videoCtx.drawImage(video, 0, 0, this.processWidth, this.processHeight);
    const frame = this.videoCtx.getImageData(0, 0, this.processWidth, this.processHeight);
    
    // Add to history
    this.frameCounter++;
    if (this.frameCounter >= this.frameSkip) {
      this.frameCounter = 0;
      this.frameHistory.push(frame);
      
      // Limit history
      while (this.frameHistory.length > this.maxFrames) {
        this.frameHistory.shift();
      }
    }
    
    // Draw all frames from history
    this.drawFrameHistory(audio);
  }
  
  private drawFrameHistory(audio: AudioData): void {
    const { width, height } = this.context;
    const scaleX = width / this.processWidth;
    const scaleY = height / this.processHeight;
    const totalFrames = this.frameHistory.length;
    
    if (totalFrames === 0) return;
    
    // Draw from oldest to newest
    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const frame = this.frameHistory[frameIdx];
      const data = frame.data;
      const age = (totalFrames - frameIdx - 1) / totalFrames; // 0 = newest, 1 = oldest
      const alpha = (1 - age) * 0.7; // Fade older frames
      
      // Color shifts over time - creates rainbow chronophotography
      const hue = ((this.time * 50) + age * 360) % 360;
      
      // Extract silhouette and draw
      const threshold = 100 + audio.mid * 50;
      
      for (let y = 0; y < this.processHeight; y += 2) {
        for (let x = 0; x < this.processWidth; x += 2) {
          const idx = (y * this.processWidth + x) * 4;
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (gray < threshold) {
            const screenX = x * scaleX;
            const screenY = y * scaleY;
            
            // Offset based on time (creates motion trails)
            const offset = age * 20 * (audio.beat ? 2 : 1);
            
            const color = hslToHex(hue, 80, 60);
            this.graphics.beginFill(color, alpha);
            this.graphics.drawRect(
              screenX - offset,
              screenY,
              scaleX * 2,
              scaleY * 2
            );
            this.graphics.endFill();
          }
        }
      }
    }
    
    // Draw frame count indicator
    this.drawFrameIndicator(totalFrames);
  }
  
  private drawFrameIndicator(count: number): void {
    const baseHue = (this.time * 60) % 360;
    const color = hslToHex(baseHue, 80, 60);
    
    // Draw bar showing time depth
    const barWidth = 150;
    const barHeight = 10;
    const x = 20;
    const y = 20;
    
    this.graphics.lineStyle(2, color, 0.5);
    this.graphics.drawRect(x, y, barWidth, barHeight);
    
    this.graphics.beginFill(color, 0.7);
    this.graphics.drawRect(x, y, (count / this.maxFrames) * barWidth, barHeight);
    this.graphics.endFill();
    
    // Draw dots for each frame
    for (let i = 0; i < count; i++) {
      const dotX = x + (i / this.maxFrames) * barWidth;
      this.graphics.beginFill(color, 0.8);
      this.graphics.drawCircle(dotX, y + barHeight / 2, 2);
      this.graphics.endFill();
    }
  }
  
  private drawInstructions(): void {
    const { width, height } = this.context;
    const color = hslToHex((this.time * 60) % 360, 80, 60);
    
    this.graphics.beginFill(color, 0.8);
    const text = "Enable Webcam";
    const charWidth = 20;
    const textWidth = text.length * charWidth;
    for (let i = 0; i < text.length; i++) {
      this.graphics.drawRect((width - textWidth) / 2 + i * charWidth, height / 2 - 15, charWidth - 4, 30);
    }
    this.graphics.endFill();
    
    // Add subtitle
    this.graphics.beginFill(color, 0.6);
    const subtitle = "See Your Past";
    const subWidth = subtitle.length * 15;
    for (let i = 0; i < subtitle.length; i++) {
      this.graphics.drawRect((width - subWidth) / 2 + i * 15, height / 2 + 25, 15 - 2, 20);
    }
    this.graphics.endFill();
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

