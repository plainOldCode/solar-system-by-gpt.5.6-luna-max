import { BufferGeometry, LineBasicMaterial, LineLoop } from 'three';
import type { CelestialBodyData } from '../types/astronomy';
import { buildOrbitPoints } from '../simulation/orbitalMechanics';

export interface OrbitLineOptions {
  readonly opacity?: number;
  readonly sampleCount?: number;
}

export function createOrbitLine(
  data: CelestialBodyData,
  renderedSemiMajorAxis: number,
  options: OrbitLineOptions = {},
): LineLoop<BufferGeometry, LineBasicMaterial> {
  const geometry = createOrbitGeometry(data, renderedSemiMajorAxis, options.sampleCount);
  const material = new LineBasicMaterial({
    color: data.displayColor,
    transparent: true,
    opacity: options.opacity ?? 0.22,
    depthWrite: false,
  });
  const line = new LineLoop(geometry, material);
  line.name = `${data.id}-orbit-line`;
  line.renderOrder = -1;
  return line;
}

export function updateOrbitLine(
  line: LineLoop<BufferGeometry, LineBasicMaterial>,
  data: CelestialBodyData,
  renderedSemiMajorAxis: number,
  sampleCount = 128,
): void {
  const previousGeometry = line.geometry;
  line.geometry = createOrbitGeometry(data, renderedSemiMajorAxis, sampleCount);
  previousGeometry.dispose();
}

function createOrbitGeometry(
  data: CelestialBodyData,
  renderedSemiMajorAxis: number,
  sampleCount = 128,
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setFromPoints(buildOrbitPoints(data, renderedSemiMajorAxis, sampleCount));
  return geometry;
}
