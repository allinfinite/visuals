/**
 * Convert HSL to hex color, with proper clamping to prevent negative values
 * @param h Hue (0-360, will be wrapped)
 * @param s Saturation (0-100, will be clamped)
 * @param l Lightness (0-100, will be clamped)
 * @returns Hex color as number
 */
export function hslToHex(h: number, s: number, l: number): number {
  // Normalize hue to 0-360 range
  h = ((h % 360) + 360) % 360;
  
  // Clamp saturation and lightness to valid ranges
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

  // Clamp RGB values to 0-255 to prevent negative colors
  const red = Math.max(0, Math.min(255, Math.round((r + m) * 255)));
  const green = Math.max(0, Math.min(255, Math.round((g + m) * 255)));
  const blue = Math.max(0, Math.min(255, Math.round((b + m) * 255)));

  return (red << 16) | (green << 8) | blue;
}

/**
 * Lerp between two colors
 */
export function lerpColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
}

/**
 * Darken a color by a specified amount
 */
export function darkenColor(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - amount);
  const g = Math.max(0, ((color >> 8) & 0xff) - amount);
  const b = Math.max(0, (color & 0xff) - amount);

  return (r << 16) | (g << 8) | b;
}

/**
 * Lighten a color by a specified amount
 */
export function lightenColor(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);

  return (r << 16) | (g << 8) | b;
}

