import { Application } from 'pixi.js';
import type { RendererContext } from '../types';

export class Renderer {
  public app: Application;
  public context: RendererContext;

  constructor(canvas: HTMLCanvasElement) {
    // Cap device pixel ratio for performance
    const dpr = Math.min(window.devicePixelRatio, 1.5);

    // PixiJS v7 uses synchronous constructor
    this.app = new Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: dpr,
      autoDensity: true,
      backgroundColor: 0x000000,
      antialias: true,
      powerPreference: 'high-performance', // Request high performance GPU
    });

    this.context = {
      app: this.app,
      width: window.innerWidth,
      height: window.innerHeight,
    };

    console.log('PixiJS initialized');
    this.setupResize();
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.context.width = window.innerWidth;
      this.context.height = window.innerHeight;
    });
  }

  public getContext(): RendererContext {
    return this.context;
  }
}

