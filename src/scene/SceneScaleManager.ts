import type {
  CelestialBodyData,
  DistanceScaleMode,
  RenderedBodyMetrics,
  SizeScaleMode,
  SolarSystemDataset,
} from '../types/astronomy';
import {
  DEFAULT_HELIOCENTRIC_SCALE,
  DEFAULT_SATELLITE_SCALE,
  mapFocusDistance,
  mapHeliocentricDistance,
  mapLinearHeliocentricDistance,
  mapSatelliteDistance,
} from '../scales/distanceScales';
import {
  DEFAULT_SIZE_POLICY,
  mapMoonRadius,
  mapPlanetRadius,
  mapSunRadius,
} from '../scales/sizeScales';

/** Pure render-space policy; it never mutates the astronomical dataset. */
export class SceneScaleManager {
  private readonly bodyById: ReadonlyMap<string, CelestialBodyData>;
  private readonly heliocentricScale = DEFAULT_HELIOCENTRIC_SCALE;
  private readonly satelliteScale = DEFAULT_SATELLITE_SCALE;
  private distanceMode: DistanceScaleMode;
  private sizeMode: SizeScaleMode;
  private focusBodyId: string | null = null;

  constructor(
    dataset: SolarSystemDataset,
    distanceMode: DistanceScaleMode = 'log',
    sizeMode: SizeScaleMode = DEFAULT_SIZE_POLICY.mode,
  ) {
    this.bodyById = new Map(dataset.bodies.map((body) => [body.id, body]));
    this.distanceMode = distanceMode;
    this.sizeMode = sizeMode;
  }

  setDistanceMode(mode: DistanceScaleMode): void {
    this.distanceMode = mode;
  }

  setSizeMode(mode: SizeScaleMode): void {
    this.sizeMode = mode;
  }

  setFocusBodyId(bodyId: string | null): void {
    this.focusBodyId = bodyId;
  }

  getDistanceMode(): DistanceScaleMode {
    return this.distanceMode;
  }

  getSizeMode(): SizeScaleMode {
    return this.sizeMode;
  }

  getRenderedBodyRadius(data: CelestialBodyData): number {
    if (data.type === 'star') {
      return mapSunRadius(data.radiusKm, this.sizeMode);
    }
    return data.type === 'moon'
      ? mapMoonRadius(data.radiusKm, this.sizeMode)
      : mapPlanetRadius(data.radiusKm, this.sizeMode);
  }

  getHeliocentricOrbitRadius(data: CelestialBodyData): number {
    if (data.semiMajorAxisUnit !== 'AU' || data.semiMajorAxis === undefined) {
      return 0;
    }

    switch (this.distanceMode) {
      case 'log':
        return mapHeliocentricDistance(data.semiMajorAxis, this.heliocentricScale);
      case 'linear':
        return mapLinearHeliocentricDistance(data.semiMajorAxis, this.heliocentricScale);
      case 'focus': {
        const focusBody = this.getFocusAnchor();
        if (!focusBody?.semiMajorAxis || focusBody.semiMajorAxisUnit !== 'AU') {
          return mapHeliocentricDistance(data.semiMajorAxis, this.heliocentricScale);
        }
        const focusMaxDistance = Math.max(1.5, focusBody.semiMajorAxis * 1.8);
        return mapFocusDistance(data.semiMajorAxis, focusMaxDistance, 8, 92);
      }
      default:
        return assertNever(this.distanceMode);
    }
  }

  getSatelliteOrbitRadius(parent: CelestialBodyData, satellite: CelestialBodyData): number {
    if (satellite.semiMajorAxisUnit !== 'km' || satellite.semiMajorAxis === undefined) {
      return this.getRenderedBodyRadius(parent) * 3;
    }

    const siblings = [...this.bodyById.values()].filter(
      (body) => body.type === 'moon' && body.parentId === parent.id
        && body.semiMajorAxisUnit === 'km' && body.semiMajorAxis !== undefined,
    );
    const distances = siblings.map((body) => body.semiMajorAxis ?? satellite.semiMajorAxis ?? 0);
    const minDistanceKm = Math.min(...distances, satellite.semiMajorAxis);
    const maxDistanceKm = Math.max(...distances, satellite.semiMajorAxis);
    const mappedDistance = mapSatelliteDistance(satellite.semiMajorAxis, {
      minDistanceKm,
      maxDistanceKm,
      minRenderDistance: this.satelliteScale.minRenderDistance,
      maxRenderDistance: this.satelliteScale.maxRenderDistance,
    });

    // mapSatelliteDistance returns the intended 2.5–9 parent-radius multiplier.
    return mappedDistance * this.getRenderedBodyRadius(parent);
  }

  getRenderedMetrics(data: CelestialBodyData): RenderedBodyMetrics {
    const orbitalRadius = data.type === 'moon' && data.parentId
      ? this.getSatelliteOrbitRadius(this.bodyById.get(data.parentId) ?? data, data)
      : this.getHeliocentricOrbitRadius(data);
    return {
      orbitalRadius,
      bodyRadius: this.getRenderedBodyRadius(data),
      distanceMode: this.distanceMode,
      sizeMode: this.sizeMode,
    };
  }

  getBody(bodyId: string): CelestialBodyData | undefined {
    return this.bodyById.get(bodyId);
  }

  private getFocusAnchor(): CelestialBodyData | undefined {
    if (!this.focusBodyId) {
      return undefined;
    }
    const focused = this.bodyById.get(this.focusBodyId);
    if (!focused) {
      return undefined;
    }
    if (focused.type === 'moon' && focused.parentId) {
      return this.bodyById.get(focused.parentId);
    }
    return focused.type === 'star' ? undefined : focused;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported distance scale mode: ${String(value)}`);
}
