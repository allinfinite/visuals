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
import { WireframeTunnel } from './scenes/WireframeTunnel';
import { FeedbackFractal } from './scenes/FeedbackFractal';
import { AudioPoetry } from './scenes/AudioPoetry';
import { ImpossibleGeometry } from './scenes/ImpossibleGeometry';
import { LatentMorphs } from './scenes/LatentMorphs';
import { MirrorRoom } from './scenes/MirrorRoom';
import { WordRipples } from './scenes/WordRipples';
import { FluidInk } from './scenes/FluidInk';
import { SymmetryMirrors } from './scenes/SymmetryMirrors';
import { LiquidColorBlobs } from './scenes/LiquidColorBlobs';
import { LustfulCascade } from './scenes/LustfulCascade';
import { ClimacticPulse } from './scenes/ClimacticPulse';
import { TangledEmbrace } from './scenes/TangledEmbrace';
import { SirensWrithe } from './scenes/SirensWrithe';
import { FervidBloom } from './scenes/FervidBloom';
import { TorridRush } from './scenes/TorridRush';
import { CarnalGlow } from './scenes/CarnalGlow';
import { AIKenBurns } from './scenes/AIKenBurns';
import { MysticWords } from './scenes/MysticWords';
import { StealYourFace } from './scenes/StealYourFace';
import { RainbowEcho } from './scenes/RainbowEcho';
import { ParticlePuppeteer } from './scenes/ParticlePuppeteer';
import { AuraVision } from './scenes/AuraVision';
import { PixelDisintegration } from './scenes/PixelDisintegration';
import { NeonContour } from './scenes/NeonContour';
import { TimeDisplacement } from './scenes/TimeDisplacement';
import { WireframeMesh } from './scenes/WireframeMesh';
import { ColorExtractionPaint } from './scenes/ColorExtractionPaint';
import { InfinityMirror } from './scenes/InfinityMirror';
import { PointillismPortrait } from './scenes/PointillismPortrait';
import { FractalEchoChamber } from './scenes/FractalEchoChamber';
import { ConstellationMapper } from './scenes/ConstellationMapper';
import { FireSmokeBody } from './scenes/FireSmokeBody';
import { VoronoiShatter } from './scenes/VoronoiShatter';

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
  sceneManager.addPattern(new WireframeTunnel(context));
  sceneManager.addPattern(new FeedbackFractal(context));
  sceneManager.addPattern(new AudioPoetry(context));
  sceneManager.addPattern(new ImpossibleGeometry(context));
  sceneManager.addPattern(new LatentMorphs(context));
  sceneManager.addPattern(new MirrorRoom(context));
  sceneManager.addPattern(new WordRipples(context));
  sceneManager.addPattern(new FluidInk(context));
  sceneManager.addPattern(new SymmetryMirrors(context));
  sceneManager.addPattern(new LiquidColorBlobs(context));
  sceneManager.addPattern(new LustfulCascade(context));
  sceneManager.addPattern(new ClimacticPulse(context));
  sceneManager.addPattern(new TangledEmbrace(context));
  sceneManager.addPattern(new SirensWrithe(context));
  sceneManager.addPattern(new FervidBloom(context));
  sceneManager.addPattern(new TorridRush(context));
  sceneManager.addPattern(new CarnalGlow(context));
  sceneManager.addPattern(new AIKenBurns(context));
  sceneManager.addPattern(new MysticWords(context));
  sceneManager.addPattern(new StealYourFace(context));
  sceneManager.addPattern(new RainbowEcho(context));
  sceneManager.addPattern(new ParticlePuppeteer(context));
  sceneManager.addPattern(new AuraVision(context));
  sceneManager.addPattern(new PixelDisintegration(context));
  sceneManager.addPattern(new NeonContour(context));
  sceneManager.addPattern(new TimeDisplacement(context));
  sceneManager.addPattern(new WireframeMesh(context));
  sceneManager.addPattern(new ColorExtractionPaint(context));
  sceneManager.addPattern(new InfinityMirror(context));
  sceneManager.addPattern(new PointillismPortrait(context));
  sceneManager.addPattern(new FractalEchoChamber(context));
  sceneManager.addPattern(new ConstellationMapper(context));
  sceneManager.addPattern(new FireSmokeBody(context));
  sceneManager.addPattern(new VoronoiShatter(context));

  // Parse URL parameters for scene selection
  const urlParams = new URLSearchParams(window.location.search);
  const sceneParam = urlParams.get('scene') || urlParams.get('pattern');
  const modeParam = urlParams.get('mode');
  
  // Handle single pattern mode request
  if (modeParam === 'single') {
    sceneManager.disableCompositionMode();
  }
  
  // Load specific scene if requested
  if (sceneParam) {
    const patterns = sceneManager.getAllPatterns();
    let targetIndex = -1;
    
    // Try to parse as index first
    const indexNum = parseInt(sceneParam, 10);
    if (!isNaN(indexNum) && indexNum >= 0 && indexNum < patterns.length) {
      targetIndex = indexNum;
    } else {
      // Search by name (case-insensitive)
      targetIndex = patterns.findIndex(p => 
        p.name.toLowerCase() === sceneParam.toLowerCase()
      );
    }
    
    if (targetIndex !== -1) {
      const pattern = patterns[targetIndex];
      console.log(`🎯 Loading scene from URL: ${pattern.name}`);
      
      if (sceneManager.compositionEnabled) {
        // In composition mode, queue the specific pattern
        sceneManager.queueSpecificPattern(targetIndex, false);
      } else {
        // In single pattern mode, set it as active
        sceneManager.setActivePattern(targetIndex);
      }
    } else {
      console.warn(`⚠️  Scene not found: "${sceneParam}". Loading default.`);
      sceneManager.setActivePattern(0);
    }
  } else {
    // Set first pattern as active (default behavior)
    sceneManager.setActivePattern(0);
  }

  // Setup UI
  const paramPane = new ParamPane(sceneManager, app.getAudio(), app);

  // Update UI periodically (10 times per second)
  setInterval(() => {
    paramPane.update();
  }, 100);

  // Start the app
  app.start();

  // Setup menu button
  const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement;
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      // Toggle the Tweakpane visibility using class
      const tweakpane = document.querySelector('.tp-dfwv') as HTMLElement;
      if (tweakpane) {
        const isOpen = tweakpane.classList.contains('menu-open');
        if (isOpen) {
          tweakpane.classList.remove('menu-open');
        } else {
          tweakpane.classList.add('menu-open');
          // Ensure the pane is expanded when shown
          paramPane.setExpanded(true);
        }
      }
    });
  }

  // Setup fullscreen button
  const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        fullscreenBtn?.classList.add('fullscreen');
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        fullscreenBtn?.classList.remove('fullscreen');
      }).catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  }

  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      fullscreenBtn?.classList.remove('fullscreen');
    } else {
      fullscreenBtn?.classList.add('fullscreen');
    }
  });

  // Keyboard shortcut: 'm' to hide/show buttons
  document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      const bothButtons = [menuBtn, fullscreenBtn];
      bothButtons.forEach(btn => {
        if (btn) {
          if (btn.style.display === 'none') {
            btn.style.display = 'flex';
          } else {
            btn.style.display = 'none';
          }
        }
      });
    }
  });

  console.log('✨ Interactive Visual Canvas started');
  console.log('🎞️  Film Effects enabled by default (grain, blur, vignette)');
  console.log('🎨 Multi-Layer Mode enabled by default (dynamic compositions)');
  console.log('🖱️  Move mouse and click to interact with all layers');
  console.log('⌨️  Press "M" to hide/show menu buttons');
  console.log('🔗 URL Parameters:');
  console.log('   • ?scene=Aurora (load specific scene by name)');
  console.log('   • ?scene=0 (load specific scene by index)');
  console.log('   • ?mode=single (disable multi-layer mode)');
  console.log('📹 Enable webcam for 14 interactive visual modes!');
  console.log('🎵 Enable microphone in the UI for audio reactivity');
  console.log('🌈 WEBCAM VISUALS:');
  console.log('   • Rainbow Echo - trippy silhouettes with rainbow tracers');
  console.log('   • Particle Puppeteer - particles orbit your body outline');
  console.log('   • Aura Vision - colorful energy fields around you');
  console.log('   • Pixel Disintegration - body dissolves and rebuilds');
  console.log('   • Neon Contour - glowing 80s neon outlines');
  console.log('   • Time Displacement - see your past movements');
  console.log('   • Wireframe Mesh - 3D rotating mesh from silhouette');
  console.log('   • Color Extraction Paint - paint with actual colors');
  console.log('   • Infinity Mirror - recursive tunnel effect');
  console.log('   • Pointillism Portrait - impressionist dot painting');
  console.log('   • Fractal Echo Chamber - recursive silhouettes');
  console.log('   • Constellation Mapper - connect body points with stars');
  console.log('   • Fire/Smoke Body - edges emit particles with physics');
  console.log('   • Voronoi Shatter - mosaic cells that explode');
  console.log(`📊 ${sceneManager.getAllPatterns().length} patterns loaded`);
}

main();

