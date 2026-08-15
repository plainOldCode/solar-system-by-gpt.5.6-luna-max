import type { SizeScaleMode } from '../types/astronomy';

export const EARTH_RADIUS_KM = 6_371;
export const SUN_RENDER_RADIUS = 8;

export interface RenderedSizePolicy {
  readonly mode: SizeScaleMode;
  readonly planetMinRadius: number;
  readonly planetMaxRadius: number;
  readonly moonMinRadius: number;
  readonly moonMaxRadius: number;
}

export const DEFAULT_SIZE_POLICY: Readonly<RenderedSizePolicy> = {
  mode: 'enhanced-visibility',
  planetMinRadius: 0.55,
  planetMaxRadius: 4,
  moonMinRadius: 0.16,
  moonMaxRadius: 0.75,
};

function assertRadius(radiusKm: number): void {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    throw new RangeError('radiusKm must be a finite positive number');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Rendered radii are deliberately not physical radii. The square-root curve
 * preserves the ordering of real radii while keeping small planets legible.
 */
export function mapPlanetRadius(
  radiusKm: number,
  mode: SizeScaleMode = DEFAULT_SIZE_POLICY.mode,
): number {
  assertRadius(radiusKm);
  const ratio = radiusKm / EARTH_RADIUS_KM;

  switch (mode) {
    case 'enhanced-visibility':
      return clamp(0.55 + 0.65 * Math.pow(ratio, 0.5), 0.55, 4);
    case 'relative-size':
      return clamp(0.35 + 1.55 * Math.pow(ratio, 0.5), 0.35, 7);
    case 'uniform-markers':
      return 1.05;
    default:
      return assertNever(mode);
  }
}

export function mapMoonRadius(
  radiusKm: number,
  mode: SizeScaleMode = DEFAULT_SIZE_POLICY.mode,
): number {
  assertRadius(radiusKm);
  const ratio = radiusKm / EARTH_RADIUS_KM;

  switch (mode) {
    case 'enhanced-visibility':
      return clamp(0.16 + 0.4 * Math.pow(ratio, 0.5), 0.16, 0.75);
    case 'relative-size':
      return clamp(0.12 + 0.75 * Math.pow(ratio, 0.5), 0.12, 1.15);
    case 'uniform-markers':
      return 0.32;
    default:
      return assertNever(mode);
  }
}

export function mapSunRadius(_radiusKm: number, _mode: SizeScaleMode = DEFAULT_SIZE_POLICY.mode): number {
  // The Sun is handled separately so it does not overwhelm the complete view.
  return SUN_RENDER_RADIUS;
}

export function isSizeScaleMode(value: string): value is SizeScaleMode {
  return (
    value === 'enhanced-visibility' ||
    value === 'relative-size' ||
    value === 'uniform-markers'
  );
}

function assertNever(value: never): never {
  throw new Error(`Unsupported size scale mode: ${String(value)}`);
}
