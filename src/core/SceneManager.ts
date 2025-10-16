import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { Container, Graphics } from 'pixi.js';

interface ActiveLayer {
  pattern: Pattern;
  lifetime: number; // How long this layer has been active
  fadeInProgress: number; // 0 to 1
  fadeOutProgress: number; // 0 to 1, starts when layer is being removed
  isRemoving: boolean;
}

export class SceneManager {
  private patterns: Pattern[] = [];
  private container: Container;
  private fadeGraphics: Graphics;
  
  // Multi-layer composition system
  private activeLayers: ActiveLayer[] = [];
  private patternPool: Set<number> = new Set(); // Indices of patterns available for mixing
  private timeSinceLastSpawn: number = 0;
  
  // Settings
  public compositionEnabled: boolean = false;
  public maxLayers: number = 2; // Reduced from 3 for performance
  public layerDuration: number = 15; // seconds
  public spawnInterval: number = 8; // seconds between new patterns (increased for performance)
  public fadeInDuration: number = 2; // seconds
  public fadeOutDuration: number = 3; // seconds

  constructor(context: RendererContext) {
    this.container = new Container();
    this.fadeGraphics = new Graphics();
    context.app.stage.addChild(this.fadeGraphics);
    context.app.stage.addChild(this.container);
  }

  public getFadeGraphics(): Graphics {
    return this.fadeGraphics;
  }

  public addPattern(pattern: Pattern): void {
    const index = this.patterns.length;
    this.patterns.push(pattern);
    pattern.container.visible = false;
    pattern.container.alpha = 0;
    this.container.addChild(pattern.container);
    
    // Add to pool by default
    this.patternPool.add(index);
  }

  public setActivePattern(index: number): void {
    if (index < 0 || index >= this.patterns.length) return;

    if (!this.compositionEnabled) {
      // Legacy single-pattern mode
      this.patterns.forEach(p => {
        p.container.visible = false;
        p.container.alpha = 1;
      });
      this.patterns[index].container.visible = true;
    }
  }

  public togglePatternInPool(index: number, enabled: boolean): void {
    if (enabled) {
      this.patternPool.add(index);
    } else {
      this.patternPool.delete(index);
    }
  }

  public isPatternInPool(index: number): boolean {
    return this.patternPool.has(index);
  }

  public getAllPatterns(): Pattern[] {
    return this.patterns;
  }

  public getActiveLayerCount(): number {
    return this.activeLayers.length;
  }

  public getActiveLayerNames(): string[] {
    return this.activeLayers.map(layer => layer.pattern.name);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    if (this.compositionEnabled) {
      this.updateCompositionMode(dt, audio, input);
    } else {
      // Legacy single-pattern mode
      const visiblePattern = this.patterns.find(p => p.container.visible);
      if (visiblePattern) {
        visiblePattern.update(dt, audio, input);
      }
    }
  }

  private updateCompositionMode(dt: number, audio: AudioData, input: InputState): void {
    this.timeSinceLastSpawn += dt;

    // Update existing layers - ALL layers receive the same input
    this.activeLayers.forEach(layer => {
      layer.lifetime += dt;

      // Fade in
      if (layer.fadeInProgress < 1) {
        layer.fadeInProgress += dt / this.fadeInDuration;
        layer.fadeInProgress = Math.min(1, layer.fadeInProgress);
        // Keep full alpha during fade for better interactivity visibility
        const fadeAlpha = layer.fadeInProgress;
        layer.pattern.container.alpha = fadeAlpha;
      }

      // Check if layer should start fading out
      if (!layer.isRemoving && layer.lifetime >= this.layerDuration) {
        layer.isRemoving = true;
      }

      // Fade out
      if (layer.isRemoving) {
        layer.fadeOutProgress += dt / this.fadeOutDuration;
        layer.pattern.container.alpha = Math.max(0, 1 - layer.fadeOutProgress);
      }

      // IMPORTANT: All active layers receive mouse/click input simultaneously
      // This ensures user interactions affect all visible patterns
      layer.pattern.update(dt, audio, input);
    });

    // Remove fully faded layers
    this.activeLayers = this.activeLayers.filter(layer => {
      if (layer.isRemoving && layer.fadeOutProgress >= 1) {
        layer.pattern.container.visible = false;
        layer.pattern.container.alpha = 0;
        return false;
      }
      return true;
    });

    // Spawn new layers
    if (this.timeSinceLastSpawn >= this.spawnInterval && 
        this.activeLayers.length < this.maxLayers &&
        this.patternPool.size > 0) {
      this.spawnRandomLayer();
      this.timeSinceLastSpawn = 0;
    }

    // Ensure we have at least one layer if pool is not empty
    if (this.activeLayers.length === 0 && this.patternPool.size > 0) {
      this.spawnRandomLayer();
    }
  }

  private spawnRandomLayer(): void {
    const availableIndices = Array.from(this.patternPool);
    const activeIndices = new Set(this.activeLayers.map(l => this.patterns.indexOf(l.pattern)));
    
    // Filter out already active patterns
    const spawnableIndices = availableIndices.filter(i => !activeIndices.has(i));
    
    if (spawnableIndices.length === 0) return;

    const randomIndex = spawnableIndices[Math.floor(Math.random() * spawnableIndices.length)];
    const pattern = this.patterns[randomIndex];

    pattern.container.visible = true;
    pattern.container.alpha = 0;

    this.activeLayers.push({
      pattern,
      lifetime: 0,
      fadeInProgress: 0,
      fadeOutProgress: 0,
      isRemoving: false,
    });
  }

  public enableCompositionMode(): void {
    // Hide all patterns and reset
    this.patterns.forEach(p => {
      p.container.visible = false;
      p.container.alpha = 0;
    });
    this.activeLayers = [];
    this.timeSinceLastSpawn = 0;
    this.compositionEnabled = true;
  }

  public disableCompositionMode(): void {
    // Clean up active layers
    this.activeLayers.forEach(layer => {
      layer.pattern.container.visible = false;
      layer.pattern.container.alpha = 1;
    });
    this.activeLayers = [];
    this.compositionEnabled = false;
    
    // Show first pattern
    if (this.patterns.length > 0) {
      this.patterns[0].container.visible = true;
    }
  }

  public destroy(): void {
    this.patterns.forEach(pattern => pattern.destroy());
    this.patterns = [];
    this.container.destroy();
  }
}

