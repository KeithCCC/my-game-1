export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function toFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

export function smoothingAlpha(lag: number, deltaSeconds: number): number {
  const safeDelta = Math.max(0, deltaSeconds);
  if (lag <= 0) return 1;
  return 1 - Math.exp(-safeDelta / lag);
}

