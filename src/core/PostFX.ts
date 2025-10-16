import { Container, RenderTexture, Sprite, Graphics, Texture, BlurFilter, ColorMatrixFilter } from 'pixi.js';
import type { RendererContext } from '../types';

export class PostFX {
  private context: RendererContext;
  private feedbackTexture: RenderTexture | null = null;
  private feedbackSprite: Sprite | null = null;
  private tempContainer: Container;
  private grainSprite: Sprite | null = null;
  private vignetteGraphics: Graphics | null = null;

  public params = {
    feedbackAlpha: 0.95,
    feedbackScale: 1.002,
    bloomThreshold: 0.8,
    bloomIntensity: 0.3,
    
    // Analog look parameters
    analogEnabled: true,
    filmGrainIntensity: 0.12,
    warmth: 1.08,
    desaturation: 0.15,
    softness: 1.0,
    vignetteStrength: 0.25,
  };

  constructor(context: RendererContext) {
    this.context = context;
    this.tempContainer = new Container();
  }

  public init(): void {
    // Create feedback render texture
    this.feedbackTexture = RenderTexture.create({
      width: this.context.width,
      height: this.context.height,
    });

    this.feedbackSprite = new Sprite(this.feedbackTexture);
    this.feedbackSprite.anchor.set(0.5);
    this.feedbackSprite.x = this.context.width / 2;
    this.feedbackSprite.y = this.context.height / 2;
  }

  public applyFeedback(source: Container): void {
    if (!this.feedbackTexture || !this.feedbackSprite) {
      this.init();
    }

    if (!this.feedbackTexture || !this.feedbackSprite) return;

    // Render previous frame with fade
    this.feedbackSprite.alpha = this.params.feedbackAlpha;
    this.feedbackSprite.scale.set(this.params.feedbackScale);

    // Render to texture (PixiJS v7 API)
    this.context.app.renderer.render(this.feedbackSprite, { renderTexture: this.feedbackTexture });

    // Render current frame on top
    this.context.app.renderer.render(source, { 
      renderTexture: this.feedbackTexture,
      clear: false 
    });

    // Update sprite
    this.feedbackSprite.texture = this.feedbackTexture;
    this.feedbackSprite.scale.set(1);
  }

  public clear(): void {
    if (!this.feedbackTexture) return;
    this.context.app.renderer.render(new Container(), { 
      renderTexture: this.feedbackTexture,
      clear: true 
    });
  }

  public resize(width: number, height: number): void {
    this.feedbackTexture?.destroy();
    this.feedbackTexture = RenderTexture.create({ width, height });
    if (this.feedbackSprite) {
      this.feedbackSprite.texture = this.feedbackTexture;
      this.feedbackSprite.x = width / 2;
      this.feedbackSprite.y = height / 2;
    }
  }

  public createFilmGrain(): void {
    if (this.grainSprite) return;
    
    // Create noise texture for film grain
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = this.context.width;
    grainCanvas.height = this.context.height;
    const ctx = grainCanvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(grainCanvas.width, grainCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = Math.random() * 80;
      imageData.data[i] = gray;
      imageData.data[i + 1] = gray;
      imageData.data[i + 2] = gray;
      imageData.data[i + 3] = 40; // Subtle alpha
    }
    ctx.putImageData(imageData, 0, 0);
    
    const grainTexture = Texture.from(grainCanvas);
    this.grainSprite = new Sprite(grainTexture);
    this.grainSprite.alpha = this.params.filmGrainIntensity;
    this.grainSprite.blendMode = 'overlay' as any;
  }

  public createVignette(): void {
    if (this.vignetteGraphics) return;
    
    this.vignetteGraphics = new Graphics();
    const cx = this.context.width / 2;
    const cy = this.context.height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    
    // Create radial gradient effect with multiple circles
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const radius = maxRadius * (0.3 + progress * 0.7);
      const alpha = Math.pow(progress, 2) * this.params.vignetteStrength;
      
      this.vignetteGraphics.beginFill(0x000000, alpha);
      this.vignetteGraphics.drawCircle(cx, cy, radius);
      this.vignetteGraphics.endFill();
    }
  }

  public applyAnalogLook(container: Container): void {
    if (!this.params.analogEnabled) return;
    
    const filters: any[] = [];
    
    // 1. Subtle blur for softness
    if (this.params.softness > 0) {
      const blurFilter = new BlurFilter(this.params.softness, 3);
      filters.push(blurFilter);
    }
    
    // 2. Color grading - warm, slightly desaturated analog look
    const colorMatrix = new ColorMatrixFilter();
    
    // Desaturate slightly
    colorMatrix.saturate(1 - this.params.desaturation, false);
    
    // Warm tone (shift towards orange/red)
    const warmMatrix: [number, ...number[]] = [
      this.params.warmth, 0, 0, 0, 8,    // Red channel (warmer)
      0, 1, 0, 0, 4,                      // Green channel  
      0, 0, 0.94, 0, -5,                  // Blue channel (less blue)
      0, 0, 0, 1, 0, 0, 0, 0, 0, 0        // Complete 20-element matrix
    ];
    
    // Apply custom matrix
    colorMatrix.matrix = warmMatrix;
    filters.push(colorMatrix);
    
    // Apply filters to container
    if (filters.length > 0) {
      container.filters = filters;
    }
    
    // Add film grain overlay
    if (this.grainSprite && this.params.filmGrainIntensity > 0) {
      if (!this.grainSprite.parent) {
        container.addChild(this.grainSprite);
      }
      this.grainSprite.alpha = this.params.filmGrainIntensity;
    }
    
    // Add vignette overlay
    if (this.vignetteGraphics && this.params.vignetteStrength > 0) {
      if (!this.vignetteGraphics.parent) {
        container.addChild(this.vignetteGraphics);
      }
    }
  }

  public regenerateGrain(): void {
    // Regenerate grain for animated film grain effect
    if (!this.grainSprite) return;
    
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = this.context.width;
    grainCanvas.height = this.context.height;
    const ctx = grainCanvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(grainCanvas.width, grainCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = Math.random() * 80;
      imageData.data[i] = gray;
      imageData.data[i + 1] = gray;
      imageData.data[i + 2] = gray;
      imageData.data[i + 3] = 40;
    }
    ctx.putImageData(imageData, 0, 0);
    
    // Update texture
    const newTexture = Texture.from(grainCanvas);
    this.grainSprite.texture?.destroy();
    this.grainSprite.texture = newTexture;
  }

  public destroy(): void {
    this.feedbackTexture?.destroy();
    this.feedbackSprite?.destroy();
    this.grainSprite?.texture?.destroy();
    this.grainSprite?.destroy();
    this.vignetteGraphics?.destroy();
    this.tempContainer.destroy();
  }
}

