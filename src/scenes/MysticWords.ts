import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

interface TextParticle {
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
}

interface SacredWord {
  text: string;
  x: number;
  y: number;
  angle: number; // Orbit angle
  radius: number; // Orbit radius
  angularVelocity: number;
  alpha: number;
  hue: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface AppearingText {
  text: string;
  x: number;
  y: number;
  revealIndex: number; // How many letters are revealed
  revealSpeed: number; // Letters per second
  hue: number;
  alpha: number;
  ripplePhase: number; // For ripple effect
}

export class MysticWords implements Pattern {
  public name = 'Mystic Words';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private time: number = 0;
  
  // Particles from disintegrated words
  private particles: TextParticle[] = [];
  
  // Words spawned by clicks that orbit
  private orbiting: SacredWord[] = [];
  
  // Words appearing letter by letter
  private appearing: AppearingText[] = [];
  
  // Reusable text objects pool to prevent memory leaks
  private textObjects: Text[] = [];
  
  // Collections of sacred text
  private readonly hebrewWords = ['אור', 'חיים', 'שלום', 'אהבה', 'חכמה', 'אמת', 'ברכה', 'קדוש'];
  private readonly runeWords = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
  private readonly poetryWords = [
    'BREATH', 'LIGHT', 'VOID', 'FLOW', 'PULSE', 'ECHO',
    'SOUL', 'DREAM', 'TIME', 'SPACE', 'TRUTH', 'PEACE'
  ];
  
  private lastSpawnTime: number = 0;
  private lastBassHit: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    // Start with a few appearing words
    this.spawnAppearingText();
    this.spawnAppearingText();
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;
    
    // Spawn new appearing text periodically (reduced frequency and max count)
    this.lastSpawnTime += dt;
    if (this.lastSpawnTime > 4 + Math.random() * 3 && this.appearing.length < 3) {
      this.spawnAppearingText();
      this.lastSpawnTime = 0;
    }
    
    // Update appearing text (letter by letter reveal)
    this.appearing.forEach(text => {
      text.revealIndex += text.revealSpeed * dt * (1 + audio.mid * 2);
      text.ripplePhase += dt * 2;
      text.hue = (text.hue + dt * 10 + audio.treble * 20) % 360;
      
      // If fully revealed, start fading
      if (text.revealIndex >= text.text.length) {
        text.alpha *= 0.98;
      }
    });
    
    // Remove faded appearing text
    this.appearing = this.appearing.filter(t => t.alpha > 0.01);
    
    // Bass hit detection - disintegrate appearing text
    if (audio.bass > 0.7 && this.time - this.lastBassHit > 0.3) {
      this.lastBassHit = this.time;
      
      // Disintegrate all appearing text
      this.appearing.forEach(text => {
        const revealedText = text.text.substring(0, Math.floor(text.revealIndex));
        this.disintegrateWord(revealedText, text.x, text.y, text.hue);
      });
      this.appearing = [];
    }
    
    // Update particles
    this.particles.forEach(p => {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += 50 * dt; // Gravity
      p.alpha *= 0.97;
      p.life += dt;
      p.hue = (p.hue + dt * 30 + audio.centroid * 50) % 360;
    });
    
    // Remove dead particles
    this.particles = this.particles.filter(p => p.alpha > 0.01 && p.life < p.maxLife);
    
    // Update orbiting words
    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;
    
    this.orbiting.forEach(word => {
      word.angle += word.angularVelocity * dt;
      word.life += dt;
      word.hue = (word.hue + dt * 20 + audio.treble * 40) % 360;
      
      // Scale with audio
      word.scale = 1 + audio.rms * 0.3 + (audio.beat ? 0.2 : 0);
      
      // Fade out towards end of life
      const lifeProgress = word.life / word.maxLife;
      if (lifeProgress > 0.8) {
        word.alpha *= 0.97;
      }
      
      // Update position (orbit)
      word.x = centerX + Math.cos(word.angle) * word.radius;
      word.y = centerY + Math.sin(word.angle) * word.radius;
    });
    
    // Remove dead orbiting words
    this.orbiting = this.orbiting.filter(w => w.alpha > 0.01);
    
    // Mouse click spawns sacred words
    if (input.clicks.length > 0) {
      input.clicks.forEach(click => {
        this.spawnOrbitingWord(click.x, click.y);
      });
    }

    this.draw(audio, input);
  }
  
  private spawnAppearingText(): void {
    const { width, height } = this.context;
    
    // Choose random word collection
    const collections = [this.hebrewWords, this.poetryWords];
    const collection = collections[Math.floor(Math.random() * collections.length)];
    const text = collection[Math.floor(Math.random() * collection.length)];
    
    this.appearing.push({
      text,
      x: width * (0.2 + Math.random() * 0.6),
      y: height * (0.2 + Math.random() * 0.6),
      revealIndex: 0,
      revealSpeed: 2 + Math.random() * 3, // 2-5 letters per second
      hue: Math.random() * 360,
      alpha: 1,
      ripplePhase: 0,
    });
  }
  
