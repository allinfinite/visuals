# Interactive Visual Canvas

A unified canvas architecture for TeamLabs-style generative visuals built with TypeScript, PixiJS, and WebGL2.

![Visual Canvas](https://img.shields.io/badge/Status-Active-success)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![PixiJS](https://img.shields.io/badge/PixiJS-7.3-pink)

## Features

- **68 Visual Patterns**: Particle systems, sacred geometry, cosmic effects, nature & creatures, and more
- **Multi-Layer Composition System**: Randomly mix and blend multiple patterns simultaneously
  - **🖱️ All layers respond to mouse/clicks**: Every active pattern reacts to your interactions
  - **Real-time monitoring**: See which patterns are currently active
- **Feedback Trails System**: Beautiful layering effect where visuals gradually fade, creating ambient compositions
- **Pattern Pool Selection**: Choose which patterns are available for the composition system
- **Autonomous Animation**: All patterns animate continuously without user interaction
- **Smooth Motion System**: Advanced interpolation and frame-time smoothing for buttery-smooth animations
  - Audio data smoothing with exponential averaging
  - Frame-time rolling average for consistent motion
  - Adaptive motion blur via feedback buffer
- **Audio Reactive**: Real-time response to microphone input via Web Audio API
- **Mouse Interactive**: Cursor position, clicks, and drags influence visuals
- **Real-time Parameter Control**: Tweakpane UI for live adjustments
  - Trail length control (creates natural motion blur)
  - Layer duration and spawn intervals
  - Max simultaneous layers
  - Pattern pool toggles
- **60 FPS Performance**: Optimized WebGL rendering with high-performance GPU mode
- **Ambient Mode**: Perfect for display installations - run for hours with evolving visuals

## Implemented Patterns

### Particle & Field Systems
- **Particle Swarm** - Verlet-integrated particles with curl noise flow fields
- **Smoke Trails** - Alpha-blended particles with Perlin noise flow
- **Magnetic Lines** - Field visualization with curl noise
- **Fireflies** - Glowing sprites with sine wave flicker
- **Fluid Ink** - Simplified Navier-Stokes fluid simulation with velocity fields and dye injection

### Sacred Geometry
- **Mandala** - Radial instancing with symmetry
- **Flower of Life** - Layered circles pattern
- **Kaleidoscope** - Multi-segment mirrored patterns with noise offset
- **Symmetry Mirrors** - Multi-axis reflection with rotational and horizontal/vertical symmetry
- **Cymatics** - Chladni plate patterns with oscillating frequency modes

### Light & Energy
- **Aurora Curtain** - Layered sine wave bands with spectral color shifts
- **Plasma Arcs** - Perlin-displaced electrical arcs between nodes
- **Strobe Halo** - Beat-reactive expanding ring pulses with ray bursts
- **Radiant Grid** - Audio-driven point lights in grid formation
- **Lens Flares** - Additive bloom rings with rotating ray bursts and hexagonal aperture

### Abstract Motion
- **Vector Flow Field** - Visualized curl noise field with arrows
- **Ribbon Trails** - Smooth spline ribbons following targets
- **Wave Curves** - Sine-modulated Bézier lines deformed by frequency
- **Grid Pulses** - Uniform grid brightness oscillation
- **Circuit Pulses** - Edge-routing graph with traveling sparks

### Elemental
- **Lightning** - L-system branching with beat triggers
- **Rain Ripples** - Circle SDF expansion with droplet density
- **Fire Plume** - Particle + heat distortion with buoyancy
- **Snow Drift** - Simple particle gravity with crystalline patterns
- **Ocean Waves** - Sine field with layered depth and foam
- **Dust Storm** - Brownian particles with directional wind and motion blur

### Cosmic
- **Starfield** - 3D star projection with speed sync
- **Orbit System** - Hierarchical planetary motion with satellites
- **Nebula** - Fractal noise volume rendering (cosmic gas clouds)
- **Constellations** - Connect click points with glowing lines
- **Black Hole** - Radial accretion disk with orbital physics
- **Supernova** - Expanding particle shell explosions

### Fluid/Paint
- **Metaballs** - SDF blending with organic liquid motion
- **Watercolor Fade** - Paint strokes with blur feedback and pigment diffusion
- **Audio Paint** - Interactive painting with audio-reactive brush width and auto-generation
- **Liquid Color Blobs** - Enhanced metaballs with fluid attraction dynamics and color mixing

### Emotional/Mood
- **Minimal Dots** - Sparse particles drifting with breathing rhythm
- **Gradient Clouds** - Layered noise with RMS-driven hue rotation
- **Glitch Bursts** - Chromatic aberration blocks triggered by amplitude spikes
- **Chromatic Bloom** - RGB-separated blooming particles with audio-driven offset

### Organic/Biological
- **Mycelium Growth** - Branching network with recursive growth
- **L-System Plants** - Procedural vegetation using string rewriting
- **Flocking Creatures** - Boids algorithm with autonomous behavior
- **Butterfly Swarms** - Flocking butterflies with wing animation and swarm behavior
- **Zooming Doves** - 3D perspective birds flying towards camera with motion blur
- **Yokai Parade** - Japanese spirit procession with 5 different yokai types
- **Coral Growth** - Branching reef structure with color gradients and polyps
- **Neural Network** - Multi-layer network visualization with signal propagation
- **Cellular Automata** - Conway's Game of Life with audio-reactive evolution

### Mystical/Symbolic
- **Sigil Glyphs** - Procedural magical symbols spawned on click with intricate geometry
- **Glyph Orbit** - Symbolic shapes orbiting cursor with 10 unique glyph types
- **Faces in Noise** - Pareidolia effect creating organic faces from Perlin noise
- **Silhouette Particles** - Human/creature shapes that disintegrate and reform

### Visual Illusions
- **Moiré Rotation** - Overlapping line patterns creating interference effects
- **Recursive Tiles** - Fractal subdivision with dynamic zoom and rotation
- **Impossible Geometry** - Optical illusions (Penrose triangle, impossible cube, Escher stairs, Blivet fork, Necker cube)

### 3D Geometry
- **Rotating Polyhedra** - 2D-projected 3D shapes (cube, tetrahedron, octahedron, icosahedron, dodecahedron)
- **Point Cloud Morph** - 500 particles morphing between 8 formations (sphere, cube, torus, spiral, wave, DNA helix, lattice, galaxy)
- **Wireframe Tunnel** - 3D perspective tunnel with polygon rings moving through depth
- **Feedback Fractal** - Recursive layered geometry with 5 concentric shape formations
- **Mirror Room** - Kaleidoscope reflections with rotational symmetry and audio-driven reflectivity

### Text & Glyphs
- **Audio Poetry** - Abstract geometric "letters" appearing on beat with spectrum-based colors
- **Latent Morphs** - Procedural texture crossfading with 6 generation types (radial gradient, noise field, concentric rings, Voronoi-like, Perlin blobs, spectral bands)
- **Word Ripples** - Grid of abstract glyphs displaced by ripple waves with sine-based distortion

### Environmental/Temporal
- **Day Night Cycle** - Animated sky with sun/moon transitions and audio-driven timing
- **Terrain Morph** - Dynamic landscape with multi-octave noise and bass-driven peaks
- **Weather Sync** - Atmospheric particles (rain/snow/fog) determined by audio mood

### Interactive/Cursor
- **Shadow Trails** - Cursor-following motion blur with velocity-reactive sizing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The dev server will start at `http://localhost:3000`. The page will hot-reload as you edit files.

## Usage

### Mouse Interaction
- **Move**: Affects attraction/repulsion in particle systems
- **Click**: Spawns bursts, changes seeds, triggers effects
- **Drag**: Creates trails in smoke/paint systems

### Audio Reactivity
1. Open the Tweakpane UI (top-right)
2. Enable "Enable Microphone" in the Audio section
3. Grant microphone permissions
4. Play music or make sounds to see audio-reactive effects

### Pattern Switching
Use the dropdown in the Tweakpane UI to switch between patterns.

### Multi-Layer Composition System
Create complex, evolving visual compositions by mixing patterns:
- **Enable Multi-Layer**: Toggle composition mode on/off
- **🖱️ Interactive**: All active layers respond to mouse movements and clicks simultaneously
- **Active Layer Monitor**: See in real-time which patterns are currently running
- **Pattern Pool**: Check/uncheck which patterns can appear in the mix
- **Max Layers**: Control how many patterns run simultaneously (1-3)
- **Layer Duration**: How long each pattern stays visible (5-60s)
- **Spawn Interval**: Time between new patterns appearing (2-30s)
- Patterns fade in and out smoothly
- Combined with trails for beautiful, painterly effects

### Trail/Feedback System
The visual canvas uses a feedback buffer system that creates beautiful trailing effects:
- **Enable Trails**: Toggle the feedback system on/off
- **Trail Length**: Adjust from 1-100 (higher = longer, more ethereal trails)
- Patterns layer on top of each other, creating evolving compositions
- Perfect for ambient display - visuals continuously evolve over hours

### Usage Modes
1. **Single Pattern Mode**: Traditional - one pattern at a time (default)
2. **Multi-Layer Mode**: Advanced - multiple patterns blend and evolve automatically

## Technical Approach

### Smooth Motion System
Multiple layers of smoothing ensure buttery-smooth, fluid motion:

1. **Audio Data Smoothing**: Exponential averaging prevents jerky reactions to audio changes
   ```typescript
   // In Audio.ts
   this.data.rms = this.prevData.rms * 0.7 + this.data.rms * 0.3;
   ```

2. **Frame Time Smoothing**: Rolling average of delta time prevents frame-to-frame jitter
   ```typescript
   // In Clock.ts
   this.frameTimeHistory.push(dt);
   const avgDt = this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length;
   ```

3. **Adaptive Motion Blur**: Feedback buffer creates natural motion blur as objects move

### Trail/Feedback System
Inspired by analog video feedback, the system renders the scene to a backbuffer, then draws a semi-transparent black rectangle over it before the next frame:

```typescript
// In App.ts loop
this.renderer.app.renderer.render(stage);

// Draw fade overlay
const fadeGraphics = this.sceneManager.getFadeGraphics();
fadeGraphics.clear();
fadeGraphics.beginFill(0x000000, this.feedbackAlpha); // 0.01-0.2
fadeGraphics.drawRect(0, 0, width, height);
fadeGraphics.endFill();
```

This creates a "memory" effect where:
- Previous frames gradually fade out
- Trails form behind moving objects
- Multiple patterns can layer naturally
- Lower alpha = longer trails = more "memory"
- Acts as natural motion blur

Combined with the multi-layer composition system, this creates ever-evolving, painterly visuals that can run for hours without repeating.

## Project Structure

```
src/
├── core/
│   ├── App.ts              # Main application loop
│   ├── Renderer.ts         # WebGL renderer context
│   ├── Audio.ts            # Audio analysis (FFT, beat detection)
│   ├── Input.ts            # Mouse/pointer input handling
│   ├── Clock.ts            # Delta time and BPM sync
│   ├── SceneManager.ts     # Pattern lifecycle management
│   ├── ParamPane.ts        # Tweakpane UI
│   └── PostFX.ts           # Post-processing effects
├── scenes/
│   ├── ParticleSwarm.ts    # Pattern implementations
│   ├── SmokeTrails.ts
│   ├── MagneticLines.ts
│   ├── Fireflies.ts
│   ├── Mandala.ts
│   ├── FlowerOfLife.ts
│   ├── Aurora.ts
│   ├── Starfield.ts
│   ├── VectorFlow.ts
│   └── Lightning.ts
├── utils/
│   ├── math.ts             # Vector math utilities
│   ├── noise.ts            # Simplex noise functions
│   ├── easing.ts           # Easing functions
│   ├── random.ts           # Seeded random generators
│   └── smooth.ts           # Value smoothing and interpolation
├── types.ts                # TypeScript interfaces
└── main.ts                 # Entry point
```

## Creating New Patterns

Implement the `Pattern` interface:

```typescript
import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';

export class MyPattern implements Pattern {
  public name = 'My Pattern';
  public container: Container;
  private graphics: Graphics;

  constructor(private context: RendererContext) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    // Update logic here
    // - dt: delta time in seconds
    // - audio: spectrum, RMS, bass, mid, treble, beat, BPM
    // - input: x, y, isDown, isDragging, clicks
    
    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear();
    // Draw logic here
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
```

Then register it in `main.ts`:

```typescript
import { MyPattern } from './scenes/MyPattern';
sceneManager.addPattern(new MyPattern(context));
```

## Audio Data Structure

```typescript
interface AudioData {
  spectrum: Float32Array;  // 32-band log-mapped spectrum (0-1)
  rms: number;             // Overall volume (0-1)
  bass: number;            // Low frequency energy (0-1)
  mid: number;             // Mid frequency energy (0-1)
  treble: number;          // High frequency energy (0-1)
  centroid: number;        // Spectral centroid - brightness (0-1)
  beat: boolean;           // Beat detected this frame
  bpm: number;             // Estimated BPM (default: 120)
}
```

## Performance Tips

- Use `devicePixelRatio` capping (set to 1.5 by default)
- Batch draw calls when possible
- Limit particle counts based on device capability
- Use object pooling for frequently created/destroyed objects
- Profile with browser DevTools Performance tab

## Technologies

- **TypeScript** - Type-safe development
- **PixiJS** - WebGL rendering engine
- **Vite** - Fast build tool and dev server
- **Tweakpane** - Parameter UI controls
- **gl-matrix** - High-performance vector math
- **simplex-noise** - Perlin/simplex noise generation
- **bezier-easing** - Smooth easing functions
- **alea** - Seeded pseudo-random number generation

## Roadmap

See [prd.md](./prd.md) for the complete list of planned patterns:

- [ ] Organic/Biological (Mycelium, L-Systems, Coral Growth, Cellular Automata, Neural Networks, Flocking)
- [ ] More Sacred Geometry (Kaleidoscope, Cymatics)
- [ ] More Light/Energy (Lens Flares, Strobe Halo, Plasma Arcs, Radiant Grid)
- [ ] More Abstract Motion (Ribbon Trails, Wave Curves, Grid Pulses, Circuit Pulses)
- [ ] More Elemental (Fire, Rain, Snow, Ocean, Dust Storm)
- [ ] More Cosmic (Orbit Systems, Black Hole, Supernova, Nebula, Constellations)
- [ ] Fluid/Paint Systems
- [ ] 3D Projection (Polyhedra, Point Cloud, Wireframe Tunnel)
- [ ] Text/Symbol Reactivity
- [ ] Emotional/Mood Fields
- [ ] Temporal Systems (Day/Night Cycle, Weather)
- [ ] Visual Illusions (Moiré, Recursive, Impossible Geometry)

## License

MIT License - feel free to use this project for learning, experimentation, or commercial purposes.

## Credits

Built with inspiration from TeamLabs' immersive digital art installations.

