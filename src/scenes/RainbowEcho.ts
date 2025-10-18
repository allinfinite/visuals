import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

export class RainbowEcho implements Pattern {
  public name = 'Rainbow Echo';
  public requiresWebcam = true;
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Video processing
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D;
  private processWidth: number = 320;
  private processHeight: number = 240;
  
  // Effect settings
  private edgeThreshold: number = 30;
  private silhouetteMode: number = 0; // 0: edges, 1: threshold, 2: difference, 3: glow
  private rainbowSpeed: number = 0.5;
  
  // Trails
  private trailSprites: Array<{ x: number; y: number; age: number; hue: number; size: number }> = [];
  private maxTrails: number = 1000;
  
  // Previous frame for motion detection
  private previousFrame: ImageData | null = null;

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

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Adjust effects based on audio
    this.rainbowSpeed = 0.3 + audio.treble * 0.7;
    
    // Cycle through modes on click
    for (const click of input.clicks) {
      const age = this.time - click.time / 1000;
      if (age < 0.05) {
        this.silhouetteMode = (this.silhouetteMode + 1) % 4;
        break;
      }
    }
    
    this.draw(dt, audio);
  }

  private draw(dt: number, audio: AudioData): void {
    this.graphics.clear();
    
    const { width, height } = this.context;
    
    // Try to get webcam video element
    const webcamInput = (window as any).__webcamInput;
    let video: HTMLVideoElement | null = null;
    
    if (webcamInput) {
      video = webcamInput.video;
    }
    
    // If no webcam, show instruction
    if (!video || video.readyState !== 4) {
      this.graphics.beginFill(0x000000, 0.1);
      this.graphics.drawRect(0, 0, width, height);
      this.graphics.endFill();
      
      const baseHue = (this.time * 60) % 360;
      const color = hslToHex(baseHue, 80, 60);
      
      // Draw instruction text
      this.graphics.lineStyle(0);
      this.graphics.beginFill(color, 0.8);
      
      const text = "Enable Webcam in Settings →";
      const charWidth = 20;
      const charHeight = 30;
      const textWidth = text.length * charWidth;
      const startX = (width - textWidth) / 2;
      const startY = height / 2 - charHeight;
      
      // Simple block text
      for (let i = 0; i < text.length; i++) {
        const x = startX + i * charWidth;
        this.graphics.drawRect(x, startY, charWidth - 4, charHeight);
      }
      this.graphics.endFill();
      
      return;
    }
    
    // Draw video to processing canvas (mirrored)
    this.videoCtx.save();
    this.videoCtx.scale(-1, 1);
    this.videoCtx.drawImage(video, -this.processWidth, 0, this.processWidth, this.processHeight);
    this.videoCtx.restore();
    const currentFrame = this.videoCtx.getImageData(0, 0, this.processWidth, this.processHeight);
    
    // Process based on mode
    let processedData: ImageData;
    switch (this.silhouetteMode) {
      case 0:
        processedData = this.detectEdges(currentFrame);
        break;
      case 1:
        processedData = this.thresholdSilhouette(currentFrame, audio);
        break;
      case 2:
        processedData = this.motionDifference(currentFrame);
        break;
      case 3:
        processedData = this.glowingSilhouette(currentFrame, audio);
        break;
      default:
        processedData = currentFrame;
    }
    
    // Store current frame for next iteration
    this.previousFrame = currentFrame;
    
    // Draw processed silhouette with rainbow colors
    this.drawRainbowSilhouette(processedData, audio);
    
    // Update and draw trails
    this.updateTrails(dt);
    this.drawTrails();
    
    // Draw mode indicator
    this.drawModeIndicator();
  }
  
  private detectEdges(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new ImageData(width, height);
    const outData = output.data;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Sobel edge detection
        const gx = 
          -data[((y-1)*width + (x-1))*4] + data[((y-1)*width + (x+1))*4] +
          -2*data[(y*width + (x-1))*4] + 2*data[(y*width + (x+1))*4] +
          -data[((y+1)*width + (x-1))*4] + data[((y+1)*width + (x+1))*4];
          
        const gy = 
          -data[((y-1)*width + (x-1))*4] - 2*data[((y-1)*width + x)*4] - data[((y-1)*width + (x+1))*4] +
          data[((y+1)*width + (x-1))*4] + 2*data[((y+1)*width + x)*4] + data[((y+1)*width + (x+1))*4];
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const edge = magnitude > this.edgeThreshold ? 255 : 0;
        
        outData[idx] = edge;
        outData[idx + 1] = edge;
        outData[idx + 2] = edge;
        outData[idx + 3] = 255;
      }
    }
    
    return output;
  }
  
  private thresholdSilhouette(imageData: ImageData, audio: AudioData): ImageData {
    const data = imageData.data;
    const output = new ImageData(imageData.width, imageData.height);
    const outData = output.data;
    
    // Dynamic threshold based on audio
    const threshold = 100 + audio.rms * 100;
    
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const value = gray < threshold ? 255 : 0;
      
      outData[i] = value;
      outData[i + 1] = value;
      outData[i + 2] = value;
      outData[i + 3] = 255;
    }
    
    return output;
  }
  
  private motionDifference(imageData: ImageData): ImageData {
    const output = new ImageData(imageData.width, imageData.height);
    
    if (!this.previousFrame) {
      return output;
    }
    
    const current = imageData.data;
    const previous = this.previousFrame.data;
    const outData = output.data;
    
    for (let i = 0; i < current.length; i += 4) {
      // Calculate difference
      const diff = Math.abs(current[i] - previous[i]) +
                   Math.abs(current[i + 1] - previous[i + 1]) +
                   Math.abs(current[i + 2] - previous[i + 2]);
      
      const value = diff > 50 ? 255 : 0;
      
      outData[i] = value;
      outData[i + 1] = value;
      outData[i + 2] = value;
      outData[i + 3] = 255;
    }
    
    return output;
  }
  
  private glowingSilhouette(imageData: ImageData, audio: AudioData): ImageData {
    const data = imageData.data;
    const output = new ImageData(imageData.width, imageData.height);
    const outData = output.data;
    
    // Invert and enhance
    const boost = 1.5 + audio.mid * 0.5;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const inverted = 255 - gray;
      const boosted = Math.min(255, inverted * boost);
      
      outData[i] = boosted;
      outData[i + 1] = boosted;
      outData[i + 2] = boosted;
      outData[i + 3] = 255;
    }
    
    return output;
  }
  
  private drawRainbowSilhouette(imageData: ImageData, audio: AudioData): void {
    const { width, height } = this.context;
    const data = imageData.data;
    const scaleX = width / imageData.width;
    const scaleY = height / imageData.height;
    
    const baseHue = (this.time * this.rainbowSpeed * 100) % 360;
    const pixelSize = 3 + (audio.beat ? 2 : 0);
    
    // Sample pixels and create rainbow effect
    for (let y = 0; y < imageData.height; y += 2) {
      for (let x = 0; x < imageData.width; x += 2) {
        const idx = (y * imageData.width + x) * 4;
        const brightness = data[idx];
        
        if (brightness > 128) {
          const screenX = x * scaleX;
          const screenY = y * scaleY;
          
          // Rainbow hue based on position and time
          const hue = (baseHue + x * 0.5 + y * 0.5) % 360;
          const color = hslToHex(hue, 90, 60);
          
          // Draw pixel with glow
          this.graphics.beginFill(color, 0.8);
          this.graphics.drawCircle(screenX, screenY, pixelSize);
          this.graphics.endFill();
          
          // Add to trails
          if (Math.random() < 0.1) {
            this.trailSprites.push({
              x: screenX,
              y: screenY,
              age: 0,
              hue: hue,
              size: pixelSize * (1 + Math.random())
            });
          }
        }
      }
    }
  }
  
  private updateTrails(dt: number): void {
    // Update trail ages and remove old ones
    for (let i = this.trailSprites.length - 1; i >= 0; i--) {
      this.trailSprites[i].age += dt;
      
      // Remove old trails
      if (this.trailSprites[i].age > 2) {
        this.trailSprites.splice(i, 1);
      }
    }
    
    // Limit number of trails
    while (this.trailSprites.length > this.maxTrails) {
      this.trailSprites.shift();
    }
  }
  
  private drawTrails(): void {
    // Draw trails with fading rainbow colors
    for (const trail of this.trailSprites) {
      const alpha = Math.max(0, 1 - trail.age / 2);
      const color = hslToHex(trail.hue, 90, 60);
      
      this.graphics.beginFill(color, alpha * 0.6);
      this.graphics.drawCircle(trail.x, trail.y, trail.size);
      this.graphics.endFill();
    }
  }
  
  private drawModeIndicator(): void {
    const modes = ['Edges', 'Threshold', 'Motion', 'Glow'];
    const baseHue = (this.time * 60) % 360;
    
    // Draw mode dots
    for (let i = 0; i < modes.length; i++) {
      const alpha = i === this.silhouetteMode ? 0.9 : 0.3;
      const color = hslToHex((baseHue + i * 30) % 360, 80, 60);
      
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(30 + i * 25, 30, 7);
      this.graphics.endFill();
    }
    
    // Draw current mode name
    const modeText = modes[this.silhouetteMode];
    this.graphics.lineStyle(2, hslToHex(baseHue, 80, 60), 0.8);
    this.graphics.moveTo(20, 50);
    this.graphics.lineTo(20 + modeText.length * 8, 50);
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

