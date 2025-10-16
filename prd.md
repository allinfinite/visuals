# Interactive Visual Canvas — Technical Outline

A unified canvas architecture for TeamLabs-style generative visuals.
Primary input: **mouse position / click / drag**
Secondary input: **audio FFT / amplitude / beat detection**
All visuals drawn via **WebGL2** or **WebGPU-ready layer (PixiJS / regl)**.
Core language: **TypeScript**. Renderer: **PixiJS or regl**. Build: **Vite**.

---

## 0. Architecture

### Modules
- **Core**
  - `App`: main loop (update, render)
  - `Renderer`: WebGL2 context manager
  - `Input`: mouse state, clicks, drags
  - `Audio`: analyser node, FFT bands
  - `Clock`: delta time, BPM sync
  - `ParamPane`: tweak UI (Tweakpane)
- **Scene Manager**
  - array of `Pattern` objects implementing `{ update(dt, audio, input); draw(renderer); }`
- **PostFX**
  - feedback buffers, bloom, blur, color grade
  - ping-pong FBOs
- **Utils**
  - vector math (`gl-matrix`)
  - noise (`simplex-noise`)
  - easing (`bezier-easing`)
  - random (`alea`)

---

## 1. Particle / Field Systems

| Pattern | Core Technique | Audio Interaction | Mouse Interaction |
|----------|----------------|------------------|------------------|
| **Particle Swarm** | Verlet integration, steering forces | velocity magnitude scales with bass | cursor acts as attractor / repeller |
| **Smoke Trails** | alpha-blended particles + Perlin noise flow field | density modulated by RMS | click spawns bursts |
| **Magnetic Lines** | field visualization via curl noise | line curvature changes with frequency centroid | cursor defines magnetic pole |
| **Fireflies** | glowing sprites with sine wave flicker | blink to beat | click spawns clusters |
| **Fluid Ink** | simplified Navier–Stokes on grid | velocity fields disturbed by amplitude | click injects dye & velocity |

---

## 2. Organic / Biological

| Pattern | Core Technique | Notes |
|----------|----------------|-------|
| **Mycelium Growth** | recursive random walk constrained by angle | growth speed = audio energy |
| **L-System Plants** | string-rewriting → draw lines via turtle | click seeds new plants |
| **Coral Growth** | reaction-diffusion (Gray–Scott) shader | morph rate = tempo |
| **Cellular Automata** | 2D CA (Life variant) | threshold modulated by mid-band energy |
| **Neural Network Firing** | connected nodes with pulse animation | signal propagation follows beat |
| **Flocking Creatures** | boids algorithm | spawn count from click intensity |

---

## 3. Sacred Geometry / Patterns

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Mandalas** | radial instancing of shapes | click = new seed pattern |
| **Flower of Life Grid** | layered circles via SDFs | vibrates to bass |
| **Polygonal Kaleidoscope** | mirrored FBO slices | rotation = tempo |
| **Symmetry Mirrors** | multi-axis reflection shader | click defines symmetry center |
| **Cymatics Simulation** | FFT bands → 2D standing-wave interference | amplitude affects contrast |

---

## 4. Light / Energy Fields

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Aurora Curtain** | layered sine wave bands | color shifts with spectral centroid |
| **Lens Flares** | additive billboards + glare shader | cursor = light source |
| **Strobe Halo** | radial gradient expansion | pulse on beat |
| **Plasma Arcs** | perlin-displaced lines | click endpoints define arc |
| **Radiant Grid** | oscillating sine shader | audio RMS modulates amplitude |

---

## 5. Abstract Motion / Data Flow

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Vector Flow Field** | draw arrows along curl noise | speed = tempo |
| **Ribbon Trails** | spline ribbons following pointer | width = amplitude |
| **Wave Curves** | sine-modulated Bézier lines | frequency bands deform wave |
| **Grid Pulses** | uniform grid brightness oscillation | click inverts polarity |
| **Circuit Pulses** | edge-routing graph | beat = traveling spark |

---

## 6. Elemental Environments

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Fire Plume** | particle + heat distortion shader | amplitude = flame height |
| **Lightning** | L-system branching lines | click defines strike origin |
| **Rain Ripples** | circle SDF expansion | droplets density = treble energy |
| **Snow Drift** | simple particle gravity | slow tempo = gentle fall |
| **Ocean Waves** | sine field normal mapping | bass drives wave height |
| **Dust Storm** | brownian particles + directional blur | volume = opacity |

---

## 7. Cosmic / Astral

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Starfield Zoom** | 3D projection of random points | tempo = speed |
| **Orbit System** | hierarchical transforms | click adds planet |
| **Black Hole** | radial distortion shader | beat = accretion burst |
| **Supernova** | expanding particle shell | triggered by click |
| **Nebula** | fractal noise volume rendering | color shifts to harmonic mean |
| **Constellations** | connect recent click points | lines glow on beat |

---

## 8. Human / Symbolic Abstractions

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Silhouette Particles** | mask texture sampling | amplitude = disintegration |
| **Faces in Noise** | thresholded Perlin texture | mouse position changes threshold |
| **Sigil Glyphs** | procedural path generator | spawn on click |
| **Shadow Trails** | motion blur feedback buffer | follows cursor |

