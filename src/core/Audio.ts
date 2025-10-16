import type { AudioData } from '../types';

export class Audio {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private fftSize: number = 1024;
  private bandCount: number = 32;
  
  // Smoothing for smoother visuals
  private smoothingFactor: number = 0.7; // 0 = instant, 1 = no change
  private prevData: AudioData = {
    spectrum: new Float32Array(32),
    rms: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    centroid: 0,
    beat: false,
    bpm: 120,
  };
  
  public data: AudioData = {
    spectrum: new Float32Array(32),
    rms: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    centroid: 0,
    beat: false,
    bpm: 120,
  };

  private beatDetection = {
    threshold: 1.3,
    decay: 0.98,
    minTimeBetweenBeats: 200, // ms
    lastBeatTime: 0,
    energy: 0,
    energyHistory: [] as number[],
    historySize: 43, // ~43 frames at 60fps = ~700ms
  };

  public async init(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }

  public async connectMicrophone(): Promise<void> {
    if (!this.audioContext || !this.analyser) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      console.log('Microphone connected');
    } catch (error) {
      console.warn('Microphone access denied:', error);
    }
  }

  public update(): void {
    if (!this.analyser || !this.dataArray) {
      // Generate fake audio data for testing without microphone
      this.generateFakeData();
      this.smoothData();
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    // Map to 32 log-spaced bands
    this.mapToLogBands();

    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < this.data.spectrum.length; i++) {
      sum += this.data.spectrum[i] * this.data.spectrum[i];
    }
    this.data.rms = Math.sqrt(sum / this.data.spectrum.length);

    // Calculate frequency bands
    this.data.bass = this.getBandEnergy(0, 8);
    this.data.mid = this.getBandEnergy(8, 20);
    this.data.treble = this.getBandEnergy(20, 32);

    // Calculate spectral centroid
    this.data.centroid = this.calculateCentroid();

    // Beat detection
    this.detectBeat();
    
    // Apply smoothing for smoother visuals
    this.smoothData();
  }
  
  private smoothData(): void {
    // Smooth spectrum
    for (let i = 0; i < this.bandCount; i++) {
      this.data.spectrum[i] = 
        this.prevData.spectrum[i] * this.smoothingFactor + 
        this.data.spectrum[i] * (1 - this.smoothingFactor);
      this.prevData.spectrum[i] = this.data.spectrum[i];
    }
    
    // Smooth other values
    this.data.rms = this.prevData.rms * this.smoothingFactor + this.data.rms * (1 - this.smoothingFactor);
    this.prevData.rms = this.data.rms;
    
    this.data.bass = this.prevData.bass * this.smoothingFactor + this.data.bass * (1 - this.smoothingFactor);
    this.prevData.bass = this.data.bass;
    
    this.data.mid = this.prevData.mid * this.smoothingFactor + this.data.mid * (1 - this.smoothingFactor);
    this.prevData.mid = this.data.mid;
    
    this.data.treble = this.prevData.treble * this.smoothingFactor + this.data.treble * (1 - this.smoothingFactor);
    this.prevData.treble = this.data.treble;
    
    this.data.centroid = this.prevData.centroid * this.smoothingFactor + this.data.centroid * (1 - this.smoothingFactor);
    this.prevData.centroid = this.data.centroid;
  }

  private mapToLogBands(): void {
    if (!this.dataArray) return;

    for (let i = 0; i < this.bandCount; i++) {
      const binIndex = Math.floor(
        Math.pow(i / this.bandCount, 2) * this.dataArray.length
      );
      this.data.spectrum[i] = this.dataArray[binIndex] / 255;
    }
  }

  private getBandEnergy(startBand: number, endBand: number): number {
    let sum = 0;
    for (let i = startBand; i < endBand; i++) {
      sum += this.data.spectrum[i];
    }
    return sum / (endBand - startBand);
  }

  private calculateCentroid(): number {
    let weightedSum = 0;
    let sum = 0;
    for (let i = 0; i < this.data.spectrum.length; i++) {
      weightedSum += this.data.spectrum[i] * i;
      sum += this.data.spectrum[i];
    }
    return sum > 0 ? weightedSum / sum / this.data.spectrum.length : 0;
  }

  private detectBeat(): void {
    const now = performance.now();
    const instantEnergy = this.data.bass * 2 + this.data.mid;

    // Add to history
    this.beatDetection.energyHistory.push(instantEnergy);
    if (this.beatDetection.energyHistory.length > this.beatDetection.historySize) {
      this.beatDetection.energyHistory.shift();
    }

    // Calculate average energy
    const avgEnergy =
      this.beatDetection.energyHistory.reduce((a, b) => a + b, 0) /
      this.beatDetection.energyHistory.length;

    // Detect beat
    const timeSinceLastBeat = now - this.beatDetection.lastBeatTime;
    if (
      instantEnergy > avgEnergy * this.beatDetection.threshold &&
      timeSinceLastBeat > this.beatDetection.minTimeBetweenBeats
    ) {
      this.data.beat = true;
      this.beatDetection.lastBeatTime = now;
    } else {
      this.data.beat = false;
    }
  }

  private generateFakeData(): void {
    // Generate smooth fake audio data for testing with more variation
    const time = performance.now() / 1000;
    const slowTime = time * 0.3;
    
    for (let i = 0; i < this.bandCount; i++) {
      this.data.spectrum[i] = 
        (Math.sin(time * 2 + i * 0.3) * 0.3 + 0.3) * 
        Math.exp(-i / 10) * 
        (0.7 + Math.sin(slowTime + i * 0.1) * 0.3);
    }
    
    this.data.rms = 0.4 + Math.sin(time * 1.5) * 0.25;
    this.data.bass = 0.45 + Math.sin(time * 1.2) * 0.3;
    this.data.mid = 0.35 + Math.sin(time * 1.7) * 0.25;
    this.data.treble = 0.25 + Math.sin(time * 2.3) * 0.2;
    this.data.centroid = 0.4 + Math.sin(time * 0.8) * 0.3;
    
    // More frequent beats
    const beatPhase = Math.sin(time * 2.2);
    this.data.beat = beatPhase > 0.85;
  }
}

