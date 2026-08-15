export type CelestialBodyType = 'star' | 'planet' | 'dwarf-planet' | 'moon';

export type SemiMajorAxisUnit = 'AU' | 'km';

export type RotationDirection = 'prograde' | 'retrograde';

export type OrbitDirection = 'prograde' | 'retrograde';

/** A stable identifier declared in docs/astronomical-source-manifest.json. */
export type AstronomicalSourceId = string;

export interface CelestialBodyData {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly type: CelestialBodyType;
  readonly parentId?: string;

  /** Mean/equatorial radius, in kilometres. This is never a rendered radius. */
  readonly radiusKm: number;
  /** Orbital semi-major axis around the parent body, when applicable. */
  readonly semiMajorAxis?: number;
  readonly semiMajorAxisUnit?: SemiMajorAxisUnit;
  readonly orbitalPeriodDays?: number;
  readonly rotationPeriodHours?: number;
  readonly rotationDirection?: RotationDirection;
  readonly eccentricity?: number;
  /** Inclination relative to the parent reference plane, in degrees. */
  readonly inclinationDeg?: number;
  readonly orbitDirection?: OrbitDirection;
  readonly axialTiltDeg?: number;

  readonly displayColor: string;
  readonly description: string;
  readonly sourceIds: readonly AstronomicalSourceId[];
}

export interface SolarSystemDataset {
  readonly revision: string;
  readonly dataAsOf: string;
  readonly bodies: readonly CelestialBodyData[];
}

export type DistanceScaleMode = 'log' | 'linear' | 'focus';

export type SizeScaleMode = 'enhanced-visibility' | 'relative-size' | 'uniform-markers';

export interface RenderedBodyMetrics {
  /** Render-space orbit radius; do not interpret as AU or kilometres. */
  readonly orbitalRadius: number;
  /** Render-space body radius; do not interpret as kilometres. */
  readonly bodyRadius: number;
  readonly distanceMode: DistanceScaleMode;
  readonly sizeMode: SizeScaleMode;
}
