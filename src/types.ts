import type { Application, Container } from 'pixi.js';

export interface AudioData {
  spectrum: Float32Array;  // 32-band log-mapped spectrum
  rms: number;             // Overall volume
  bass: number;            // Low frequency energy
  mid: number;             // Mid frequency energy
  treble: number;          // High frequency energy
  centroid: number;        // Spectral centroid (brightness)
  beat: boolean;           // Beat detected this frame
  bpm: number;             // Estimated BPM
}

export interface InputState {
  x: number;
  y: number;
  isDown: boolean;
  isDragging: boolean;
  clicks: ClickEvent[];
}

export interface ClickEvent {
  x: number;
  y: number;
  time: number;
}

export interface Pattern {
  name: string;
  container: Container;
  update(dt: number, audio: AudioData, input: InputState): void;
  destroy(): void;
}

export interface RendererContext {
  app: Application;
  width: number;
  height: number;
}