  private spawnOrbitingWord(x: number, y: number): void {
    const centerX = this.context.width / 2;
    const centerY = this.context.height / 2;
    
    // Calculate orbit parameters
    const dx = x - centerX;
    const dy = y - centerY;
    const angle = Math.atan2(dy, dx);
    const radius = Math.hypot(dx, dy);
    
    // Choose a sacred word (mix of all types)
    const allWords = [...this.hebrewWords, ...this.runeWords, ...this.poetryWords];
    const text = allWords[Math.floor(Math.random() * allWords.length)];
    
    this.orbiting.push({
      text,
      x,
      y,
      angle,
      radius: Math.max(50, radius),
      angularVelocity: (Math.random() - 0.5) * 1.5,
      alpha: 1,
      hue: Math.random() * 360,
      life: 0,
      maxLife: 8 + Math.random() * 7,
      scale: 1,
    });
  }
  
  private disintegrateWord(text: string, x: number, y: number, baseHue: number): void {
    const charSpacing = 20;
    const startX = x - (text.length * charSpacing) / 2;
    
    // Create particles for each character (reduced from 3 to 1 per character)
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const px = startX + i * charSpacing;
      
      // Only 1 particle per character for performance
      this.particles.push({
        char,
        x: px + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 10 - 5,
        alpha: 1,
        size: 16 + Math.random() * 8,
        hue: (baseHue + Math.random() * 60 - 30) % 360,
        life: 0,
        maxLife: 2 + Math.random() * 2,
      });
    }
  }

  private draw(audio: AudioData, _input: InputState): void {
    this.graphics.clear();
    
    // Clear all text objects from previous frame
    this.textObjects.forEach(text => {
      text.destroy({ children: true, texture: false, baseTexture: false });
    });
    this.textObjects = [];
    
    // Draw appearing text (letter by letter)
    this.appearing.forEach(text => {
      const revealedCount = Math.floor(text.revealIndex);
      const revealedText = text.text.substring(0, revealedCount);
      
      for (let i = 0; i < revealedText.length; i++) {
        const char = revealedText[i];
        
        // Ripple effect based on letter index and time
        const rippleOffset = Math.sin(text.ripplePhase - i * 0.5) * 5;
        const charX = text.x + i * 20;
        const charY = text.y + rippleOffset;
        
        // Oscillation with audio
        const oscillation = Math.sin(this.time * 3 + i) * 3 * audio.mid;
        
        const color = this.hslToHex(text.hue + i * 15, 100, 60);
        const alpha = text.alpha * (0.7 + audio.rms * 0.3);
        
        // Draw glow
        this.drawChar(char, charX, charY + oscillation, 32, color, alpha * 0.3);
        // Draw main
        this.drawChar(char, charX, charY + oscillation, 24, color, alpha);
      }
      
      // Draw revealing letter with pulse
      if (revealedCount < text.text.length) {
        const char = text.text[revealedCount];
        const charX = text.x + revealedCount * 20;
        const pulse = 1 + Math.sin(this.time * 10) * 0.3;
        const color = this.hslToHex(text.hue + revealedCount * 15, 100, 70);
        
        this.drawChar(char, charX, text.y, 24 * pulse, color, 0.5 + Math.sin(this.time * 10) * 0.5);
      }
    });
    
    // Draw particles (disintegrated characters)
    this.particles.forEach(p => {
      const color = this.hslToHex(p.hue, 100, 60);
      const alpha = p.alpha * (0.5 + audio.treble * 0.5);
      
      // Glow
      this.drawChar(p.char, p.x, p.y, p.size * 1.3, color, alpha * 0.3);
      // Main
      this.drawChar(p.char, p.x, p.y, p.size, color, alpha);
    });
    
    // Draw orbiting words
    this.orbiting.forEach(word => {
      const color = this.hslToHex(word.hue, 100, 60);
      const size = 28 * word.scale;
      
      // Draw each character
      for (let i = 0; i < word.text.length; i++) {
        const char = word.text[i];
        const charX = word.x + (i - word.text.length / 2) * 22 * word.scale;
        const charY = word.y;
        
        // Glow
        this.drawChar(char, charX, charY, size * 1.5, color, word.alpha * 0.3);
        // Main
        this.drawChar(char, charX, charY, size, color, word.alpha);
        
        // Bright core
        this.drawChar(char, charX, charY, size * 0.7, 0xffffff, word.alpha * 0.5);
      }
    });
  }
  
  private drawChar(char: string, x: number, y: number, size: number, color: number, alpha: number): void {
    // Create text object
    const style = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: size,
      fill: color,
      align: 'center',
    });
    
    const text = new Text(char, style);
    text.alpha = alpha;
    text.x = x - text.width / 2;
    text.y = y - text.height / 2;
    
    this.container.addChild(text);
    
    // Track for cleanup
    this.textObjects.push(text);
  }

  private hslToHex(h: number, s: number, l: number): number {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    
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

    const red = Math.max(0, Math.min(255, Math.round((r + m) * 255)));
    const green = Math.max(0, Math.min(255, Math.round((g + m) * 255)));
    const blue = Math.max(0, Math.min(255, Math.round((b + m) * 255)));

    return (red << 16) | (green << 8) | blue;
  }

  public destroy(): void {
    // Clean up all text objects
    this.textObjects.forEach(text => {
      text.destroy({ children: true, texture: true, baseTexture: true });
    });
    this.textObjects = [];
    
    this.graphics.destroy();
    this.container.destroy();
  }
}

