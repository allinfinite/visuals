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
  private openaiApiKey: string = '';
  private getimgApiKey: string = '';
  private activeGenerations: Set<Promise<void>> = new Set();
  private readonly MAX_PARALLEL_GENERATIONS: number = 2;
  private imageCache: Map<string, string> = new Map(); // Cache topic -> base64 image
  private imageHistory: ImageState[] = []; // Keep history of all generated images
  private readonly MAX_HISTORY: number = 20; // Keep last 20 images
  private historyIndex: number = 0; // Current position in history when cycling
  
  // Image generation settings
  public useFlux: boolean = false; // Toggle between OpenAI and Flux
  
  // Ken Burns parameters (adjusted based on generation speed)
  private imageDuration: number = 30; // Will be adjusted based on model
  private transitionDuration: number = 3; // Will be adjusted based on model
  private maxImages: number = 2; // Keep 2 images in rotation
  
  // Real-time audio streaming
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioBuffer: Int16Array[] = [];
  private readonly AUDIO_BATCH_SIZE: number = 3; // Batch 3 chunks before sending (~500ms)
  
  // Transcription and topic tracking
  private currentTranscript: string = '';
  private pendingTopics: string[] = []; // Queue of topics waiting for image generation
  private processedTopics: Set<string> = new Set(); // Track which topics we've already queued
  private topicCheckInterval: number = 5; // Check for new topics every 5 seconds
  private lastTopicCheckTime: number = 0;
  private speechIntensity: number = 0; // For visualization
  
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
    
    // Get API keys from environment
    this.openaiApiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || '';
    this.getimgApiKey = (import.meta as any).env?.VITE_GETIMG_API || '';
    
    // Check which image model to use from environment
    const imageModel = ((import.meta as any).env?.VITE_IMAGE_MODEL || 'openai').toLowerCase();
    this.useFlux = imageModel === 'flux';
    
    if (!this.openaiApiKey) {
      console.warn('WhisperVision: No OpenAI API key found');
    } else {
      console.log('WhisperVision: OpenAI API key loaded');
    }
    
    if (this.getimgApiKey) {
      console.log('WhisperVision: GetImg.ai (Flux) API key loaded');
    }
    
    console.log(`WhisperVision: Image model set to: ${this.useFlux ? 'Flux Schnell' : 'OpenAI gpt-image-1-mini'}`);
    
    // Adjust timing based on generation speed
    if (this.useFlux) {
      // Flux is faster - long duration since it generates quickly
      this.imageDuration = 120; // 2 minutes per image
      this.transitionDuration = 4; // 4 seconds
      console.log('WhisperVision: Using Flux timing (120s duration, 4s transition)');
    } else {
      // OpenAI is slower - very long duration
      this.imageDuration = 180; // 3 minutes per image
      this.transitionDuration = 5; // 5 seconds
      console.log('WhisperVision: Using OpenAI timing (180s duration, 5s transition)');
    }
    
    // Don't start recording immediately - wait until pattern is active
  }

  private async startAudioCapture(): Promise<void> {
    if (!this.openaiApiKey) {
      console.error('WhisperVision: No OpenAI API key for realtime transcription');
      return;
    }
    
    try {
      // Connect to GPT Realtime API via WebSocket
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
      
      this.websocket = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${this.openaiApiKey}`,
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
          
          // Batch audio chunks for efficiency
          this.audioBuffer.push(pcm16);
          
          if (this.audioBuffer.length >= this.AUDIO_BATCH_SIZE) {
            // Combine buffers
            const totalLength = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
            const combined = new Int16Array(totalLength);
            let offset = 0;
            
            for (const buf of this.audioBuffer) {
              combined.set(buf, offset);
              offset += buf.length;
            }
            
            // Convert to base64 and send
            const base64 = this.arrayBufferToBase64(combined.buffer);
            this.websocket.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64
            }));
            
            this.audioBuffer = [];
          }
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
    // Optimized: use apply with chunks to avoid call stack limits
    const CHUNK_SIZE = 0x8000; // 32KB chunks
    const chunks: string[] = [];
    
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
      chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    return btoa(chunks.join(''));
  }
  
  private handleRealtimeEvent(event: any): void {
    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        // Received transcription from realtime API
        const transcript = event.transcript || '';
        if (transcript.trim().length > 0) {
          console.log(`WhisperVision: Real-time transcript: "${transcript}"`);
          this.currentTranscript += ' ' + transcript;
          this.speechIntensity = 1.0; // Spike on new transcript
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
    const fullTranscript = this.currentTranscript.trim();
    
    // Check for voice commands first
    this.handleVoiceCommands(fullTranscript);
    
    // Only process if we have substantial content (50+ chars)
    if (fullTranscript.length < 50) {
      console.log(`WhisperVision: Transcript too short (${fullTranscript.length} chars), waiting for more...`);
      return;
    }
    
    // Check if this content is already processed
    const topicKey = fullTranscript.substring(0, 30).toLowerCase();
    if (this.processedTopics.has(topicKey)) {
      return; // Already queued this topic
    }
    
    // Queue the accumulated transcript as a topic
    if (this.pendingTopics.length < 3) {
      console.log(`WhisperVision: Queued new topic (${fullTranscript.length} chars): "${fullTranscript.substring(0, 60)}..."`);
      this.pendingTopics.push(fullTranscript);
      this.processedTopics.add(topicKey);
      
      // Clear transcript after queuing
      this.currentTranscript = '';
    } else {
      console.log(`WhisperVision: Queue full (3 topics), waiting to process...`);
    }
  }
  
  private handleVoiceCommands(transcript: string): void {
    const lower = transcript.toLowerCase();
    let commandDetected = false;
    
    // "show me X" - immediate generation
    if (lower.includes('show me')) {
      const match = transcript.match(/show me (.+)/i);
      if (match && match[1].length > 5) {
        console.log(`WhisperVision: 🎤 Voice command - Show me: "${match[1]}"`);
        this.pendingTopics.unshift(match[1]); // Add to front of queue
        commandDetected = true;
      }
    }
    
    // "zoom in/out" - adjust current image zoom
    if (lower.includes('zoom in')) {
      console.log(`WhisperVision: 🎤 Voice command - Zoom in (not implemented yet - use 'faster' or 'slower')`);
      this.imageDuration = Math.max(15, this.imageDuration * 0.7);
      commandDetected = true;
    }
    
    if (lower.includes('zoom out')) {
      console.log(`WhisperVision: 🎤 Voice command - Zoom out (not implemented yet - use 'faster' or 'slower')`);
      this.imageDuration = Math.min(120, this.imageDuration * 1.3);
      commandDetected = true;
    }
    
    // "faster" / "slower" - adjust Ken Burns speed
    if (lower.includes('faster') || lower.includes('speed up')) {
      this.imageDuration = Math.max(15, this.imageDuration * 0.7);
      console.log(`WhisperVision: 🎤 Voice command - Faster! Duration now ${this.imageDuration.toFixed(0)}s`);
      commandDetected = true;
    }
    
    if (lower.includes('slower') || lower.includes('slow down')) {
      this.imageDuration = Math.min(120, this.imageDuration * 1.3);
      console.log(`WhisperVision: 🎤 Voice command - Slower! Duration now ${this.imageDuration.toFixed(0)}s`);
      commandDetected = true;
    }
    
    // "next" or "skip" - skip to next queued topic
    if (lower.includes('next image') || lower.includes('skip')) {
      console.log(`WhisperVision: 🎤 Voice command - Next image`);
      // Force current image to finish
      if (this.images.length > 0) {
        this.images[0].startTime = this.time - this.imageDuration;
      }
      commandDetected = true;
    }
    
    // Clear transcript if command was detected to prevent it being queued as a topic
    if (commandDetected) {
      this.currentTranscript = '';
    }
  }

  private checkAndGenerateFromTranscript(): void {
    // Process queue with parallel generation (up to MAX_PARALLEL_GENERATIONS at once)
    while (this.pendingTopics.length > 0 && this.activeGenerations.size < this.MAX_PARALLEL_GENERATIONS) {
      const topic = this.pendingTopics.shift()!;
      console.log(`WhisperVision: Processing queued topic (${this.pendingTopics.length} remaining, ${this.activeGenerations.size} generating)`);
      
      const promise = this.generateImageFromTranscript(topic);
      this.activeGenerations.add(promise);
      promise.finally(() => this.activeGenerations.delete(promise));
    }
    
    // If no topics in queue and no active generations, cycle through history
    if (this.pendingTopics.length === 0 && this.activeGenerations.size === 0 && this.imageHistory.length > 0) {
      // Check if current image is nearing end
      if (this.images.length > 0) {
        const currentImage = this.images[this.images.length - 1];
        const age = this.time - currentImage.startTime;
        
        // When current image is finishing, load next from history
        if (age > this.imageDuration - this.transitionDuration) {
          this.loadNextHistoryImage();
        }
      } else if (this.images.length === 0) {
        // No images at all, load first from history
        this.loadNextHistoryImage();
      }
    }
    
    // Periodically check transcript for new topics
    this.lastTopicCheckTime += 1/60; // Approximate dt
    if (this.lastTopicCheckTime >= this.topicCheckInterval) {
      this.lastTopicCheckTime = 0;
      this.extractAndQueueTopics();
    }
  }
  
  private loadNextHistoryImage(): void {
    if (this.imageHistory.length === 0) return;
    
    // Get next image from history (cycle through)
    this.historyIndex = (this.historyIndex + 1) % this.imageHistory.length;
    const historyItem = this.imageHistory[this.historyIndex];
    
    console.log(`WhisperVision: Loading from history [${this.historyIndex + 1}/${this.imageHistory.length}]: "${historyItem.transcript.substring(0, 40)}..."`);
    
    // Re-generate image from cache (should be instant)
    const cachedKey = historyItem.transcript.substring(0, 40).toLowerCase();
    const cachedImage = this.imageCache.get(cachedKey);
    
    if (cachedImage) {
      this.loadImageFromBase64(cachedImage, historyItem.transcript);
    }
  }

  private async generateImageFromTranscript(transcript: string): Promise<void> {
    // Check which API to use
    const hasOpenAI = !!this.openaiApiKey;
    const hasFlux = !!this.getimgApiKey;
    
    if (this.useFlux && !hasFlux) {
      console.error('WhisperVision: Flux selected but no API key available');
      return;
    }
    
    if (!this.useFlux && !hasOpenAI) {
      console.error('WhisperVision: OpenAI selected but no API key available');
      return;
    }
    
    // Only generate if pattern is active/visible
    const isActive = this.container.visible && this.container.alpha > 0.1;
    if (!isActive) {
      console.log('WhisperVision: Pattern not active, skipping generation');
      return;
    }
    
    // Allow parallel generation up to MAX_PARALLEL_GENERATIONS
    // Note: isGenerating flag is now managed per-promise in activeGenerations set
    this.isGenerating = true;
    
    try {
      if (this.useFlux) {
        await this.generateWithFlux(transcript);
      } else {
        await this.generateWithOpenAI(transcript);
      }
    } catch (error) {
      console.error('WhisperVision: Image generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }
  
  private async generateWithOpenAI(transcript: string): Promise<void> {
    // Check cache first
    const cacheKey = transcript.substring(0, 40).toLowerCase();
    if (this.imageCache.has(cacheKey)) {
      console.log(`WhisperVision: Loading cached image for similar topic`);
      const cachedImage = this.imageCache.get(cacheKey)!;
      await this.loadImageFromBase64(cachedImage, transcript);
      return;
    }
    
    // Rotate through different visual styles for variety
    const style = this.visualStyles[this.currentStyleIndex];
    this.currentStyleIndex = (this.currentStyleIndex + 1) % this.visualStyles.length;
    
    // Create a prompt that represents the content in the selected style
    const prompt = `${transcript}, visualized as trippy psychedelic art with ${style}. Emphasize the core subject/concept while making it visually stunning and surreal. NO TEXT, NO WORDS, NO LETTERS in the image.`;
    
    console.log(`WhisperVision: Generating with OpenAI, style: "${style.substring(0, 40)}..."`);
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI generation error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const b64Image = data.data[0].b64_json;
    
    if (!b64Image) {
      throw new Error('No image data in OpenAI response');
    }
    
    console.log('WhisperVision: OpenAI image generated successfully');
    
    // Cache the image
    const openaiCacheKey = transcript.substring(0, 40).toLowerCase();
    this.imageCache.set(openaiCacheKey, b64Image);
    
    // Limit cache size to 10 most recent
    if (this.imageCache.size > 10) {
      const firstKey = this.imageCache.keys().next().value;
      if (firstKey) this.imageCache.delete(firstKey);
    }
    
    await this.loadImageFromBase64(b64Image, transcript);
  }
  
  private async generateWithFlux(transcript: string): Promise<void> {
    // Check cache first
    const cacheKey = transcript.substring(0, 40).toLowerCase();
    if (this.imageCache.has(cacheKey)) {
      console.log(`WhisperVision: Loading cached image for similar topic`);
      const cachedImage = this.imageCache.get(cacheKey)!;
      await this.loadImageFromBase64(cachedImage, transcript);
      return;
    }
    
    // Rotate through different visual styles for variety
    const style = this.visualStyles[this.currentStyleIndex];
    this.currentStyleIndex = (this.currentStyleIndex + 1) % this.visualStyles.length;
    
    // Create a prompt that represents the content in the selected style
    const prompt = `${transcript}, visualized as trippy psychedelic art with ${style}. Emphasize the core subject/concept while making it visually stunning and surreal. NO TEXT, NO WORDS, NO LETTERS in the image.`;
    
    console.log(`WhisperVision: Generating with Flux, style: "${style.substring(0, 40)}..."`);
    
    const response = await fetch('https://api.getimg.ai/v1/flux-schnell/text-to-image', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'Authorization': `Bearer ${this.getimgApiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 4, // Flux Schnell is optimized for 1-4 steps
        output_format: 'jpeg',
        response_format: 'b64'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flux generation error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    const b64Image = data.image;
    
    if (!b64Image) {
      throw new Error('No image data in Flux response');
    }
    
    console.log('WhisperVision: Flux image generated successfully');
    
    // Cache the image  
    const fluxCacheKey = transcript.substring(0, 40).toLowerCase();
    this.imageCache.set(fluxCacheKey, b64Image);
    
    // Limit cache size to 10 most recent
    if (this.imageCache.size > 10) {
      const firstKey = this.imageCache.keys().next().value;
      if (firstKey) this.imageCache.delete(firstKey);
    }
    
    await this.loadImageFromBase64(b64Image, transcript);
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
          
          // Analyze image for dynamic Ken Burns (check brightness for complexity hint)
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, 100, 100);
          const imageData = ctx?.getImageData(0, 0, 100, 100);
          
          // Simple complexity measure: variance in brightness
          let totalBrightness = 0;
          let brightnessVariance = 0;
          if (imageData) {
            for (let i = 0; i < imageData.data.length; i += 4) {
              const brightness = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
              totalBrightness += brightness;
            }
            const avgBrightness = totalBrightness / (imageData.data.length / 4);
            for (let i = 0; i < imageData.data.length; i += 4) {
              const brightness = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
              brightnessVariance += Math.abs(brightness - avgBrightness);
            }
          }
          
          // Higher variance = more detail = more zoom/pan
          const complexity = Math.min(1, brightnessVariance / 10000);
          const zoomAmount = 1.2 + complexity * 0.3; // 1.2x to 1.5x zoom
          const panAmount = 0.15 + complexity * 0.1; // 15% to 25% pan
          
          // Random Ken Burns parameters (dynamic based on complexity)
          const zoomDirection = Math.random() > 0.5 ? 1 : -1;
          const startScale = zoomDirection > 0 ? 1.0 : zoomAmount;
          const endScale = zoomDirection > 0 ? zoomAmount : 1.0;
          
          // Random pan direction (dynamic range)
          const panX = (Math.random() - 0.5) * panAmount;
          const panY = (Math.random() - 0.5) * panAmount;
          
          console.log(`WhisperVision: Ken Burns params - complexity: ${complexity.toFixed(2)}, zoom: ${zoomAmount.toFixed(2)}x, pan: ${(panAmount*100).toFixed(0)}%`);
          
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
          
          // Add to history (create a snapshot of image data for later reuse)
          this.imageHistory.push({
            sprite: null as any, // Don't store sprite reference in history
            texture: null as any,
            startTime: 0,
            duration: imageState.duration,
            startScale: imageState.startScale,
            endScale: imageState.endScale,
            startX: imageState.startX,
            startY: imageState.startY,
            endX: imageState.endX,
            endY: imageState.endY,
            transcript: imageState.transcript,
          });
          
          // Limit history size
          if (this.imageHistory.length > this.MAX_HISTORY) {
            this.imageHistory.shift();
          }
          
          // Remove oldest images if we exceed max (keep newest ones)
          while (this.images.length > this.maxImages) {
            const oldest = this.images.shift();
            if (oldest) {
              this.container.removeChild(oldest.sprite);
              oldest.texture.destroy(true);
              oldest.sprite.destroy();
            }
          }
          
          console.log(`WhisperVision: Image loaded (${this.images.length}/${this.maxImages}, ${this.imageHistory.length} in history)`);
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
    
    // Decay speech intensity for visualization
    this.speechIntensity *= 0.95;
    
    // Start recording when pattern becomes active (lazy initialization)
    // Once started, keep recording even if alpha drops (for multi-layer transitions)
    const shouldBeActive = this.container.visible && this.container.alpha > 0.01;
    if (this.openaiApiKey && !this.websocket && shouldBeActive) {
      console.log('WhisperVision: Pattern now active, starting audio capture');
      this.startAudioCapture();
    }
    
    // Check if we should generate a new image from accumulated transcript
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.checkAndGenerateFromTranscript();
    }
    
    // Update images with Ken Burns effect (synced to audio beat)
    this.images.forEach((img) => {
      const age = this.time - img.startTime;
      
      // Speed up Ken Burns on beat for dynamic effect
      const beatBoost = audio.beat ? 0.02 : 0;
      const adjustedAge = age * (1 + beatBoost);
      const progress = Math.min(1, adjustedAge / img.duration);
      
      // Smooth easing
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Apply Ken Burns effect with audio reactivity
      const baseScale = img.startScale + (img.endScale - img.startScale) * eased;
      const audioPulse = 1 + audio.rms * 0.03; // Subtle pulse
      const scale = baseScale * audioPulse;
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
      
      // Never remove the last image - keep showing it indefinitely until a new one arrives
      if (this.images.length === 1) {
        // Let Ken Burns keep animating even past normal duration
        return true;
      }
      
      // Only remove old images when we have newer ones to replace them
      // Remove after duration + transition time, but only if not the newest image
      const extendedDuration = img.duration + this.transitionDuration;
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
    if (this.openaiApiKey || this.getimgApiKey) {
      // Background
      this.graphics.beginFill(0x000000, 0.6);
      this.graphics.drawRoundedRect(10, 10, 180, 30, 5);
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
      
      // Generating indicator (color indicates which model)
      if (this.isGenerating) {
        const genColor = this.useFlux ? 0x00ffff : 0x00ff88; // Cyan for Flux, Green for OpenAI
        this.graphics.beginFill(genColor, 0.8);
        this.graphics.drawCircle(75, 25, 5);
        this.graphics.endFill();
      }
      
      // Model indicator text (F for Flux, O for OpenAI)
      this.graphics.beginFill(this.useFlux ? 0x00ffff : 0x00ff88, 0.6);
      this.graphics.drawCircle(100, 25, 8);
      this.graphics.endFill();
      
      // Image count dots
      for (let i = 0; i < this.maxImages; i++) {
        const filled = i < this.images.length;
        this.graphics.beginFill(0xffffff, filled ? 0.8 : 0.2);
        this.graphics.drawCircle(125 + i * 20, 25, 4);
        this.graphics.endFill();
      }
      
      // Queue indicator (shows number of pending topics)
      if (this.pendingTopics.length > 0) {
        this.graphics.beginFill(0xffaa00, 0.6);
        this.graphics.drawCircle(170, 25, 8);
        this.graphics.endFill();
      }
      
      // Speech intensity visualization bar
      if (this.speechIntensity > 0.1) {
        const barWidth = 200;
        const barHeight = 8;
        const barX = this.context.width - barWidth - 20;
        const barY = 20;
        
        // Background
        this.graphics.beginFill(0x000000, 0.5);
        this.graphics.drawRoundedRect(barX, barY, barWidth, barHeight, 4);
        this.graphics.endFill();
        
        // Active speech indicator
        const activeWidth = barWidth * this.speechIntensity;
        this.graphics.beginFill(0x00ff88, 0.8);
        this.graphics.drawRoundedRect(barX, barY, activeWidth, barHeight, 4);
        this.graphics.endFill();
        
        // Transcript length indicator
        const transcriptProgress = Math.min(1, this.currentTranscript.length / 100);
        this.graphics.beginFill(0xffaa00, 0.6);
        this.graphics.drawRoundedRect(barX, barY + 12, barWidth * transcriptProgress, 4, 2);
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


