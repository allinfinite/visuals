import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface ImageState {
  sprite: Sprite;
  texture: Texture;
  startTime: number;
  duration: number;
  startScale: number;
  endScale: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  prompt: string;
}

export class AIKenBurns implements Pattern {
  public name = 'AI Ken Burns';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private images: ImageState[] = [];
  private isGenerating: boolean = false;
  private generationQueue: string[] = [];
  private apiKey: string = '';
  
  // Ken Burns parameters
  private imageDuration: number = 15; // seconds per image
  private transitionDuration: number = 2; // fade transition time
  private maxImages: number = 3; // Keep 3 images in rotation
  
  // Trippy prompts for generation
  private prompts: string[] = [
    'psychedelic fractal mandala with vibrant colors and infinite recursion',
    'abstract liquid chrome flowing through kaleidoscopic space',
    'bioluminescent alien garden with glowing sacred geometry',
    'cosmic nebula made of crystalline structures and light beams',
    'hypnotic spiral of rainbow fractals dissolving into infinity',
    'ethereal dreamscape with floating geometric islands',
    'prismatic light refracting through impossible architecture',
    'surreal underwater scene with glowing jellyfish and fractals',
    'digital consciousness visualized as flowing data streams',
    'mystical forest where trees are made of light and energy',
  ];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Get API key from environment
    this.apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('AIKenBurns: No OpenAI API key found. Set VITE_OPENAI_API_KEY in .env');
    } else {
      console.log('AIKenBurns: OpenAI API key loaded');
    }
    
    // Load fallback image immediately for instant display
    this.loadFallbackImage();
    
    // Queue first AI generation
    if (this.apiKey) {
      this.queueImageGeneration();
    }
  }

  private loadFallbackImage(): void {
    // Generate a procedural trippy pattern as fallback
    this.generateProceduralImage();
  }

  private generateProceduralImage(): void {
    // Create a canvas with procedural trippy pattern
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Draw psychedelic fractal pattern
    const centerX = 512;
    const centerY = 512;
    
    // Radial gradient background
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 512);
    gradient.addColorStop(0, '#ff0080');
    gradient.addColorStop(0.3, '#8000ff');
    gradient.addColorStop(0.6, '#00ffff');
    gradient.addColorStop(1, '#000033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Draw multiple rotating mandala layers
    for (let layer = 0; layer < 6; layer++) {
      const radius = 50 + layer * 80;
      const segments = 12;
      const hue = (layer * 60) % 360;
      
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + layer * 0.5;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        
        // Draw petal shapes
        const petalSize = 40 + layer * 10;
        ctx.beginPath();
        ctx.ellipse(radius, 0, petalSize, petalSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.6)`;
        ctx.fill();
        
        // Inner glow
        ctx.beginPath();
        ctx.ellipse(radius, 0, petalSize * 0.5, petalSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(hue + 180) % 360}, 90%, 80%, 0.8)`;
        ctx.fill();
        
        ctx.restore();
      }
    }
    
    // Add sparkle overlay
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = Math.random() * 3 + 1;
      const alpha = Math.random() * 0.8;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
    
    // Convert canvas to texture and load as first image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        this.loadImageFromUrl(url, 'Procedural Mandala Pattern').then(() => {
          URL.revokeObjectURL(url);
        });
      }
    });
  }

  private queueImageGeneration(): void {
    if (this.isGenerating || this.images.length >= this.maxImages) return;
    
    // Pick a random prompt
    const prompt = this.prompts[Math.floor(Math.random() * this.prompts.length)];
    this.generationQueue.push(prompt);
    
    if (!this.isGenerating) {
      this.generateNextImage();
    }
  }

  private async generateNextImage(): Promise<void> {
    if (this.generationQueue.length === 0 || !this.apiKey) {
      this.isGenerating = false;
      return;
    }
    
    this.isGenerating = true;
    const prompt = this.generationQueue.shift()!;
    
    try {
      console.log(`AIKenBurns: Generating image with prompt: "${prompt}"`);
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0].url;
      
      console.log('AIKenBurns: Image generated, loading...');
      await this.loadImageFromUrl(imageUrl, prompt);
      
    } catch (error) {
      console.error('AIKenBurns: Failed to generate image:', error);
    } finally {
      this.isGenerating = false;
      
      // Generate next if queue has more
      if (this.generationQueue.length > 0) {
        this.generateNextImage();
      }
    }
  }

  private async loadImageFromUrl(url: string, prompt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const texture = Texture.from(img);
        const sprite = new Sprite(texture);
        
        // Fit image to screen (cover mode)
        const screenAspect = this.context.width / this.context.height;
        const imageAspect = img.width / img.height;
        
        if (screenAspect > imageAspect) {
          // Screen is wider
          sprite.width = this.context.width;
          sprite.height = this.context.width / imageAspect;
        } else {
          // Screen is taller
          sprite.height = this.context.height;
          sprite.width = this.context.height * imageAspect;
        }
        
        // Center image
        sprite.anchor.set(0.5, 0.5);
        
        // Random Ken Burns parameters
        const zoomDirection = Math.random() > 0.5 ? 1 : -1; // zoom in or out
        const startScale = zoomDirection > 0 ? 1.0 : 1.2;
        const endScale = zoomDirection > 0 ? 1.2 : 1.0;
        
        // Random pan direction
        const panX = (Math.random() - 0.5) * 0.1; // -5% to +5%
        const panY = (Math.random() - 0.5) * 0.1;
        
        const imageState: ImageState = {
          sprite,
          texture,
          startTime: this.time,
          duration: this.imageDuration,
          startScale,
          endScale,
          startX: this.context.width / 2 - panX * this.context.width,
          startY: this.context.height / 2 - panY * this.context.height,
          endX: this.context.width / 2 + panX * this.context.width,
          endY: this.context.height / 2 + panY * this.context.height,
          prompt,
        };
        
        sprite.alpha = 0;
        this.container.addChild(sprite);
        this.images.push(imageState);
        
        console.log(`AIKenBurns: Image loaded (${this.images.length}/${this.maxImages})`);
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Click to generate new image
    if (input.clicks.length > 0 && this.apiKey) {
      this.queueImageGeneration();
    }
    
    // Update images with Ken Burns effect
    this.images.forEach((img) => {
      const age = this.time - img.startTime;
      const progress = Math.min(1, age / img.duration);
      
      // Smooth easing (ease-in-out)
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Apply Ken Burns effect
      const scale = img.startScale + (img.endScale - img.startScale) * eased;
      img.sprite.scale.set(scale, scale);
      
      img.sprite.x = img.startX + (img.endX - img.startX) * eased;
      img.sprite.y = img.startY + (img.endY - img.startY) * eased;
      
      // Fade in/out transitions
      const fadeIn = Math.min(1, age / this.transitionDuration);
      const fadeOut = age > (img.duration - this.transitionDuration)
        ? 1 - (age - (img.duration - this.transitionDuration)) / this.transitionDuration
        : 1;
      
      img.sprite.alpha = Math.min(fadeIn, fadeOut) * 0.4; // Keep subtle in background
      
      // Audio reactivity - subtle brightness pulse
      const brightness = 1 + audio.rms * 0.2;
      img.sprite.tint = this.rgbToHex(brightness, brightness, brightness);
    });
    
    // Remove expired images
    this.images = this.images.filter(img => {
      const age = this.time - img.startTime;
      if (age > img.duration) {
        this.container.removeChild(img.sprite);
        img.texture.destroy(true);
        img.sprite.destroy();
        return false;
      }
      return true;
    });
    
    // Queue new images to maintain rotation
    if (this.images.length < this.maxImages && this.apiKey && !this.isGenerating) {
      this.queueImageGeneration();
    }
    
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    
    // Draw status indicator
    if (this.apiKey) {
      // Background
      this.graphics.beginFill(0x000000, 0.6);
      this.graphics.drawRoundedRect(10, 10, 120, 30, 5);
      this.graphics.endFill();
      
      // Indicator dot
      const dotColor = this.isGenerating ? 0xffaa00 : 0x00ff88;
      this.graphics.beginFill(dotColor, 0.8);
      this.graphics.drawCircle(25, 25, 5);
      this.graphics.endFill();
      
      // Text would go here but we'll just use dots for simplicity
      // Show image count as dots
      for (let i = 0; i < this.maxImages; i++) {
        const filled = i < this.images.length;
        this.graphics.beginFill(0xffffff, filled ? 0.8 : 0.2);
        this.graphics.drawCircle(50 + i * 20, 25, 4);
        this.graphics.endFill();
      }
    } else {
      // No API key warning
      this.graphics.beginFill(0xff0000, 0.6);
      this.graphics.drawRoundedRect(10, 10, 150, 30, 5);
      this.graphics.endFill();
      
      this.graphics.beginFill(0xffffff, 0.9);
      this.graphics.drawCircle(25, 25, 5);
      this.graphics.endFill();
    }
  }

  private rgbToHex(r: number, g: number, b: number): number {
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
    return ((r * 255) << 16) | ((g * 255) << 8) | (b * 255);
  }

  public destroy(): void {
    // Clean up all images
    this.images.forEach(img => {
      this.container.removeChild(img.sprite);
      img.texture.destroy(true);
      img.sprite.destroy();
    });
    this.images = [];
    
    this.graphics.destroy();
    this.container.destroy();
  }
}

