import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { randomRange } from '../utils/math';

interface Neuron {
  x: number;
  y: number;
  layer: number;
  activation: number;
  targetActivation: number;
  radius: number;
  connections: number[]; // Indices of neurons in next layer
}

interface Connection {
  from: Neuron;
  to: Neuron;
  weight: number;
  activity: number; // Current signal flowing through
}

export class NeuralNetwork implements Pattern {
  public name = 'Neural Network';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private neurons: Neuron[] = [];
  private connections: Connection[] = [];
  private time: number = 0;
  private layers: number = 5;
  private neuronsPerLayer: number[] = [8, 12, 16, 12, 8];

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.initializeNetwork();
  }

  private initializeNetwork(): void {
    const { width, height } = this.context;
    const layerSpacing = width / (this.layers + 1);

    // Create neurons in layers
    for (let layer = 0; layer < this.layers; layer++) {
      const neuronsInLayer = this.neuronsPerLayer[layer];
      const neuronSpacing = height / (neuronsInLayer + 1);

      for (let i = 0; i < neuronsInLayer; i++) {
        const neuron: Neuron = {
          x: layerSpacing * (layer + 1),
          y: neuronSpacing * (i + 1),
          layer,
          activation: Math.random(),
          targetActivation: Math.random(),
          radius: 8,
          connections: [],
        };

        this.neurons.push(neuron);
      }
    }

    // Create connections between adjacent layers
    for (let layer = 0; layer < this.layers - 1; layer++) {
      const currentLayerNeurons = this.neurons.filter(n => n.layer === layer);
      const nextLayerNeurons = this.neurons.filter(n => n.layer === layer + 1);

      currentLayerNeurons.forEach(fromNeuron => {
        // Each neuron connects to 60-100% of next layer
        const connectionCount = Math.floor(nextLayerNeurons.length * randomRange(0.6, 1));
        const connectedIndices = new Set<number>();

        for (let i = 0; i < connectionCount; i++) {
          const toNeuron = nextLayerNeurons[Math.floor(Math.random() * nextLayerNeurons.length)];
          const toIndex = this.neurons.indexOf(toNeuron);

          if (!connectedIndices.has(toIndex)) {
            connectedIndices.add(toIndex);
            fromNeuron.connections.push(toIndex);

            this.connections.push({
              from: fromNeuron,
              to: toNeuron,
              weight: randomRange(-1, 1),
              activity: 0,
            });
          }
        }
      });
    }
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Input layer activation from audio spectrum
    const inputNeurons = this.neurons.filter(n => n.layer === 0);
    inputNeurons.forEach((neuron, idx) => {
      const spectrumIndex = Math.floor((idx / inputNeurons.length) * audio.spectrum.length);
      neuron.targetActivation = audio.spectrum[spectrumIndex] || 0;
    });

    // Forward propagation through network
    for (let layer = 0; layer < this.layers - 1; layer++) {
      const currentLayerNeurons = this.neurons.filter(n => n.layer === layer);

      currentLayerNeurons.forEach(fromNeuron => {
        fromNeuron.connections.forEach(toIndex => {
          const toNeuron = this.neurons[toIndex];
          const connection = this.connections.find(
            c => c.from === fromNeuron && c.to === toNeuron
          );

          if (connection) {
            // Signal propagates based on activation and weight
            const signal = fromNeuron.activation * Math.abs(connection.weight);
            connection.activity = signal;

            // Accumulate activation in target neuron
            toNeuron.targetActivation += signal * 0.1;
          }
        });
      });
    }

    // Update neuron activations with smoothing
    this.neurons.forEach(neuron => {
      neuron.activation += (neuron.targetActivation - neuron.activation) * 5 * dt;
      neuron.activation = Math.max(0, Math.min(1, neuron.activation));
      
      // Decay target activation
      neuron.targetActivation *= 0.9;

      // Beat boost for random neurons
      if (audio.beat && Math.random() < 0.2) {
        neuron.targetActivation = Math.min(1, neuron.targetActivation + 0.5);
      }
    });

    // Decay connection activity
    this.connections.forEach(conn => {
      conn.activity *= 0.9;
    });

    // Mouse interaction - activate nearby neurons
    if (input.isDown) {
      this.neurons.forEach(neuron => {
        const dx = neuron.x - input.x;
        const dy = neuron.y - input.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 100) {
          neuron.targetActivation = Math.min(1, neuron.targetActivation + (1 - dist / 100) * 0.5);
        }
      });
    }

    // Click spawns signal pulse
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.1) {
        // Find closest neuron to click
        let closestNeuron = this.neurons[0];
        let minDist = Infinity;

        this.neurons.forEach(neuron => {
          const dist = Math.hypot(neuron.x - click.x, neuron.y - click.y);
          if (dist < minDist) {
            minDist = dist;
            closestNeuron = neuron;
          }
        });

        closestNeuron.targetActivation = 1;
      }
    });

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    // Draw connections first (behind neurons)
    this.connections.forEach(conn => {
      const isInhibitory = conn.weight < 0;
      const strength = Math.abs(conn.weight);
      const activity = conn.activity;

      // Base color (blue for excitatory, red for inhibitory)
      const baseHue = isInhibitory ? 0 : 200;
      const color = this.hslToHex(baseHue, 70, 50);

      // Line thickness based on weight strength
      const thickness = 0.5 + strength * 2;
      
      // Alpha based on activity
      const alpha = 0.1 + activity * 0.6;

      this.graphics.lineStyle(thickness, color, alpha);
      this.graphics.moveTo(conn.from.x, conn.from.y);
      this.graphics.lineTo(conn.to.x, conn.to.y);

      // Draw signal pulse for high activity
      if (activity > 0.3) {
        const pulseT = (activity * 2) % 1; // Animate along connection
        const pulseX = conn.from.x + (conn.to.x - conn.from.x) * pulseT;
        const pulseY = conn.from.y + (conn.to.y - conn.from.y) * pulseT;

        this.graphics.beginFill(0xffffff, activity * 0.8);
        this.graphics.drawCircle(pulseX, pulseY, 3);
        this.graphics.endFill();
      }
    });

    // Draw neurons
    this.neurons.forEach(neuron => {
      const activation = neuron.activation;
      const size = neuron.radius * (0.8 + activation * 0.8 + (audio.beat ? 0.2 : 0));

      // Neuron color based on activation and layer
      const hue = (neuron.layer * 60 + this.time * 20) % 360;
      const lightness = 30 + activation * 50;
      const color = this.hslToHex(hue, 80, lightness);

      // Outer glow
      if (activation > 0.3) {
        this.graphics.beginFill(color, activation * 0.3);
        this.graphics.drawCircle(neuron.x, neuron.y, size * 2);
        this.graphics.endFill();
      }

      // Neuron body
      this.graphics.beginFill(color, 0.8);
      this.graphics.drawCircle(neuron.x, neuron.y, size);
      this.graphics.endFill();

      // Core highlight
      if (activation > 0.5) {
        this.graphics.beginFill(0xffffff, (activation - 0.5) * 1.5);
        this.graphics.drawCircle(neuron.x, neuron.y, size * 0.5);
        this.graphics.endFill();
      }

      // Neuron border
      this.graphics.lineStyle(1, 0xffffff, 0.5);
      this.graphics.drawCircle(neuron.x, neuron.y, size);
    });

    // Draw layer labels (simulated with simple shapes)
    for (let layer = 0; layer < this.layers; layer++) {
      const x = (this.context.width / (this.layers + 1)) * (layer + 1);
      const y = 20;
      const opacity = 0.3 + (audio.spectrum[layer * 6] || 0) * 0.4;

      this.graphics.beginFill(0xffffff, opacity);
      this.graphics.drawCircle(x, y, 5);
      this.graphics.endFill();
    }
  }

  private hslToHex(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l / 100 - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }

    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

