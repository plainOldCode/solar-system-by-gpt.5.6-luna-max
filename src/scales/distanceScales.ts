import type { DistanceScaleMode } from '../types/astronomy';

export interface HeliocentricScaleConfig {
  readonly maxDistanceAU: number;
  readonly minRenderDistance: number;
  readonly maxRenderDistance: number;
}

export interface SatelliteScaleConfig {
  readonly minDistanceKm: number;
  readonly maxDistanceKm: number;
  readonly minRenderDistance: number;
  readonly maxRenderDistance: number;
}

export const DEFAULT_HELIOCENTRIC_SCALE: Readonly<HeliocentricScaleConfig> = {
  maxDistanceAU: 39.5,
  minRenderDistance: 16,
  maxRenderDistance: 190,
};

export const DEFAULT_SATELLITE_SCALE: Readonly<Omit<SatelliteScaleConfig, 'minDistanceKm' | 'maxDistanceKm'>> = {
  minRenderDistance: 2.5,
  maxRenderDistance: 9,
};

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

function assertRenderRange(minRenderDistance: number, maxRenderDistance: number): void {
  assertFiniteNonNegative(minRenderDistance, 'minRenderDistance');
  assertFiniteNonNegative(maxRenderDistance, 'maxRenderDistance');
  if (maxRenderDistance < minRenderDistance) {
    throw new RangeError('maxRenderDistance must be greater than or equal to minRenderDistance');
  }
}

/**
 * Map AU to render units with a log1p curve. The clamp keeps the configured
 * outer boundary stable while preserving the physical distance ordering.
 */
export function mapHeliocentricDistance(
  distanceAU: number,
  config: HeliocentricScaleConfig = DEFAULT_HELIOCENTRIC_SCALE,
): number {
  assertFiniteNonNegative(distanceAU, 'distanceAU');
  assertFiniteNonNegative(config.maxDistanceAU, 'maxDistanceAU');
  assertRenderRange(config.minRenderDistance, config.maxRenderDistance);
  if (config.maxDistanceAU === 0) {
    return config.minRenderDistance;
  }

  const boundedDistanceAU = Math.min(distanceAU, config.maxDistanceAU);
  const normalized = Math.log1p(boundedDistanceAU) / Math.log1p(config.maxDistanceAU);
  return (
    config.minRenderDistance +
    normalized * (config.maxRenderDistance - config.minRenderDistance)
  );
}

/** Linear comparison mode; this deliberately exposes the real distance spread. */
export function mapLinearHeliocentricDistance(
  distanceAU: number,
  config: HeliocentricScaleConfig = DEFAULT_HELIOCENTRIC_SCALE,
): number {
  assertFiniteNonNegative(distanceAU, 'distanceAU');
  assertFiniteNonNegative(config.maxDistanceAU, 'maxDistanceAU');
  assertRenderRange(config.minRenderDistance, config.maxRenderDistance);
  if (config.maxDistanceAU === 0) {
    return config.minRenderDistance;
  }

  const normalized = Math.min(distanceAU, config.maxDistanceAU) / config.maxDistanceAU;
  return (
    config.minRenderDistance +
    normalized * (config.maxRenderDistance - config.minRenderDistance)
  );
}

/**
 * Map a moon's parent-relative distance to local render units. Subtracting the
 * minimum measured orbit before applying log1p keeps the moon order intact and
 * prevents the global Solar System scale from collapsing moons into a planet.
 */
export function mapSatelliteDistance(
  distanceKm: number,
  config: SatelliteScaleConfig,
): number {
  assertFiniteNonNegative(distanceKm, 'distanceKm');
  assertFiniteNonNegative(config.minDistanceKm, 'minDistanceKm');
  assertFiniteNonNegative(config.maxDistanceKm, 'maxDistanceKm');
  assertRenderRange(config.minRenderDistance, config.maxRenderDistance);
  if (config.maxDistanceKm < config.minDistanceKm) {
    throw new RangeError('maxDistanceKm must be greater than or equal to minDistanceKm');
  }

  const shiftedDistance = Math.max(0, distanceKm - config.minDistanceKm);
  const shiftedMax = Math.max(1, config.maxDistanceKm - config.minDistanceKm);
  const normalized = Math.min(shiftedDistance, shiftedMax) / shiftedMax;
  const logarithmicNormalized = Math.log1p(normalized * shiftedMax) / Math.log1p(shiftedMax);
  return (
    config.minRenderDistance +
    logarithmicNormalized * (config.maxRenderDistance - config.minRenderDistance)
  );
}

/**
 * A focus scale is intentionally a separate mode so scene code can replace the
 * heliocentric extent with a selected system's local extent without rewriting
 * the physical data model.
 */
export function mapFocusDistance(
  distanceAU: number,
  focusMaxDistanceAU: number,
  minRenderDistance = 4,
  maxRenderDistance = 42,
): number {
  return mapHeliocentricDistance(distanceAU, {
    maxDistanceAU: focusMaxDistanceAU,
    minRenderDistance,
    maxRenderDistance,
  });
}

export function isDistanceScaleMode(value: string): value is DistanceScaleMode {
  return value === 'log' || value === 'linear' || value === 'focus';
}
