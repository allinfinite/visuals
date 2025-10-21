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
  
  // Real-time audio streaming
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  
  // Transcription and topic tracking
  private currentTranscript: string = '';
  private pendingTopics: string[] = []; // Queue of topics waiting for image generation
  private lastTranscriptLength: number = 0;
  private topicCheckInterval: number = 5; // Check for new topics every 5 seconds
  private lastTopicCheckTime: number = 0;
  
  // Different trippy visual styles to rotate through
  private visualStyles: string[] = [
    'vibrant neon colors with kaleidoscopic patterns and fractal elements',
    'liquid chrome and holographic rainbow reflections with fluid shapes',
    'bioluminescent glowing elements with sacred geometry patterns',
    'cosmic nebula style with crystalline structures and light beams',
    'electric plasma arcs with infinite recursive spirals',
    'watercolor psychedelic with flowing organic forms and gradients',
    'glitch art aesthetic with digital distortions and chromatic aberration',
    'mandala patterns with intricate geometric details and bright colors',
    'aurora borealis style with flowing ribbons of colored light',
    'abstract expressionism with bold strokes and vivid color explosions',
    'vaporwave aesthetic with retro futuristic elements and pink/purple hues',
    'oil painting texture with surreal melting dreamlike qualities'
  ];
  private currentStyleIndex: number = 0;

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
      // Connect to GPT Realtime API via WebSocket
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
      
      this.websocket = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${this.apiKey}`,
        'openai-beta.realtime-v1'
      ]);
      
      this.websocket.onopen = async () => {
        console.log('WhisperVision: Connected to realtime API');
        
        // Configure the session for audio input
        this.websocket?.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a transcription assistant. Transcribe all speech accurately.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }));
        
        // Start capturing microphone audio
        await this.startMicrophoneStream();
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeEvent(data);
        } catch (error) {
          console.error('WhisperVision: Error parsing websocket message:', error);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('WhisperVision: WebSocket error:', error);
      };
      
      this.websocket.onclose = () => {
        console.log('WhisperVision: Disconnected from realtime API');
      };
      
    } catch (error) {
      console.error('WhisperVision: Failed to connect to realtime API:', error);
    }
  }

  private async startMicrophoneStream(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000 // Realtime API expects 24kHz
        }
      });
      
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create a ScriptProcessorNode to capture audio (simpler than AudioWorklet for now)
      const bufferSize = 4096;
      const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (this.websocket?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array (PCM16)
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Convert to base64 and send
          const base64 = this.arrayBufferToBase64(pcm16.buffer);
          this.websocket.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64
          }));
        }
      };
      
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      console.log('WhisperVision: Microphone streaming to realtime API');
    } catch (error) {
      console.error('WhisperVision: Failed to start microphone stream:', error);
    }
  }
  
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  private handleRealtimeEvent(event: any): void {
    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        // Received transcription from realtime API
        const transcript = event.transcript || '';
        if (transcript.trim().length > 0) {
          console.log(`WhisperVision: Real-time transcript: "${transcript}"`);
          this.currentTranscript += ' ' + transcript;
          this.extractAndQueueTopics();
        }
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('WhisperVision: Speech detected');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('WhisperVision: Speech ended - checking for topics');
        this.extractAndQueueTopics();
        break;
        
      case 'error':
        console.error('WhisperVision: Realtime API error:', event.error);
        break;
    }
  }
  
  private extractAndQueueTopics(): void {
    const newText = this.currentTranscript.substring(this.lastTranscriptLength);
    this.lastTranscriptLength = this.currentTranscript.length;
    
    if (newText.trim().length < 10) return;
    
    // Split by sentence endings or significant pauses
    const sentences = newText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
    
    sentences.forEach(sentence => {
      // Check if this seems like a complete thought/topic
      if (sentence.length > 20 && !this.pendingTopics.includes(sentence)) {
        console.log(`WhisperVision: Queued topic: "${sentence.substring(0, 50)}..."`);
        this.pendingTopics.push(sentence);
      }
    });
  }

  private checkAndGenerateFromTranscript(): void {
    // Process queue if we have topics and are not already generating
    if (this.pendingTopics.length > 0 && !this.isGenerating) {
      const topic = this.pendingTopics.shift()!;
      console.log(`WhisperVision: Processing queued topic (${this.pendingTopics.length} remaining)`);
      this.generateImageFromTranscript(topic);
    }
    
    // Periodically check transcript for new topics
    this.lastTopicCheckTime += 1/60; // Approximate dt
    if (this.lastTopicCheckTime >= this.topicCheckInterval) {
      this.lastTopicCheckTime = 0;
      this.extractAndQueueTopics();
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
      // Rotate through different visual styles for variety
      const style = this.visualStyles[this.currentStyleIndex];
      this.currentStyleIndex = (this.currentStyleIndex + 1) % this.visualStyles.length;
      
      // Create a prompt that represents the content in the selected style
      const prompt = `${transcript}, visualized as trippy psychedelic art with ${style}. Emphasize the core subject/concept while making it visually stunning and surreal. NO TEXT, NO WORDS, NO LETTERS in the image.`;
      
      console.log(`WhisperVision: Generating image with style: "${style.substring(0, 40)}..."`);
      
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
    if (this.apiKey && !this.websocket && shouldBeActive) {
      console.log('WhisperVision: Pattern now active, starting audio capture');
      this.startAudioCapture();
    }
    
    // Check if we should generate a new image from accumulated transcript
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.checkAndGenerateFromTranscript();
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
      const micColor = this.websocket?.readyState === WebSocket.OPEN ? 0xff4444 : 0x888888;
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
    // Close websocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Stop audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
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