---

## 9. Fluid Light Paint

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Liquid Color Blobs** | metaballs (SDF blending) | spawn on click |
| **Audio Paint** | stroke width = RMS | drag paints trails |
| **Watercolor Fade** | blur feedback + multiply blending | amplitude = pigment diffusion |
| **Chromatic Aberration** | RGB offset shader | frequency centroid = shift amount |

---

## 10. Spatial Geometry / 3D Projection

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Rotating Polyhedra** | instanced meshes | BPM = rotation speed |
| **Point Cloud Morph** | morph targets | frequency spectrum = interpolation factor |
| **Wireframe Tunnel** | FBO feedback + perspective | cursor shifts camera offset |
| **Mirror Room** | cube-map reflection | amplitude = reflectivity |

---

## 11. Text / Symbol Reactivity

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Word Ripples** | text rendered to texture → ripple shader | bass = wave height |
| **Audio Poetry** | letters appear per beat | frequency band = color |
| **Glyph Orbit** | text particles orbiting cursor | click adds glyphs |

---

## 12. Emotional / Mood Fields

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Gradient Clouds** | layered noise + color LUT | RMS drives hue rotation |
| **Minimal Dots** | sparse particles drifting | BPM = breathing rate |
| **Glitch Bursts** | buffer shift shader | trigger on amplitude spikes |

---

## 13. Temporal / World Systems

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Day–Night Cycle** | gradient background + light hue | long-term average amplitude controls time of day |
| **Terrain Morph** | displacement map | bass = height variation |
| **Weather Sync** | overlay particles (rain, fog) | tonal mood changes weather |

---

## 14. Visual Illusions

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Moiré Rotation** | layered line patterns | rotation speed = tempo |
| **Recursive Tiles** | feedback zoom | click resets scale |
| **Impossible Geometry** | shader distortion | audio = warp amount |

---

## 15. AI / Feedback Experiments

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Latent Morphs** | crossfade pre-generated textures | amplitude = interpolation |
| **Feedback Fractal** | recursive render-to-texture | beat = scale modulation |
| **Color Grade AI Mix** | shader style transfer approximation | audio = weight balance |

---
## 16 Spicy

| Pattern | Technique | Interaction |
|----------|------------|-------------|
| **Lustful Cascade** | Smoothed particle hydrodynamics (SPH) with slick, dripping shaders | Cursor drag paints glistening, quivering trails that surge to bass; amplitude scales viscosity and rhythmic throbbing |
| **Climactic Pulse** | Radial distortion fields with intense, contracting spasms | Beat detection drives convulsive, radiating waves; click ignites explosive epicenters |
| **Tangled Embrace** | Dual particle systems with coiling, intertwining trajectories | Click spawns paired particles that writhe and fuse passionately; treble energy accelerates their frenzied dance |
| **Siren’s Writhe** | Bézier curves with glossy, flesh-like textures and trembling glow | Mouse drag traces provocative, shuddering paths; RMS amplitude swells curves and amplifies pulsating sheen |
| **Fervid Bloom** | Reaction-diffusion shader with voluptuous, swelling forms | Audio energy fuels throbbing, organic growth; mouse position warps tendrils into suggestive, curvaceous shapes |
| **Torrid Rush** | 2D fluid simulation with chaotic, iridescent surges | Frequency bands ripple with wild, passionate waves; cursor drag triggers turbulent, climactic bursts |
| **Carnal Glow** | Additive blending of gaussian-blurred sprites with molten, sweat-drenched sheen | Beat syncs feverish, pulsing intensity; mouse movement shifts sultry gradients (crimson, violet, amber) |


## Implementation Notes

- **Renderer**: PixiJS with `CustomShader` objects or regl raw passes.
- **Audio**: Web Audio API AnalyserNode → 1024 FFT bins → log-mapped 32-band spectrum.
- **Click input**: `pointerdown` adds `Event {x, y, time}`; use queue for pattern seeds.
- **Update loop**: `update(dt, spectrum, pointer)`, `draw(renderer)`.
- **Performance**:
  - use `devicePixelRatio` cap (1.5)
  - batch uniforms, minimize draw calls
  - use `InstancedBufferGeometry` where possible
- **Export**:
  - Save frames to PNG sequence
  - Record via `MediaRecorder`
  - Fullscreen kiosk via PWA manifest

---

## File Structure Example

src/
core/
App.ts
Renderer.ts
Audio.ts
Input.ts
Clock.ts
scenes/
ParticleField.ts
Mandala.ts
Aurora.ts
...
shaders/
mandala.frag
smoke.frag
utils/
math.ts
noise.ts
main.ts
vite.config.ts
index.html


---

## Development Plan

1. Initialize Vite + TypeScript + PixiJS
2. Implement Audio analyser and Input
3. Create `Pattern` interface + manager
4. Build first scene: **Particle Swarm**
5. Add PostFX (bloom, blur, feedback)
6. Incrementally implement patterns from table
7. Bind parameters via Tweakpane
8. Optimize for 60fps, export mode

---