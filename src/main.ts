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

