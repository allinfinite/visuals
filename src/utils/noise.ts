import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';
import Alea from 'alea';

// Create seeded noise generators
// @ts-ignore - Alea returns a PRNG function
const prng = new Alea(12345);
export const noise2D = createNoise2D(prng);
export const noise3D = createNoise3D(prng);
export const noise4D = createNoise4D(prng);

// Octave noise for more natural patterns
export function octaveNoise2D(
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

export function octaveNoise3D(
  x: number,
  y: number,
  z: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

// Curl noise for fluid-like flow fields
export function curlNoise2D(x: number, y: number, epsilon: number = 0.01): [number, number] {
  const n1 = noise2D(x, y + epsilon);
  const n2 = noise2D(x, y - epsilon);
  const n3 = noise2D(x + epsilon, y);
  const n4 = noise2D(x - epsilon, y);

  const dx = (n1 - n2) / (2 * epsilon);
  const dy = (n4 - n3) / (2 * epsilon);

  return [dx, dy];
}

