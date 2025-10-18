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
  webcam?: WebcamData;
}

export interface WebcamData {
  x: number;              // Centroid X position (normalized 0-1)
  y: number;              // Centroid Y position (normalized 0-1)
  motionIntensity: number; // 0-1 motion amount
  hasMotion: boolean;     // Motion detected
  enabled: boolean;       // Webcam active
  dragMode: 'none' | 'ready' | 'dragging'; // Drag state
  stillnessProgress: number; // 0-1, progress toward entering drag mode
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

