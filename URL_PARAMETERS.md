# URL Parameters Guide

You can now use URL parameters to load specific scenes directly when opening the visualizer.

## Available Parameters

### `scene` or `pattern`
Load a specific scene by name or index.

**Examples:**
- `?scene=Aurora` - Load Aurora scene by name (case-insensitive)
- `?scene=StealYourFace` - Spaces, hyphens, and underscores are optional
- `?scene=Steal Your Face` - Also works with spaces
- `?scene=0` - Load first scene by index
- `?scene=13` - Load 14th scene by index
- `?pattern=Fireflies` - Alternative parameter name

### `mode`
Control the composition mode.

**Examples:**
- `?mode=single` - Disable multi-layer composition mode, show only the specified scene

### `fps`
Control the target frame rate for performance.

**Examples:**
- `?fps=30` - Limit to 30 FPS
- `?fps=24` - Limit to 24 FPS (cinematic)
- `?fps=15` - Limit to 15 FPS (low performance mode)

### `resolution`
Control the rendering resolution scale for performance.

**Examples:**
- `?resolution=0.5` - Render at 50% resolution
- `?resolution=0.25` - Render at 25% resolution (lowest, best performance)
- `?resolution=0.75` - Render at 75% resolution

## Usage Examples

### Load a specific scene in multi-layer mode (default)
```
http://localhost:5173/?scene=Aurora
```
This will queue the Aurora pattern in the multi-layer composition mode.

### Load a specific scene in single pattern mode
```
http://localhost:5173/?scene=FeedbackFractal&mode=single
```
This will disable multi-layer mode and show only the FeedbackFractal pattern.

### Load by index
```
http://localhost:5173/?scene=20&mode=single
```
This will load the 21st pattern (0-indexed) in single pattern mode.

### Load with performance settings
```
http://localhost:5173/?scene=Aurora&fps=30&resolution=0.5
```
This will load the Aurora pattern with limited frame rate (30 FPS) and reduced resolution (50%) for better performance.

### Low performance mode
```
http://localhost:5173/?mode=single&scene=Mandala&fps=24&resolution=0.25
```
This will load a single pattern at 24 FPS with 25% resolution for maximum performance on low-end devices.

## Available Scene Names

Here are all the available scene names (case-insensitive):

- ParticleSwarm
- SmokeTrails
- MagneticLines
- Fireflies
- Mandala
- FlowerOfLife
- Aurora
- Starfield
- VectorFlow
- Lightning
- Mycelium
- LSystem
- Flocking
- Nebula
- RibbonTrails
- OrbitSystem
- PlasmaArcs
- WaveCurves
- RainRipples
- FirePlume
- Constellations
- GridPulses
- Metaballs
- MinimalDots
- CircuitPulses
- SnowDrift
- OceanWaves
- BlackHole
- Supernova
- GradientClouds
- Kaleidoscope
- DustStorm
- GlitchBursts
- WatercolorFade
- YokaiParade
- ButterflySwarms
- ZoomingDoves
- Cymatics
- StrobeHalo
- RadiantGrid
- LensFlares
- CoralGrowth
- NeuralNetwork
- MoireRotation
- SigilGlyphs
- AudioPaint
- CellularAutomata
- DayNightCycle
- RecursiveTiles
- ShadowTrails
- TerrainMorph
- WeatherSync
- GlyphOrbit
- ChromaticBloom
- FacesInNoise
- SilhouetteParticles
- RotatingPolyhedra
- PointCloudMorph
- WireframeTunnel
- FeedbackFractal
- AudioPoetry
- ImpossibleGeometry
- LatentMorphs
- MirrorRoom
- WordRipples
- FluidInk
- SymmetryMirrors
- LiquidColorBlobs
- LustfulCascade
- ClimacticPulse
- TangledEmbrace
- SirensWrithe
- FervidBloom
- TorridRush
- CarnalGlow
- AIKenBurns
- MysticWords
- StealYourFace
- RainbowEcho
- ParticlePuppeteer
- AuraVision
- PixelDisintegration
- NeonContour
- TimeDisplacement
- WireframeMesh
- ColorExtractionPaint
- InfinityMirror
- PointillismPortrait
- FractalEchoChamber
- ConstellationMapper
- FireSmokeBody
- VoronoiShatter
- FallsOnFire
- WhisperVision (requires API key)

## Notes

- Scene names are **case-insensitive** (e.g., `aurora`, `Aurora`, `AURORA` all work)
- **Spaces, hyphens, and underscores are optional** in scene names (e.g., `StealYourFace`, `Steal Your Face`, `steal-your-face` all work)
- If a scene name is not found, a warning will be logged to the console and the default scene will load
- Webcam-required scenes will only load if the webcam is enabled
- Multi-layer mode is enabled by default - use `?mode=single` to show only one pattern

