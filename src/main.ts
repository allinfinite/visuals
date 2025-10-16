import { App } from './core/App';
import { ParamPane } from './core/ParamPane';

// Import all patterns
import { ParticleSwarm } from './scenes/ParticleSwarm';
import { SmokeTrails } from './scenes/SmokeTrails';
import { MagneticLines } from './scenes/MagneticLines';
import { Fireflies } from './scenes/Fireflies';
import { Mandala } from './scenes/Mandala';
import { FlowerOfLife } from './scenes/FlowerOfLife';
import { Aurora } from './scenes/Aurora';
import { Starfield } from './scenes/Starfield';
import { VectorFlow } from './scenes/VectorFlow';
import { Lightning } from './scenes/Lightning';
import { Mycelium } from './scenes/Mycelium';
import { LSystem } from './scenes/LSystem';
import { Flocking } from './scenes/Flocking';
import { Nebula } from './scenes/Nebula';
import { RibbonTrails } from './scenes/RibbonTrails';
import { OrbitSystem } from './scenes/OrbitSystem';
import { PlasmaArcs } from './scenes/PlasmaArcs';
import { WaveCurves } from './scenes/WaveCurves';
import { RainRipples } from './scenes/RainRipples';
import { FirePlume } from './scenes/FirePlume';
import { Constellations } from './scenes/Constellations';
import { GridPulses } from './scenes/GridPulses';
import { Metaballs } from './scenes/Metaballs';
import { MinimalDots } from './scenes/MinimalDots';
import { CircuitPulses } from './scenes/CircuitPulses';
import { SnowDrift } from './scenes/SnowDrift';
import { OceanWaves } from './scenes/OceanWaves';
import { BlackHole } from './scenes/BlackHole';
import { Supernova } from './scenes/Supernova';
import { GradientClouds } from './scenes/GradientClouds';
import { Kaleidoscope } from './scenes/Kaleidoscope';
import { DustStorm } from './scenes/DustStorm';
import { GlitchBursts } from './scenes/GlitchBursts';
import { WatercolorFade } from './scenes/WatercolorFade';
import { YokaiParade } from './scenes/YokaiParade';
import { ButterflySwarms } from './scenes/ButterflySwarms';
import { ZoomingDoves } from './scenes/ZoomingDoves';
import { Cymatics } from './scenes/Cymatics';
import { StrobeHalo } from './scenes/StrobeHalo';
import { RadiantGrid } from './scenes/RadiantGrid';
import { LensFlares } from './scenes/LensFlares';
import { CoralGrowth } from './scenes/CoralGrowth';
import { NeuralNetwork } from './scenes/NeuralNetwork';
import { MoireRotation } from './scenes/MoireRotation';
import { SigilGlyphs } from './scenes/SigilGlyphs';
import { AudioPaint } from './scenes/AudioPaint';
import { CellularAutomata } from './scenes/CellularAutomata';
import { DayNightCycle } from './scenes/DayNightCycle';
import { RecursiveTiles } from './scenes/RecursiveTiles';
import { ShadowTrails } from './scenes/ShadowTrails';
import { TerrainMorph } from './scenes/TerrainMorph';
import { WeatherSync } from './scenes/WeatherSync';
import { GlyphOrbit } from './scenes/GlyphOrbit';
import { ChromaticBloom } from './scenes/ChromaticBloom';
import { FacesInNoise } from './scenes/FacesInNoise';
import { SilhouetteParticles } from './scenes/SilhouetteParticles';
import { RotatingPolyhedra } from './scenes/RotatingPolyhedra';
import { PointCloudMorph } from './scenes/PointCloudMorph';

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Initialize app
  const app = new App(canvas);
  await app.init();

  // Get scene manager
  const sceneManager = app.getSceneManager();
  const context = app.getRenderer().getContext();

  // Add all patterns
  sceneManager.addPattern(new ParticleSwarm(context));
  sceneManager.addPattern(new SmokeTrails(context));
  sceneManager.addPattern(new MagneticLines(context));
  sceneManager.addPattern(new Fireflies(context));
  sceneManager.addPattern(new Mandala(context));
  sceneManager.addPattern(new FlowerOfLife(context));
  sceneManager.addPattern(new Aurora(context));
  sceneManager.addPattern(new Starfield(context));
  sceneManager.addPattern(new VectorFlow(context));
  sceneManager.addPattern(new Lightning(context));
  sceneManager.addPattern(new Mycelium(context));
  sceneManager.addPattern(new LSystem(context));
  sceneManager.addPattern(new Flocking(context));
  sceneManager.addPattern(new Nebula(context));
  sceneManager.addPattern(new RibbonTrails(context));
  sceneManager.addPattern(new OrbitSystem(context));
  sceneManager.addPattern(new PlasmaArcs(context));
  sceneManager.addPattern(new WaveCurves(context));
  sceneManager.addPattern(new RainRipples(context));
  sceneManager.addPattern(new FirePlume(context));
  sceneManager.addPattern(new Constellations(context));
  sceneManager.addPattern(new GridPulses(context));
  sceneManager.addPattern(new Metaballs(context));
  sceneManager.addPattern(new MinimalDots(context));
  sceneManager.addPattern(new CircuitPulses(context));
  sceneManager.addPattern(new SnowDrift(context));
  sceneManager.addPattern(new OceanWaves(context));
  sceneManager.addPattern(new BlackHole(context));
  sceneManager.addPattern(new Supernova(context));
  sceneManager.addPattern(new GradientClouds(context));
  sceneManager.addPattern(new Kaleidoscope(context));
  sceneManager.addPattern(new DustStorm(context));
  sceneManager.addPattern(new GlitchBursts(context));
  sceneManager.addPattern(new WatercolorFade(context));
  sceneManager.addPattern(new YokaiParade(context));
  sceneManager.addPattern(new ButterflySwarms(context));
  sceneManager.addPattern(new ZoomingDoves(context));
  sceneManager.addPattern(new Cymatics(context));
  sceneManager.addPattern(new StrobeHalo(context));
  sceneManager.addPattern(new RadiantGrid(context));
  sceneManager.addPattern(new LensFlares(context));
  sceneManager.addPattern(new CoralGrowth(context));
  sceneManager.addPattern(new NeuralNetwork(context));
  sceneManager.addPattern(new MoireRotation(context));
  sceneManager.addPattern(new SigilGlyphs(context));
  sceneManager.addPattern(new AudioPaint(context));
  sceneManager.addPattern(new CellularAutomata(context));
  sceneManager.addPattern(new DayNightCycle(context));
  sceneManager.addPattern(new RecursiveTiles(context));
  sceneManager.addPattern(new ShadowTrails(context));
  sceneManager.addPattern(new TerrainMorph(context));
  sceneManager.addPattern(new WeatherSync(context));
  sceneManager.addPattern(new GlyphOrbit(context));
  sceneManager.addPattern(new ChromaticBloom(context));
  sceneManager.addPattern(new FacesInNoise(context));
  sceneManager.addPattern(new SilhouetteParticles(context));
  sceneManager.addPattern(new RotatingPolyhedra(context));
  sceneManager.addPattern(new PointCloudMorph(context));

  // Set first pattern as active
  sceneManager.setActivePattern(0);

  // Setup UI
  new ParamPane(sceneManager, app.getAudio(), app);

  // Start the app
  app.start();

  console.log('✨ Interactive Visual Canvas started');
  console.log('🖱️  Move mouse and click to interact');
  console.log('🎵 Enable microphone in the UI for audio reactivity');
  console.log('🎨 Enable Multi-Layer for generative compositions');
  console.log(`📊 ${sceneManager.getAllPatterns().length} patterns loaded`);
}

main();

