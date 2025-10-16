import { Container, RenderTexture, Sprite, Graphics, Texture, BLEND_MODES } from 'pixi.js';
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
    
    // Film effects parameters (grain & vignette overlays)
    analogEnabled: false, // Disabled by default, enable in UI
    filmGrainIntensity: 0.12,
    vignetteStrength: 0.5, // 0-1, multiplied by 0.15 internally for subtle effect
    
    // Note: Color grading filters (warmth, desaturation, blur) are disabled
    // because they break rendering when applied to the stage container
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
    this.grainSprite.blendMode = BLEND_MODES.SCREEN; // Screen blend for subtle film grain
  }

  public createVignette(): void {
    if (this.vignetteGraphics) return;
    
    this.vignetteGraphics = new Graphics();
    const cx = this.context.width / 2;
    const cy = this.context.height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy);
    
    // Create subtle radial gradient effect - only darken the far edges
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      // Start vignette at 70% of radius, only affect outer 30%
      const radius = maxRadius * (0.7 + progress * 0.3);
      // Very subtle alpha that increases towards edges (overall strength controlled by graphics.alpha)
      const alpha = Math.pow(progress, 3) * 0.15;
      
      this.vignetteGraphics.beginFill(0x000000, alpha);
      this.vignetteGraphics.drawCircle(cx, cy, radius);
      this.vignetteGraphics.endFill();
    }
  }

  public applyAnalogLook(container: Container): void {
    if (!this.params.analogEnabled) {
      // Remove filters and overlays when disabled
      container.filters = null;
      
      if (this.grainSprite && this.grainSprite.parent) {
        this.grainSprite.parent.removeChild(this.grainSprite);
      }
      
      if (this.vignetteGraphics && this.vignetteGraphics.parent) {
        this.vignetteGraphics.parent.removeChild(this.vignetteGraphics);
      }
      
      return;
    }
    
    // Don't apply filters to the main stage container - it breaks rendering
    // Instead, only add overlays (grain/vignette) without filters
    
    // Add film grain overlay
    if (this.grainSprite && this.params.filmGrainIntensity > 0) {
      if (!this.grainSprite.parent) {
        container.addChild(this.grainSprite);
      }
      this.grainSprite.alpha = this.params.filmGrainIntensity;
    }
    
    // Add vignette overlay with controllable strength
    if (this.vignetteGraphics && this.params.vignetteStrength > 0) {
      if (!this.vignetteGraphics.parent) {
        container.addChild(this.vignetteGraphics);
      }
      // Allow real-time adjustment of vignette intensity
      this.vignetteGraphics.alpha = Math.min(1, this.params.vignetteStrength);
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

