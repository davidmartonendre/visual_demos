export function simplex2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const a = (X + Y) & 255;
  const b = (X + Y + 1) & 255;
  return lerp(
    lerp(grad(hash(a), x, y), grad(hash(b), x - 1, y), u),
    lerp(grad(hash(a + 1), x, y - 1), grad(hash(b + 1), x - 1, y - 1), u),
    v
  );
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function hash(n: number): number {
  return (n * 16807 + 0.5) % 2147483647;
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

export function noise2D(x: number, y: number): number {
  return simplex2D(x, y);
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
