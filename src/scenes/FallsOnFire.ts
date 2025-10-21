import { Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { noise2D } from '../utils/noise';
import { randomRange } from '../utils/math';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  heat: number; // 0-1, determines color
  turbulence: number;
}

export class FallsOnFire implements Pattern {
  public name = 'Falls on Fire';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  private particles: FireParticle[] = [];
  private textOverlays: Text[] = [];
  private textTimer: number = 0;
  private textInterval: number = 12; // Show text every 12 seconds
  private videoSprite: Sprite | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private videoSprites: Sprite[] = [];
  private currentVideoIndex: number = 0;
  private crossfadeDuration: number = 2; // 2 second crossfade for 4-second video
  private crossfadeTimer: number = 0;
  private isCrossfading: boolean = false;
  private videoLayers: number = 4; // Use 4 video layers for ultra-smooth blending
  
  // Waterfall parameters
  private waterfallWidth: number = 400;
  private sourceY: number = -50;
  private spawnRate: number = 200; // Particles per second
  private maxParticles: number = 600;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    
    // Set up video background
    this.setupVideoBackground();
    
    this.container.addChild(this.graphics);
  }

  private setupVideoBackground(): void {
    try {
      // Create multiple video elements for ultra-smooth looping
      for (let i = 0; i < this.videoLayers; i++) {
        const videoElement = document.createElement('video');
        const timestamp = Date.now();
        videoElement.src = `/fallsonfire.mp4?v=${timestamp}`;
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        
        // Stagger video start times for smoother blending
        const offset = (i * this.crossfadeDuration) / this.videoLayers;
        videoElement.currentTime = Math.min(offset, 3.5); // Don't exceed video length
        
        // Add slight random offset for more natural blending
        const randomOffset = (Math.random() - 0.5) * 0.2; // ±0.1 second variation
        videoElement.currentTime = Math.max(0, Math.min(videoElement.currentTime + randomOffset, 3.5));
        
        // Start playing
        videoElement.play().catch(err => {
          console.warn('Video autoplay failed:', err);
        });
        
        // Create texture and sprite from video
        const texture = Texture.from(videoElement);
        const sprite = new Sprite(texture);
        
        // Position and scale the video to crop center
        this.updateVideoScale(sprite, videoElement);
        
        // Add slight transparency to blend with effects
        sprite.alpha = i === 0 ? 0.6 : 0; // Start with first video visible
        
        // Set different blend modes for each layer for sophisticated blending
        const blendModes = [0, 1, 2, 3]; // NORMAL, ADD, MULTIPLY, SCREEN
        sprite.blendMode = blendModes[i % blendModes.length];
        
        // Add as background layer
        this.container.addChildAt(sprite, 0);
        
        this.videoSprites.push(sprite);
        
        // Store video element reference
        if (i === 0) {
          this.videoElement = videoElement;
        }
      }
      
      // Set up seamless looping
      this.setupSeamlessLoop();
      
    } catch (err) {
      console.warn('Failed to load video background:', err);
    }
  }

  private setupSeamlessLoop(): void {
    if (!this.videoElement) return;
    
    // When video is about to loop, start crossfade
    this.videoElement.addEventListener('timeupdate', () => {
      const duration = this.videoElement!.duration;
      const currentTime = this.videoElement!.currentTime;
      
      // Only start crossfade if we have a valid duration and enough time
      if (duration > 0 && duration > this.crossfadeDuration && currentTime >= duration - this.crossfadeDuration) {
        this.startCrossfade();
      }
    });
  }

  private startCrossfade(): void {
    if (this.videoSprites.length < 2 || this.isCrossfading) return;
    
    // Mark as crossfading to prevent multiple triggers
    this.isCrossfading = true;
    
    // Reset crossfade timer
    this.crossfadeTimer = 0;
    
    // Switch to next video sprite
    this.currentVideoIndex = (this.currentVideoIndex + 1) % 2;
    
    // Reset the video element to start
    if (this.videoElement) {
      this.videoElement.currentTime = 0;
    }
  }

  private updateVideoScale(sprite?: Sprite, videoElement?: HTMLVideoElement): void {
    const targetSprite = sprite || this.videoSprite;
    const targetVideo = videoElement || this.videoElement;
    
    if (!targetSprite || !targetVideo) return;
    
    const videoWidth = targetVideo.videoWidth || 1920;
    const videoHeight = targetVideo.videoHeight || 1080;
    const screenWidth = this.context.width;
    const screenHeight = this.context.height;
    
    // Calculate scale to cover screen (crop center)
    const scaleX = screenWidth / videoWidth;
    const scaleY = screenHeight / videoHeight;
    const scale = Math.max(scaleX, scaleY);
    
    targetSprite.scale.set(scale);
    
    // Center the video
    targetSprite.x = (screenWidth - videoWidth * scale) / 2;
    targetSprite.y = (screenHeight - videoHeight * scale) / 2;
  }

  private maximumSmoothStep(t: number): number {
    // Maximum smoothness using triple-nested easing curves
    // Creates the smoothest possible transition for video blending
    const smooth1 = t * t * (3 - 2 * t);
    const smooth2 = smooth1 * smooth1 * (3 - 2 * smooth1);
    const smooth3 = smooth2 * smooth2 * (3 - 2 * smooth2);
    
    // Add additional smoothing with sine wave for natural motion
    const sineSmooth = Math.sin(smooth3 * Math.PI * 0.5);
    return sineSmooth;
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Update video scale if needed
    if (this.videoSprites.length > 0 && this.videoElement && this.videoElement.videoWidth > 0) {
      this.videoSprites.forEach(sprite => this.updateVideoScale(sprite, this.videoElement!));
    }
    
    // Handle crossfade between video loops with maximum smoothness
    if (this.crossfadeTimer > 0) {
      this.crossfadeTimer += dt;
      
      if (this.videoSprites.length >= 2) {
        const fadeProgress = Math.min(this.crossfadeTimer / this.crossfadeDuration, 1);
        
        // Use ultra-smooth easing with multiple layers
        const smoothProgress = this.maximumSmoothStep(fadeProgress);
        
        // Fade between all video layers for maximum smoothness
        for (let i = 0; i < this.videoSprites.length; i++) {
          const sprite = this.videoSprites[i];
          if (!sprite) continue;
          
          // Calculate alpha based on layer position and crossfade progress
          const layerProgress = (i - this.currentVideoIndex + this.videoSprites.length) % this.videoSprites.length;
          const normalizedLayer = layerProgress / (this.videoSprites.length - 1);
          
          // Create smooth transition between layers with enhanced blending
          let alpha = 0;
          
          if (layerProgress === 0) {
            // Current layer - fade out with smooth curve
            alpha = 0.6 * (1 - smoothProgress);
          } else if (layerProgress === 1) {
            // Next layer - fade in with smooth curve
            alpha = 0.6 * smoothProgress;
          } else if (layerProgress === 2) {
            // Third layer - subtle fade in for extra smoothness
            alpha = 0.6 * 0.3 * smoothProgress;
          } else if (layerProgress === 3) {
            // Fourth layer - very subtle presence
            alpha = 0.6 * 0.1 * smoothProgress;
          } else {
            // Other layers - maintain very low alpha for smooth blending
            alpha = 0.6 * 0.05 * (1 - Math.abs(normalizedLayer - 0.5) * 2);
          }
          
          // Add slight variation for more natural blending
          const variation = 0.9 + (Math.sin(i * 0.5 + this.time * 2) * 0.1);
          alpha *= variation;
          
          sprite.alpha = Math.max(0, Math.min(0.6, alpha));
        }
        
        // Reset crossfade when complete
        if (fadeProgress >= 1) {
          this.crossfadeTimer = 0;
          this.isCrossfading = false;
        }
      }
    }
    
    // Update text timer
    this.textTimer += dt;
    if (this.textTimer >= this.textInterval) {
      this.textTimer = 0;
      this.spawnTextOverlay();
    }
    
    // Position waterfall at cursor or center
    const centerX = input.isDragging ? input.x : this.context.width / 2;
    
    // Spawn fire particles from top (waterfall source)
    const audioBoost = 1 + audio.bass * 0.5;
    const particlesToSpawn = Math.floor(this.spawnRate * dt * audioBoost);
    
    for (let i = 0; i < particlesToSpawn && this.particles.length < this.maxParticles; i++) {
      const offsetX = (Math.random() - 0.5) * this.waterfallWidth;
      
      this.particles.push({
        x: centerX + offsetX,
        y: this.sourceY,
        vx: (Math.random() - 0.5) * 20,
        vy: randomRange(200, 400), // Falling speed
        life: 1,
        maxLife: randomRange(2, 4),
        size: randomRange(8, 20),
        heat: randomRange(0.7, 1),
        turbulence: Math.random() * 2,
      });
    }
    
    // Update particles
    this.particles.forEach(p => {
      // Apply turbulence using Perlin noise
      const noiseX = noise2D(p.x * 0.01, p.y * 0.01 + this.time * 2);
      const noiseY = noise2D(p.x * 0.01 + 100, p.y * 0.01 + this.time * 2);
      
      p.vx += noiseX * 100 * dt * p.turbulence;
      p.vy += noiseY * 50 * dt * p.turbulence;
      
      // Apply velocity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Gravity
      p.vy += 100 * dt;
      
      // Air resistance
      p.vx *= 0.99;
      p.vy *= 0.995;
      
      // Cool down and fade
      p.life -= dt / p.maxLife;
      p.heat -= dt * 0.3;
      
      // Audio reactivity - heat pulse
      p.heat += audio.beat ? 0.2 : 0;
      p.heat = Math.min(1, p.heat);
    });
    
    // Remove dead particles
    this.particles = this.particles.filter(p => p.life > 0 && p.y < this.context.height + 100);
    
    // Update text overlays
    this.textOverlays.forEach(text => {
      const data = (text as any).userData;
      if (data) {
        data.age += dt;
        
        // Fade in
        if (data.age < 1) {
          text.alpha = data.age;
        }
        // Stay visible
        else if (data.age < 4) {
          text.alpha = 1;
        }
        // Fade out
        else if (data.age < 6) {
          text.alpha = 1 - (data.age - 4) / 2;
        }
        // Remove
        else {
          text.alpha = 0;
        }
        
        // Subtle drift
        text.y += dt * 10;
        text.x += Math.sin(data.age * 2) * dt * 5;
      }
    });
    
    // Remove old text overlays
    this.textOverlays = this.textOverlays.filter(text => {
      const data = (text as any).userData;
      if (data && data.age > 6) {
        this.container.removeChild(text);
        text.destroy();
        return false;
      }
      return true;
    });
    
    this.draw(audio);
  }

  private spawnTextOverlay(): void {
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 72,
      fontWeight: 'bold',
      fill: ['#ff6600', '#ff0000'], // Gradient: orange to red
      stroke: '#000000',
      strokeThickness: 4,
      dropShadow: true,
      dropShadowColor: '#ff4400',
      dropShadowBlur: 20,
      dropShadowAngle: Math.PI / 2,
      dropShadowDistance: 0,
    });
    
    // Randomly choose between "FALLS ON FIRE" and "Camp Imagine"
    const textContent = Math.random() > 0.5 ? 'FALLS ON FIRE' : 'Camp Imagine';
    
    const text = new Text(textContent, style);
    text.anchor.set(0.5, 0.5);
    text.x = this.context.width / 2 + (Math.random() - 0.5) * 100;
    text.y = this.context.height / 2 + (Math.random() - 0.5) * 200;
    text.alpha = 0;
    text.rotation = (Math.random() - 0.5) * 0.2;
    
    // Store age data
    (text as any).userData = { age: 0 };
    
    this.container.addChild(text);
    this.textOverlays.push(text);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();
    
    // Draw particles with fire colors
    this.particles.forEach(p => {
      const alpha = p.life * (0.6 + audio.rms * 0.4);
      
      // Color based on heat: white -> yellow -> orange -> red -> dark red
      let color: number;
      if (p.heat > 0.8) {
        // White hot
        color = 0xffffff;
      } else if (p.heat > 0.6) {
        // Yellow
        color = 0xffff00;
      } else if (p.heat > 0.4) {
        // Orange
        color = 0xff8800;
      } else if (p.heat > 0.2) {
        // Red
        color = 0xff3300;
      } else {
        // Dark red / smoke
        color = 0x880000;
      }
      
      const size = p.size * p.life * (1 + audio.treble * 0.3);
      
      // Glow
      this.graphics.beginFill(color, alpha * 0.3);
      this.graphics.drawCircle(p.x, p.y, size * 1.5);
      this.graphics.endFill();
      
      // Core
      this.graphics.beginFill(color, alpha);
      this.graphics.drawCircle(p.x, p.y, size);
      this.graphics.endFill();
      
      // Hot center
      if (p.heat > 0.7) {
        this.graphics.beginFill(0xffffff, alpha * 0.8);
        this.graphics.drawCircle(p.x, p.y, size * 0.4);
        this.graphics.endFill();
      }
    });
    
  }

  public destroy(): void {
    // Clean up text overlays
    this.textOverlays.forEach(text => {
      this.container.removeChild(text);
      text.destroy();
    });
    this.textOverlays = [];
    
    // Clean up video
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement = null;
    }
    this.videoSprites.forEach(sprite => {
      sprite.destroy();
    });
    this.videoSprites = [];
    this.videoSprite = null;
    
    this.graphics.destroy();
    this.container.destroy();
  }
}

