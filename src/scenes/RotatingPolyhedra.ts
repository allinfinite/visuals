import { Container, Graphics } from 'pixi.js';
import type { Pattern, AudioData, InputState, RendererContext } from '../types';
import { hslToHex } from '../utils/color';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Polyhedron {
  vertices: Vector3[];
  edges: [number, number][];
  rotation: Vector3;
  rotationSpeed: Vector3;
  position: { x: number; y: number };
  scale: number;
  hue: number;
  alpha: number;
}

export class RotatingPolyhedra implements Pattern {
  public name = 'Rotating Polyhedra';
  public container: Container;
  private graphics: Graphics;
  private context: RendererContext;
  private polyhedra: Polyhedron[] = [];
  private time: number = 0;

  constructor(context: RendererContext) {
    this.context = context;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    // Initialize polyhedra
    this.spawnPolyhedron();
    this.spawnPolyhedron();
    this.spawnPolyhedron();
  }

  private spawnPolyhedron(): void {
    const { width, height } = this.context;
    const types = [
      this.createCube,
      this.createTetrahedron,
      this.createOctahedron,
      this.createIcosahedron,
      this.createDodecahedron,
    ];

    const type = types[Math.floor(Math.random() * types.length)];
    const poly = type.call(this);
    
    poly.position = {
      x: width * (0.2 + Math.random() * 0.6),
      y: height * (0.2 + Math.random() * 0.6),
    };
    poly.rotation = { x: 0, y: 0, z: 0 };
    poly.rotationSpeed = {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2,
    };
    poly.scale = 50 + Math.random() * 50;
    poly.hue = Math.random() * 360;
    poly.alpha = 0.8;

    this.polyhedra.push(poly);
  }

