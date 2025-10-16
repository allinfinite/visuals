import { Renderer } from './Renderer';
import { Audio } from './Audio';
import { Input } from './Input';
import { Clock } from './Clock';
import { SceneManager } from './SceneManager';
import { PostFX } from './PostFX';

export class App {
  private renderer: Renderer;
  private audio: Audio;
  private input: Input;
  private clock: Clock;
  private sceneManager: SceneManager;
  private postFX: PostFX;
  private isRunning: boolean = false;
  
  // Feedback settings
  public feedbackEnabled: boolean = true;
  public feedbackAlpha: number = 0.08; // Lower = longer trails, acts as motion blur

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.audio = new Audio();
    this.input = new Input(canvas);
    this.clock = new Clock();
    this.sceneManager = new SceneManager(this.renderer.getContext());
    this.postFX = new PostFX(this.renderer.getContext());
  }

  public async init(): Promise<void> {
    await this.audio.init();
    console.log('App initialized');
  }

  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  public getAudio(): Audio {
    return this.audio;
  }

  public getInput(): Input {
    return this.input;
  }

  public getClock(): Clock {
    return this.clock;
  }

  public getRenderer(): Renderer {
    return this.renderer;
  }

  public getPostFX(): PostFX {
    return this.postFX;
  }

  public start(): void {
    this.isRunning = true;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    // Update
    const dt = this.clock.update();
    this.audio.update();
    this.input.update();
    
    // Apply feedback fade (trails effect)
    if (this.feedbackEnabled) {
      const stage = this.renderer.app.stage;
      this.renderer.app.renderer.render(stage);
      
      // Draw semi-transparent black rectangle for fade
      const fadeGraphics = this.sceneManager.getFadeGraphics();
      fadeGraphics.clear();
      fadeGraphics.beginFill(0x000000, this.feedbackAlpha);
      fadeGraphics.drawRect(0, 0, this.renderer.context.width, this.renderer.context.height);
      fadeGraphics.endFill();
    }
    
    this.sceneManager.update(dt, this.audio.data, this.input.state);

    // Render happens automatically via PixiJS ticker

    requestAnimationFrame(this.loop);
  };
}

