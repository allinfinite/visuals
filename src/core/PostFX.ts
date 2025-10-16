import { Container, RenderTexture, Sprite } from 'pixi.js';
import type { RendererContext } from '../types';

export class PostFX {
  private context: RendererContext;
  private feedbackTexture: RenderTexture | null = null;
  private feedbackSprite: Sprite | null = null;
  private tempContainer: Container;

  public params = {
    feedbackAlpha: 0.95,
    feedbackScale: 1.002,
    bloomThreshold: 0.8,
    bloomIntensity: 0.3,
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

  public destroy(): void {
    this.feedbackTexture?.destroy();
    this.feedbackSprite?.destroy();
    this.tempContainer.destroy();
  }
}

