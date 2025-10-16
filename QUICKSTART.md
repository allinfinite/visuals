# Quick Start Guide

This project features **63 unique visual patterns** that react to audio and mouse input.

## Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser to `http://localhost:3000`

## First Steps

1. **Just watch** - All patterns animate automatically with beautiful trails
2. **Move your mouse** - Influence particle flow and interactions
3. **Click anywhere** - Spawn bursts, change patterns, trigger effects
4. **Drag** - Paint trails and create smoke effects
5. **Open Tweakpane** (top-right) - Switch between 63 patterns
6. **Adjust Trail Length** - Control how long visual elements persist (1-100)
7. **Enable Audio** - Grant microphone access to make visuals react to sound

## 🎨 Multi-Layer Composition Mode

**NEW!** Enable the ultimate generative art experience:

1. Toggle **"Enable Multi-Layer"** in the Composition Mode section
2. Patterns will now randomly fade in and out, layering on top of each other
3. Select which patterns are available in the **Pattern Pool** checkboxes (24 total!)
4. Adjust settings:
   - **Max Layers**: How many patterns can be active simultaneously (1-5)
   - **Layer Duration**: How long each pattern stays visible (5-60s)
   - **Spawn Interval**: Time between new patterns appearing (2-30s)

Perfect for installations and screensavers:
- Multiple patterns blend and mix automatically
- Each layer fades in/out smoothly
- Trails create evolving, layered compositions
- Visuals never repeat exactly - always unique
- Can run for hours creating ambient atmospheres
- Adjust trail length for different moods (short = energetic, long = ethereal)

**Example Setup:**
- Enable Multi-Layer: ✓
- Max Layers: 3
- Layer Duration: 20s
- Spawn Interval: 8s
- Enable: Particle Swarm, Fireflies, Aurora, Starfield
- Trail Length: 60

= Ethereal cosmic composition with particles, fireflies, and aurora layers constantly evolving!

## Pattern Overview (24 Total)

### 🌊 Particle Swarm
Verlet-integrated particles with curl noise flow fields. Attracts to cursor, repels on click.

### 🌫️ Nebula
Fractal noise volume rendering creates cosmic gas clouds. Colors shift with audio spectrum.

### 🎀 Ribbon Trails  
Smooth spline ribbons that follow the cursor and targets. Width modulated by audio amplitude.

### 🪐 Orbit System
Hierarchical planetary system with satellites. Click to add planets. Rotation speed syncs to BPM.

### ⚡ Plasma Arcs
Electrical arcs between nodes with Perlin displacement. Click endpoints to create custom arcs.

### 〰️ Wave Curves
Multiple layered sine waves deformed by frequency bands. Creates flowing harmonic patterns.

### 💨 Smoke Trails
Paint smoke trails by dragging. Click for bursts. Follows Perlin noise flow field.

### 🧲 Magnetic Lines
Flow field visualization. Cursor acts as magnetic pole. Lines follow curl noise.

### ✨ Fireflies
Glowing sprites with sine wave flicker. Blink to audio beats. Click spawns clusters.

### 🌸 Mandala
Radial sacred geometry. Click to change seed. Vibrates to bass frequencies.

### 🌺 Flower of Life
Ancient geometric pattern with overlapping circles. Pulses to audio.

### 🌈 Aurora Curtain
Layered sine waves with spectral colors. Modulated by audio spectrum.

### ⭐ Starfield Zoom
3D star projection tunnel. Speed syncs to tempo and audio energy.

### 🌀 Vector Flow Field
Visualized curl noise with directional arrows. Flow speed matches tempo.

### ⚡ Lightning
L-system branching bolts. Click to define strike origin. Auto-triggers on beats.

### 🍄 Mycelium Growth
Organic branching network. Growth speed driven by audio energy. Click to seed new growth.

### 🌿 L-System Plants
Procedural plant generation using string rewriting. Click to plant seeds. Grows over time.

### 🐦 Flocking Creatures
Boids algorithm with separation, alignment, cohesion. Click spawns flocks. Audio affects movement.

## Audio Reactivity

When microphone is enabled:
- **Bass** (low frequencies) → Size, amplitude, speed
- **Mid** (mid frequencies) → Opacity, density, flow
- **Treble** (high frequencies) → Brightness, sparkle, detail
- **Beat Detection** → Pulses, flashes, spawns
- **Spectral Centroid** → Color shifts, hue rotation

## Keyboard Shortcuts

Currently all interaction is via mouse and Tweakpane UI. Future versions may add:
- Number keys to switch patterns
- Space to pause/play
- R to reset current pattern
- S to save screenshot

## Performance

The app targets 60 FPS. If you experience lag:
1. Lower `devicePixelRatio` in `Renderer.ts` (default: 1.5)
2. Reduce particle counts in pattern files
3. Close other browser tabs
4. Use Chrome/Edge for best WebGL performance

## Next Steps

- Check out [README.md](./README.md) for full documentation
- See [prd.md](./prd.md) for complete pattern catalog and roadmap
- Explore `src/scenes/` to see pattern implementations
- Build your own pattern using the `Pattern` interface

Enjoy! ✨

