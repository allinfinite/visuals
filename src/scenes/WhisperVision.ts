import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface ImageState {
  sprite: Sprite;
  texture: Texture;
  startTime: number;
  duration: number;
  startScale: number;
  endScale: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  transcript: string;
}

export class WhisperVision implements Pattern {
  public name = 'Whisper Vision';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private images: ImageState[] = [];
  private isGenerating: boolean = false;
  private isTranscribing: boolean = false;
  private apiKey: string = '';
  
  // Ken Burns parameters
  private imageDuration: number = 30; // 30 seconds per image (extended for continuous animation)
  private transitionDuration: number = 3; // fade transition time
  private maxImages: number = 2; // Keep 2 images in rotation
  
  // Audio recording
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingInterval: number | null = null;
  private recordingDuration: number = 20; // Record 20 seconds at a time (longer segments)

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Get API key from environment
    this.apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('WhisperVision: No OpenAI API key found');
    } else {
      console.log('WhisperVision: OpenAI API key loaded - will start audio on first activation');
      // Don't start recording immediately - wait until pattern is active
    }
  }

  private async startAudioCapture(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Create MediaRecorder with supported format
      // Try different formats for better compatibility
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        }
      }
      
      console.log(`WhisperVision: Using audio format: ${mimeType}`);
      const options = { mimeType };
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioChunks = [];
          this.transcribeAudio(audioBlob);
        }
      };
      
      // Start recording cycle
      this.startRecordingCycle();
      
      console.log('WhisperVision: Audio capture started');
    } catch (error) {
      console.error('WhisperVision: Failed to access microphone:', error);
    }
  }

  private startRecordingCycle(): void {
    if (!this.mediaRecorder) return;
    
    const recordAndRestart = () => {
      if (!this.mediaRecorder) return;
      
      // Stop previous recording if running
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      
      // Start new recording
      this.audioChunks = [];
      this.mediaRecorder.start();
      
      // Stop after recordingDuration
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, this.recordingDuration * 1000);
    };
    
    // Start first recording
    recordAndRestart();
    
    // Repeat every recordingDuration seconds
    this.recordingInterval = setInterval(recordAndRestart, this.recordingDuration * 1000);
  }

  private async transcribeAudio(audioBlob: Blob): Promise<void> {
    if (this.isTranscribing || !this.apiKey) return;
    
    // Check if audio blob is valid (minimal threshold - let Whisper handle silence detection)
    if (!audioBlob || audioBlob.size < 1000) {
      console.log('WhisperVision: Audio blob too small, skipping transcription');
      return;
    }
    
    this.isTranscribing = true;
    
    try {
      console.log(`WhisperVision: Transcribing audio (${(audioBlob.size / 1024).toFixed(1)} KB)...`);
      
      const formData = new FormData();
      // Determine file extension based on mime type
      const extension = audioBlob.type.includes('mp4') ? 'audio.mp4' : 
                       audioBlob.type.includes('mpeg') ? 'audio.mp3' :
                       audioBlob.type.includes('webm') ? 'audio.webm' : 'audio.wav';
      formData.append('file', audioBlob, extension);
      formData.append('model', 'whisper-1');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WhisperVision: API error details:', errorText);
        throw new Error(`Transcription error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const transcript = data.text.trim();
      
      console.log(`WhisperVision: Transcribed: "${transcript}"`);
      
      if (transcript.length > 15) {
        // Generate image from actual transcript (meaningful speech detected)
        this.generateImageFromTranscript(transcript);
      } else {
        // Silence or very short - don't generate, just keep current image playing
        console.log(`WhisperVision: Transcript too short (${transcript.length} chars) - keeping current image`);
      }
      
    } catch (error) {
      console.error('WhisperVision: Transcription failed:', error);
    } finally {
      this.isTranscribing = false;
    }
  }

  private async generateImageFromTranscript(transcript: string): Promise<void> {
    if (!this.apiKey) return;
    
    // Only generate if pattern is active/visible
    const isActive = this.container.visible && this.container.alpha > 0.1;
    if (!isActive) {
      console.log('WhisperVision: Pattern not active, skipping generation');
      return;
    }
    
    // Allow queueing if we're still generating but don't have enough images
    if (this.isGenerating && this.images.length >= this.maxImages) {
      console.log('WhisperVision: Already generating and have enough images, skipping');
      return;
    }
    
    this.isGenerating = true;
    
    try {
      // Create a prompt that represents the content in a trippy style
      const prompt = `${transcript}, visualized as psychedelic trippy art with vibrant colors, kaleidoscopic effects, fractal patterns, glowing neon elements, and surreal dreamlike atmosphere. Emphasize the core concept/subject while making it visually trippy and cosmic. NO TEXT, NO WORDS, NO LETTERS in the image.`;
      
      console.log(`WhisperVision: Generating image for: "${transcript}"`);
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1-mini',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generation error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const b64Image = data.data[0].b64_json;
      
      if (!b64Image) {
        throw new Error('No image data in response');
      }
      
      console.log('WhisperVision: Image generated successfully');
      await this.loadImageFromBase64(b64Image, transcript);
      
    } catch (error) {
      console.error('WhisperVision: Image generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  private async loadImageFromBase64(b64Data: string, transcript: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const texture = Texture.from(img);
          const sprite = new Sprite(texture);
          
          // Fit image to screen (cover mode)
          const screenAspect = this.context.width / this.context.height;
          const imageAspect = img.width / img.height;
          
          if (screenAspect > imageAspect) {
            sprite.width = this.context.width;
            sprite.height = this.context.width / imageAspect;
          } else {
            sprite.height = this.context.height;
            sprite.width = this.context.height * imageAspect;
          }
          
          // Center image
          sprite.anchor.set(0.5, 0.5);
          
          // Random Ken Burns parameters (extended zoom range)
          const zoomDirection = Math.random() > 0.5 ? 1 : -1;
          const startScale = zoomDirection > 0 ? 1.0 : 1.4; // Increased from 1.2 to 1.4
          const endScale = zoomDirection > 0 ? 1.4 : 1.0;   // Increased from 1.2 to 1.4
          
          // Random pan direction (extended range)
          const panX = (Math.random() - 0.5) * 0.2; // Increased from 0.1 to 0.2
          const panY = (Math.random() - 0.5) * 0.2; // Increased from 0.1 to 0.2
          
          const imageState: ImageState = {
            sprite,
            texture,
            startTime: this.time,
            duration: this.imageDuration,
            startScale,
            endScale,
            startX: this.context.width / 2 - panX * this.context.width,
            startY: this.context.height / 2 - panY * this.context.height,
            endX: this.context.width / 2 + panX * this.context.width,
            endY: this.context.height / 2 + panY * this.context.height,
            transcript,
          };
          
          sprite.alpha = 0;
          this.container.addChild(sprite);
          this.images.push(imageState);
          
          // Remove oldest images if we exceed max (keep newest ones)
          while (this.images.length > this.maxImages) {
            const oldest = this.images.shift();
            if (oldest) {
              this.container.removeChild(oldest.sprite);
              oldest.texture.destroy(true);
              oldest.sprite.destroy();
            }
          }
          
          console.log(`WhisperVision: Image loaded (${this.images.length}/${this.maxImages})`);
          resolve();
        } catch (error) {
          console.error('WhisperVision: Error creating sprite:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        console.error('WhisperVision: Image load error:', error);
        reject(new Error('Failed to load image'));
      };
      
      img.src = `data:image/png;base64,${b64Data}`;
    });
  }

  public update(dt: number, audio: AudioData, _input: InputState): void {
    this.time += dt;
    
    // Start recording when pattern becomes active (lazy initialization)
    // Once started, keep recording even if alpha drops (for multi-layer transitions)
    const shouldBeActive = this.container.visible && this.container.alpha > 0.01;
    if (this.apiKey && !this.mediaRecorder && shouldBeActive) {
      console.log('WhisperVision: Pattern now active, starting audio capture');
      this.startAudioCapture();
    }
    
    // Update images with Ken Burns effect
    this.images.forEach((img) => {
      const age = this.time - img.startTime;
      const progress = Math.min(1, age / img.duration);
      
      // Smooth easing
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Apply Ken Burns effect
      const scale = img.startScale + (img.endScale - img.startScale) * eased;
      img.sprite.scale.set(scale, scale);
      
      img.sprite.x = img.startX + (img.endX - img.startX) * eased;
      img.sprite.y = img.startY + (img.endY - img.startY) * eased;
      
      // Fade in/out transitions
      const fadeIn = Math.min(1, age / this.transitionDuration);
      const fadeOut = age > (img.duration - this.transitionDuration)
        ? 1 - (age - (img.duration - this.transitionDuration)) / this.transitionDuration
        : 1;
      
      const baseAlpha = Math.min(fadeIn, fadeOut);
      const minAlpha = this.images.length === 1 ? 0.2 : 0.1;
      img.sprite.alpha = Math.max(baseAlpha * 0.6, minAlpha);
      
      // Audio reactivity - subtle brightness pulse
      const brightness = 1 + audio.rms * 0.15;
      img.sprite.tint = this.rgbToHex(brightness, brightness, brightness);
    });
    
    // Remove expired images (but keep at least 1 image visible)
    this.images = this.images.filter((img, index) => {
      const age = this.time - img.startTime;
      const extendedDuration = img.duration + this.transitionDuration;
      
      // Never remove the last image - keep showing it until a new one arrives
      if (this.images.length === 1) {
        return true;
      }
      
      // Remove if expired and we have newer images
      if (age > extendedDuration && index < this.images.length - 1) {
        this.container.removeChild(img.sprite);
        img.texture.destroy(true);
        img.sprite.destroy();
        return false;
      }
      return true;
    });
    
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    
    // Draw status indicator
    if (this.apiKey) {
      // Background
      this.graphics.beginFill(0x000000, 0.6);
      this.graphics.drawRoundedRect(10, 10, 140, 30, 5);
      this.graphics.endFill();
      
      // Microphone icon (recording indicator)
      const micColor = this.mediaRecorder?.state === 'recording' ? 0xff4444 : 0x888888;
      this.graphics.beginFill(micColor, 0.8);
      this.graphics.drawCircle(25, 25, 6);
      this.graphics.endFill();
      
      // Transcribing indicator
      if (this.isTranscribing) {
        this.graphics.beginFill(0xffaa00, 0.8);
        this.graphics.drawCircle(50, 25, 5);
        this.graphics.endFill();
      }
      
      // Generating indicator
      if (this.isGenerating) {
        this.graphics.beginFill(0x00ff88, 0.8);
        this.graphics.drawCircle(75, 25, 5);
        this.graphics.endFill();
      }
      
      // Image count dots
      for (let i = 0; i < this.maxImages; i++) {
        const filled = i < this.images.length;
        this.graphics.beginFill(0xffffff, filled ? 0.8 : 0.2);
        this.graphics.drawCircle(100 + i * 20, 25, 4);
        this.graphics.endFill();
      }
    }
  }

  private rgbToHex(r: number, g: number, b: number): number {
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
    return ((r * 255) << 16) | ((g * 255) << 8) | (b * 255);
  }

  public destroy(): void {
    // Stop recording
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      const stream = this.mediaRecorder.stream;
      stream.getTracks().forEach(track => track.stop());
      this.mediaRecorder = null;
    }
    
    // Clean up images
    this.images.forEach(img => {
      this.container.removeChild(img.sprite);
      img.texture.destroy(true);
      img.sprite.destroy();
    });
    this.images = [];
    
    this.graphics.destroy();
    this.container.destroy();
  }
}