  private createCube(): Polyhedron {
    return {
      vertices: [
        { x: -1, y: -1, z: -1 },
        { x: 1, y: -1, z: -1 },
        { x: 1, y: 1, z: -1 },
        { x: -1, y: 1, z: -1 },
        { x: -1, y: -1, z: 1 },
        { x: 1, y: -1, z: 1 },
        { x: 1, y: 1, z: 1 },
        { x: -1, y: 1, z: 1 },
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 0], // Front face
        [4, 5], [5, 6], [6, 7], [7, 4], // Back face
        [0, 4], [1, 5], [2, 6], [3, 7], // Connecting edges
      ],
      rotation: { x: 0, y: 0, z: 0 },
      rotationSpeed: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0 },
      scale: 1,
      hue: 0,
      alpha: 1,
    };
  }

  private createTetrahedron(): Polyhedron {
    const a = 1;
    return {
      vertices: [
        { x: a, y: a, z: a },
        { x: a, y: -a, z: -a },
        { x: -a, y: a, z: -a },
        { x: -a, y: -a, z: a },
      ],
      edges: [
        [0, 1], [0, 2], [0, 3],
        [1, 2], [1, 3], [2, 3],
      ],
      rotation: { x: 0, y: 0, z: 0 },
      rotationSpeed: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0 },
      scale: 1,
      hue: 0,
      alpha: 1,
    };
  }

  private createOctahedron(): Polyhedron {
    return {
      vertices: [
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
      ],
      edges: [
        [0, 2], [0, 3], [0, 4], [0, 5],
        [1, 2], [1, 3], [1, 4], [1, 5],
        [2, 4], [2, 5], [3, 4], [3, 5],
      ],
      rotation: { x: 0, y: 0, z: 0 },
      rotationSpeed: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0 },
      scale: 1,
      hue: 0,
      alpha: 1,
    };
  }

  private createIcosahedron(): Polyhedron {
    const phi = (1 + Math.sqrt(5)) / 2;
    return {
      vertices: [
        { x: -1, y: phi, z: 0 }, { x: 1, y: phi, z: 0 },
        { x: -1, y: -phi, z: 0 }, { x: 1, y: -phi, z: 0 },
        { x: 0, y: -1, z: phi }, { x: 0, y: 1, z: phi },
        { x: 0, y: -1, z: -phi }, { x: 0, y: 1, z: -phi },
        { x: phi, y: 0, z: -1 }, { x: phi, y: 0, z: 1 },
        { x: -phi, y: 0, z: -1 }, { x: -phi, y: 0, z: 1 },
      ],
      edges: [
        [0, 11], [0, 5], [0, 1], [0, 7], [0, 10],
        [1, 5], [1, 7], [1, 8], [1, 9],
        [2, 11], [2, 4], [2, 3], [2, 6], [2, 10],
        [3, 4], [3, 6], [3, 8], [3, 9],
        [4, 5], [4, 9], [4, 11],
        [5, 9], [5, 11],
        [6, 7], [6, 8], [6, 10],
        [7, 8], [7, 10],
        [8, 9],
        [10, 11],
      ],
      rotation: { x: 0, y: 0, z: 0 },
      rotationSpeed: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0 },
      scale: 1,
      hue: 0,
      alpha: 1,
    };
  }

  private createDodecahedron(): Polyhedron {
    const phi = (1 + Math.sqrt(5)) / 2;
    const invPhi = 1 / phi;
    return {
      vertices: [
        { x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: -1 },
        { x: 1, y: -1, z: 1 }, { x: 1, y: -1, z: -1 },
        { x: -1, y: 1, z: 1 }, { x: -1, y: 1, z: -1 },
        { x: -1, y: -1, z: 1 }, { x: -1, y: -1, z: -1 },
        { x: 0, y: invPhi, z: phi }, { x: 0, y: invPhi, z: -phi },
        { x: 0, y: -invPhi, z: phi }, { x: 0, y: -invPhi, z: -phi },
        { x: invPhi, y: phi, z: 0 }, { x: invPhi, y: -phi, z: 0 },
        { x: -invPhi, y: phi, z: 0 }, { x: -invPhi, y: -phi, z: 0 },
        { x: phi, y: 0, z: invPhi }, { x: phi, y: 0, z: -invPhi },
        { x: -phi, y: 0, z: invPhi }, { x: -phi, y: 0, z: -invPhi },
      ],
      edges: [
        [0, 8], [0, 12], [0, 16],
        [1, 9], [1, 12], [1, 17],
        [2, 10], [2, 13], [2, 16],
        [3, 11], [3, 13], [3, 17],
        [4, 8], [4, 14], [4, 18],
        [5, 9], [5, 14], [5, 19],
        [6, 10], [6, 15], [6, 18],
        [7, 11], [7, 15], [7, 19],
        [8, 10], [9, 11],
        [12, 14], [13, 15],
        [16, 17], [18, 19],
      ],
      rotation: { x: 0, y: 0, z: 0 },
      rotationSpeed: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 0 },
      scale: 1,
      hue: 0,
      alpha: 1,
    };
  }

  private rotateVertex(v: Vector3, rotation: Vector3): Vector3 {
    // Rotate around X
    let y = v.y * Math.cos(rotation.x) - v.z * Math.sin(rotation.x);
    let z = v.y * Math.sin(rotation.x) + v.z * Math.cos(rotation.x);
    let x = v.x;

    // Rotate around Y
    const x2 = x * Math.cos(rotation.y) + z * Math.sin(rotation.y);
    z = -x * Math.sin(rotation.y) + z * Math.cos(rotation.y);
    x = x2;

    // Rotate around Z
    const x3 = x * Math.cos(rotation.z) - y * Math.sin(rotation.z);
    y = x * Math.sin(rotation.z) + y * Math.cos(rotation.z);

    return { x: x3, y, z };
  }

  private projectVertex(v: Vector3, scale: number, pos: { x: number; y: number }): { x: number; y: number; z: number } {
    const perspective = 500;
    const z = v.z + 3; // Move away from camera
    const projectionScale = perspective / (perspective + z);
    
    return {
      x: pos.x + v.x * scale * projectionScale,
      y: pos.y + v.y * scale * projectionScale,
      z: v.z,
    };
  }

  public update(dt: number, audio: AudioData, input: InputState): void {
    this.time += dt;

    // Click spawns new polyhedron
    input.clicks.forEach((click) => {
      const age = this.time - click.time;
      if (age < 0.05 && this.polyhedra.length < 10) {
        this.spawnPolyhedron();
      }
    });

    // Beat spawns polyhedron
    if (audio.beat && this.polyhedra.length < 15) {
      this.spawnPolyhedron();
    }

    // Update polyhedra
    this.polyhedra.forEach((poly) => {
      // BPM-synced rotation
      const bpmMultiplier = audio.bpm / 120;
      poly.rotation.x += poly.rotationSpeed.x * dt * bpmMultiplier * (1 + audio.treble);
      poly.rotation.y += poly.rotationSpeed.y * dt * bpmMultiplier * (1 + audio.mid);
      poly.rotation.z += poly.rotationSpeed.z * dt * bpmMultiplier * (1 + audio.bass);

      // Scale pulses with audio
      poly.scale *= 1 + (audio.beat ? 0.2 : -0.1 * dt);
      poly.scale = Math.max(30, Math.min(120, poly.scale));

      // Hue shifts
      poly.hue = (poly.hue + dt * 30 + audio.centroid * 50) % 360;

      // Drift towards cursor
      const dx = input.x - poly.position.x;
      const dy = input.y - poly.position.y;
      poly.position.x += dx * 0.5 * dt;
      poly.position.y += dy * 0.5 * dt;
    });

    // Limit polyhedra count
    if (this.polyhedra.length > 12) {
      this.polyhedra = this.polyhedra.slice(-10);
    }

    this.draw(audio);
  }

  private draw(audio: AudioData): void {
    this.graphics.clear(); // Commented for feedback trails

    this.polyhedra.forEach((poly) => {
      const color = hslToHex(poly.hue, 70, 50);
      const glowColor = hslToHex(poly.hue, 100, 70);

      // Project vertices
      const projected = poly.vertices.map((v) => {
        const rotated = this.rotateVertex(v, poly.rotation);
        return this.projectVertex(rotated, poly.scale, poly.position);
      });

      // Sort edges by average Z (painter's algorithm)
      const sortedEdges = poly.edges.map((edge) => {
        const avgZ = (projected[edge[0]].z + projected[edge[1]].z) / 2;
        return { edge, avgZ };
      }).sort((a, b) => a.avgZ - b.avgZ);

      // Draw edges
      sortedEdges.forEach(({ edge }) => {
        const v1 = projected[edge[0]];
        const v2 = projected[edge[1]];

        // Line thickness varies with audio
        const thickness = 2 + audio.rms * 4 + (audio.beat ? 2 : 0);

        // Glow
        this.graphics.lineStyle(thickness * 2, glowColor, poly.alpha * 0.3);
        this.graphics.moveTo(v1.x, v1.y);
        this.graphics.lineTo(v2.x, v2.y);

        // Core line
        this.graphics.lineStyle(thickness, color, poly.alpha);
        this.graphics.moveTo(v1.x, v1.y);
        this.graphics.lineTo(v2.x, v2.y);
      });

      // Draw vertices
      projected.forEach((v) => {
        const vertexSize = 3 + audio.treble * 3;
        
        // Glow
        this.graphics.beginFill(glowColor, poly.alpha * 0.4);
        this.graphics.drawCircle(v.x, v.y, vertexSize * 1.5);
        this.graphics.endFill();
        
        // Core
        this.graphics.beginFill(color, poly.alpha);
        this.graphics.drawCircle(v.x, v.y, vertexSize);
        this.graphics.endFill();
      });
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

