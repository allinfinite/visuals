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
    enableAudio: false,
    audioSensitivity: 100, // 0-200, 100 = normal
    feedbackEnabled: true,
    trailLength: 30, // 1-100, inverse of clearAlpha (increased default for smoother look)
    showFPS: true,
    
    // Composition mode
    compositionMode: true, // Enabled by default for dynamic visuals
    maxLayers: 2, // Reduced from 3 for performance
    layerDuration: 15,
    spawnInterval: 8, // Increased from 5 for performance
    
    // Active layer info (read-only, updated dynamically)
    activeLayerCount: 0,
    activeLayerInfo: 'None',
  };
  
  // Track queue positions for each pattern
  private queuePositions: { [key: number]: number[] } = {}; // Stores array of queue positions for each pattern
  private queueButtons: any[] = [];
  private globalQueuePosition: number = 0; // Global counter for queue positions
  private consumedPositions: number = 0; // Track how many positions have been consumed from the queue

  constructor(sceneManager: SceneManager, audio: Audio, app: App) {
    this.sceneManager = sceneManager;
    this.audio = audio;
    this.app = app;
    this.pane = new Pane({
      title: '',
      expanded: false,
    });

    this.setupUI();
    
    // Enable composition mode if it's set to true by default
    if (this.params.compositionMode) {
      this.sceneManager.enableCompositionMode();
    }
  }

  private setupUI(): void {
    // Composition Mode
    const compositionFolder = this.pane.addFolder({
      title: 'Composition Mode',
      expanded: false,
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
    
    // Create sorted pattern list with original indices
    const sortedPatterns = patterns
      .map((pattern, index) => ({ pattern, index }))
      .sort((a, b) => a.pattern.name.localeCompare(b.pattern.name));
    
    const patternNames: { [key: string]: number } = {};
    sortedPatterns.forEach(({ pattern, index }) => {
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

    // Queue specific pattern (for multi-layer mode) - Clickable list
    const queueFolder = this.pane.addFolder({
      title: '➕ Click to Queue Patterns',
      expanded: false,
    });

    // Add info text
    queueFolder.addBlade({
      view: 'text',
      label: 'Info',
      value: 'Click patterns to add to queue. Numbers show queue position.',
      parse: (v: string) => String(v),
      format: (v: string) => String(v),
    } as any);

    // Create clickable buttons for each pattern (sorted alphabetically)
    sortedPatterns.forEach(({ pattern, index }) => {
      // Initialize queue positions array
      this.queuePositions[index] = [];
      
      const buttonParam = { 
        action: () => {
          const success = this.sceneManager.queueSpecificPattern(index);
          if (success) {
            this.globalQueuePosition++;
            this.queuePositions[index].push(this.globalQueuePosition);
            console.log(`✅ Queued: ${pattern.name} at position ${this.globalQueuePosition}`);
            this.updateQueueButtons();
          }
        }
      };
      
      const button = queueFolder.addButton({
        title: `${pattern.name}`,
        label: '',
      }).on('click', buttonParam.action);
      
      this.queueButtons.push({ button, index });
    });

    // Pattern pool selector
    const poolFolder = this.pane.addFolder({
      title: 'Pattern Pool (Multi-Layer)',
      expanded: false,
    });

    sortedPatterns.forEach(({ pattern, index }) => {
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

    // Webcam controls
    const webcamFolder = this.pane.addFolder({
      title: '📹 Webcam Input',
      expanded: false,
    });

    const webcamInput = this.app.getInput().getWebcamInput();
    
    const webcamParams = {
      enabled: false,
      motionSensitivity: webcamInput.motionSensitivity * 100,
      clickThreshold: webcamInput.clickThreshold * 100,
      smoothing: webcamInput.smoothingFactor * 100,
      showDebug: webcamInput.showDebug,
      status: 'Not initialized',
    };

    webcamFolder.addBinding(webcamParams, 'enabled', {
      label: 'Enable Webcam',
    }).on('change', async (ev: any) => {
      if (ev.value) {
        webcamParams.status = 'Initializing...';
        this.pane.refresh();
        const success = await webcamInput.init();
        if (success) {
          webcamInput.setEnabled(true);
          webcamParams.status = '✓ Active';
        } else {
          webcamParams.enabled = false;
          webcamParams.status = '✗ Failed - check permissions';
        }
      } else {
        webcamInput.setEnabled(false);
        webcamParams.status = 'Disabled';
      }
      this.pane.refresh();
    });

    webcamFolder.addBinding(webcamParams, 'status', {
      label: 'Status',
      readonly: true,
    });

    webcamFolder.addBlade({
      view: 'text',
      label: 'Info',
      value: '📹 Move in frame to control cursor\n💥 Quick motion = click',
      parse: (v: string) => String(v),
      format: (v: string) => String(v),
    } as any);

    webcamFolder.addBinding(webcamParams, 'motionSensitivity', {
      label: 'Motion Sensitivity',
      min: 0,
      max: 100,
      step: 5,
    }).on('change', (ev: any) => {
      webcamInput.motionSensitivity = ev.value / 100;
    });

    webcamFolder.addBinding(webcamParams, 'clickThreshold', {
      label: 'Click Threshold',
      min: 0,
      max: 100,
      step: 5,
    }).on('change', (ev: any) => {
      webcamInput.clickThreshold = ev.value / 100;
    });

    webcamFolder.addBinding(webcamParams, 'smoothing', {
      label: 'Position Smoothing',
      min: 0,
      max: 100,
      step: 5,
    }).on('change', (ev: any) => {
      webcamInput.smoothingFactor = ev.value / 100;
    });

    webcamFolder.addBinding(webcamParams, 'showDebug', {
      label: 'Show Debug Overlay',
    }).on('change', (ev: any) => {
      webcamInput.showDebug = ev.value;
    });

    // Display settings
    const displayFolder = this.pane.addFolder({
      title: 'Display',
      expanded: false,
    });

    displayFolder.addBinding(this.params, 'feedbackEnabled', {
      label: 'Enable Trails',
    }).on('change', (ev: any) => {
      this.app.feedbackEnabled = ev.value;
    });

    // Analog Look controls
    const analogFolder = this.pane.addFolder({
      title: '🎞️ Film Effects',
      expanded: false,
    });

    const postFX = this.app.getPostFX();

    analogFolder.addBinding(postFX.params, 'analogEnabled', {
      label: 'Enable Film Effects',
    });

    analogFolder.addBinding(postFX.params, 'filmGrainIntensity', {
      label: 'Film Grain',
      min: 0,
      max: 0.3,
      step: 0.01,
    });

    analogFolder.addBinding(postFX.params, 'softness', {
      label: 'Softness (Blur)',
      min: 0,
      max: 3,
      step: 0.1,
    });

    analogFolder.addBinding(postFX.params, 'vignetteStrength', {
      label: 'Vignette',
      min: 0,
      max: 1,
      step: 0.05,
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

  private updateQueueButtons(): void {
    // Update button titles to show queue positions (adjusted for consumed items)
    const patterns = this.sceneManager.getAllPatterns();
    this.queueButtons.forEach(({ button, index }) => {
      const positions = this.queuePositions[index] || [];
      const patternName = patterns[index].name;
      
      // Filter out consumed positions and adjust remaining ones
      const activePositions = positions
        .filter(pos => pos > this.consumedPositions)
        .map(pos => pos - this.consumedPositions);
      
      if (activePositions.length === 0) {
        button.title = patternName;
      } else if (activePositions.length === 1) {
        button.title = `${patternName} [${activePositions[0]}]`;
      } else {
        // Show all positions if multiple
        button.title = `${patternName} [${activePositions.join(', ')}]`;
      }
    });
    this.pane.refresh();
  }

  public update(): void {
    // Update active layer information
    if (this.params.compositionMode) {
      this.params.activeLayerCount = this.sceneManager.getActiveLayerCount();
      const names = this.sceneManager.getActiveLayerNames();
      this.params.activeLayerInfo = names.length > 0 ? names.join('\n') : 'None';
      
      // Update consumed positions based on queue length
      const currentQueueLength = this.sceneManager.getQueueLength();
      const totalQueued = this.globalQueuePosition;
      this.consumedPositions = totalQueued - currentQueueLength;
      
      // Update button displays
      this.updateQueueButtons();
    } else {
      this.params.activeLayerCount = 0;
      this.params.activeLayerInfo = 'Single pattern mode';
    }
    this.pane.refresh();
  }

  public setExpanded(expanded: boolean): void {
    this.pane.expanded = expanded;
  }

  public destroy(): void {
    this.pane.dispose();
  }
}

