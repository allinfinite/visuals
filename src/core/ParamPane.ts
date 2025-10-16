import { Pane } from 'tweakpane';
import type { SceneManager } from './SceneManager';
import type { Audio } from './Audio';
import type { App } from './App';

export class ParamPane {
  private pane: any; // Using any to handle Tweakpane v4 API differences
  private sceneManager: SceneManager;
  private audio: Audio;
  private app: App;

  public params = {
    pattern: 0,
    queuePattern: 0, // For queuing specific patterns in multi-layer mode
    enableAudio: false,
    audioSensitivity: 100, // 0-200, 100 = normal
    feedbackEnabled: true,
    trailLength: 30, // 1-100, inverse of clearAlpha (increased default for smoother look)
    showFPS: true,
    
    // Composition mode
    compositionMode: false,
    maxLayers: 2, // Reduced from 3 for performance
    layerDuration: 15,
    spawnInterval: 8, // Increased from 5 for performance
    
    // Active layer info (read-only, updated dynamically)
    activeLayerCount: 0,
    activeLayerInfo: 'None',
  };

  constructor(sceneManager: SceneManager, audio: Audio, app: App) {
    this.sceneManager = sceneManager;
    this.audio = audio;
    this.app = app;
    this.pane = new Pane({
      title: 'Visual Canvas',
      expanded: true,
    });

    this.setupUI();
  }

  private setupUI(): void {
    // Composition Mode
    const compositionFolder = this.pane.addFolder({
      title: 'Composition Mode',
      expanded: true,
    });

    compositionFolder.addBinding(this.params, 'compositionMode', {
      label: 'Enable Multi-Layer',
    }).on('change', (ev: any) => {
      if (ev.value) {
        this.sceneManager.enableCompositionMode();
      } else {
        this.sceneManager.disableCompositionMode();
      }
    });

    // Add info text about input handling
    compositionFolder.addBlade({
      view: 'text',
      label: 'Input Handling',
      value: '🖱️ All layers respond to mouse/clicks',
      parse: (v: string) => v,
      format: (v: string) => v,
    } as any);

    // Add active layer count monitor
    compositionFolder.addBinding(this.params, 'activeLayerCount', {
      label: 'Active Layers',
      readonly: true,
    });

    // Add active layer names monitor
    compositionFolder.addBinding(this.params, 'activeLayerInfo', {
      label: 'Current Patterns',
      readonly: true,
      multiline: true,
    });

    compositionFolder.addBinding(this.params, 'maxLayers', {
      label: 'Max Layers',
      min: 1,
      max: 3, // Reduced from 5 for performance
      step: 1,
    }).on('change', (ev: any) => {
      this.sceneManager.maxLayers = ev.value;
    });

    compositionFolder.addBinding(this.params, 'layerDuration', {
      label: 'Layer Duration (s)',
      min: 5,
      max: 60,
      step: 1,
    }).on('change', (ev: any) => {
      this.sceneManager.layerDuration = ev.value;
    });

    compositionFolder.addBinding(this.params, 'spawnInterval', {
      label: 'Spawn Interval (s)',
      min: 2,
      max: 30,
      step: 1,
    }).on('change', (ev: any) => {
      this.sceneManager.spawnInterval = ev.value;
    });

    // Pattern selector (for single pattern mode)
    const patternFolder = this.pane.addFolder({
      title: 'Single Pattern Mode',
      expanded: false,
    });

    const patterns = this.sceneManager.getAllPatterns();
    const patternNames: { [key: string]: number } = {};
    patterns.forEach((pattern, index) => {
      patternNames[pattern.name] = index;
    });

    patternFolder
      .addBinding(this.params, 'pattern', {
        label: 'Pattern',
        options: patternNames,
      })
      .on('change', (ev: any) => {
        this.sceneManager.setActivePattern(ev.value);
      });

    // Queue specific pattern (for multi-layer mode)
    const queueFolder = this.pane.addFolder({
      title: '➕ Queue Specific Pattern',
      expanded: false,
    });

    queueFolder.addBinding(this.params, 'queuePattern', {
      label: 'Select & Queue',
      options: patternNames,
    }).on('change', (ev: any) => {
      const success = this.sceneManager.queueSpecificPattern(ev.value);
      if (success) {
        console.log(`✅ Queued: ${patterns[ev.value].name}`);
      }
    });

    // Add info text
    const queueInfo = queueFolder.addBlade({
      view: 'text',
      label: 'Info',
      value: 'Only works in Multi-Layer mode',
      parse: (v: string) => String(v),
      format: (v: string) => String(v),
    });
    (queueInfo as any).disabled = true;

    // Pattern pool selector
    const poolFolder = this.pane.addFolder({
      title: 'Pattern Pool (Multi-Layer)',
      expanded: true,
    });

    patterns.forEach((pattern, index) => {
      const enabled = this.sceneManager.isPatternInPool(index);
      const param = { enabled };
      
      poolFolder.addBinding(param, 'enabled', {
        label: pattern.name,
      }).on('change', (ev: any) => {
        this.sceneManager.togglePatternInPool(index, ev.value);
      });
    });

    // Audio controls
    const audioFolder = this.pane.addFolder({
      title: 'Audio',
      expanded: false,
    });

    audioFolder.addBinding(this.params, 'enableAudio', {
      label: 'Enable Microphone',
    }).on('change', (ev: any) => {
      if (ev.value) {
        this.audio.connectMicrophone();
      }
    });

    audioFolder.addBinding(this.params, 'audioSensitivity', {
      label: 'Audio Sensitivity',
      min: 0,
      max: 200,
      step: 10,
    });

    // Display settings
    const displayFolder = this.pane.addFolder({
      title: 'Display',
      expanded: true,
    });

    displayFolder.addBinding(this.params, 'feedbackEnabled', {
      label: 'Enable Trails',
    }).on('change', (ev: any) => {
      this.app.feedbackEnabled = ev.value;
    });

    displayFolder.addBinding(this.params, 'trailLength', {
      label: 'Trail Length',
      min: 1,
      max: 100,
      step: 1,
    }).on('change', (ev: any) => {
      // Convert 1-100 to alpha (inverse relationship)
      // Higher trail length = lower alpha = longer trails
      // Adjusted for smoother motion blur effect
      this.app.feedbackAlpha = 0.01 + (1 - ev.value / 100) * 0.19;
    });

    displayFolder.addBinding(this.params, 'showFPS', {
      label: 'Show FPS',
    });
  }

  public addPatternParams(name: string, params: any): void {
    const folder = this.pane.addFolder({
      title: name,
      expanded: true,
    });

    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (typeof value === 'number') {
        folder.addBinding(params, key);
      } else if (typeof value === 'boolean') {
        folder.addBinding(params, key);
      } else if (typeof value === 'string') {
        folder.addBinding(params, key);
      }
    });
  }

  public update(): void {
    // Update active layer information
    if (this.params.compositionMode) {
      this.params.activeLayerCount = this.sceneManager.getActiveLayerCount();
      const names = this.sceneManager.getActiveLayerNames();
      this.params.activeLayerInfo = names.length > 0 ? names.join('\n') : 'None';
    } else {
      this.params.activeLayerCount = 0;
      this.params.activeLayerInfo = 'Single pattern mode';
    }
    this.pane.refresh();
  }

  public destroy(): void {
    this.pane.dispose();
  }
}

