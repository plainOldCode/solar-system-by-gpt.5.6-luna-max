import { Vector3 } from 'three';
import type { CelestialBodyData, OrbitDirection } from '../types/astronomy';

const TWO_PI = Math.PI * 2;
const MAX_SUPPORTED_ECCENTRICITY = 0.95;

export interface OrbitalPositionOptions {
  readonly elapsedDays: number;
  readonly semiMajorAxis: number;
  readonly orbitalPeriodDays: number;
  readonly eccentricity?: number;
  readonly inclinationDeg?: number;
  readonly orbitDirection?: OrbitDirection;
  readonly phaseRadians?: number;
  readonly argumentOfPeriapsisRadians?: number;
  readonly ascendingNodeRadians?: number;
}

export interface OrbitalPositionResult {
  readonly position: Vector3;
  readonly meanAnomaly: number;
  readonly eccentricAnomaly: number;
  readonly trueAnomaly: number;
  readonly radialDistance: number;
}

/** Solve M = E - e sin(E) with Newton-Raphson iteration. */
export function solveKeplerEquation(
  meanAnomaly: number,
  eccentricity: number,
  iterations = 8,
): number {
  const normalizedMeanAnomaly = normalizeAngle(meanAnomaly);
  let eccentricAnomaly = eccentricity < 0.8
    ? normalizedMeanAnomaly
    : Math.PI;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const correction = (
      eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - normalizedMeanAnomaly
    ) / (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= correction;
    if (Math.abs(correction) < 1e-10) {
      break;
    }
  }

  return eccentricAnomaly;
}

/**
 * Evaluate a Keplerian orbit in render space. The supplied semi-major axis is
 * already mapped to display units, while eccentricity, period, inclination,
 * and direction continue to come from the astronomical data model.
 */
export function calculateOrbitalPosition(
  options: OrbitalPositionOptions,
  target = new Vector3(),
): OrbitalPositionResult {
  assertFiniteNonNegative(options.elapsedDays, 'elapsedDays');
  assertFinitePositive(options.semiMajorAxis, 'semiMajorAxis');
  assertFinitePositive(options.orbitalPeriodDays, 'orbitalPeriodDays');

  const eccentricity = clamp(
    options.eccentricity ?? 0,
    0,
    MAX_SUPPORTED_ECCENTRICITY,
  );
  const direction = options.orbitDirection === 'retrograde' ? -1 : 1;
  const phaseRadians = options.phaseRadians ?? 0;
  const meanAnomaly = direction * TWO_PI * (options.elapsedDays / options.orbitalPeriodDays)
    + phaseRadians;
  const eccentricAnomaly = solveKeplerEquation(meanAnomaly, eccentricity);
  const semiMinorAxis = options.semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);

  // The ellipse is expressed in an orbital x/z plane, then inclined and
  // rotated by deterministic orientation angles so orbits do not all overlap.
  const orbitalX = options.semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const orbitalZ = semiMinorAxis * Math.sin(eccentricAnomaly);
  const argument = options.argumentOfPeriapsisRadians ?? 0;
  const argumentCos = Math.cos(argument);
  const argumentSin = Math.sin(argument);
  const argumentX = orbitalX * argumentCos - orbitalZ * argumentSin;
  const argumentZ = orbitalX * argumentSin + orbitalZ * argumentCos;

  const inclinationRadians = degreesToRadians(options.inclinationDeg ?? 0);
  const inclinedY = argumentZ * Math.sin(inclinationRadians);
  const inclinedZ = argumentZ * Math.cos(inclinationRadians);

  const ascendingNode = options.ascendingNodeRadians ?? 0;
  const nodeCos = Math.cos(ascendingNode);
  const nodeSin = Math.sin(ascendingNode);
  const worldX = argumentX * nodeCos + inclinedZ * nodeSin;
  const worldZ = -argumentX * nodeSin + inclinedZ * nodeCos;

  target.set(worldX, inclinedY, worldZ);

  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2),
  );
  const radialDistance = options.semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly));

  return {
    position: target,
    meanAnomaly,
    eccentricAnomaly,
    trueAnomaly,
    radialDistance,
  };
}

export function buildOrbitPoints(
  data: CelestialBodyData,
  semiMajorAxis: number,
  sampleCount = 128,
  phaseRadians = phaseFromId(data.id),
): Vector3[] {
  const orbitalPeriodDays = data.orbitalPeriodDays ?? 1;
  const points: Vector3[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const fraction = index / sampleCount;
    const result = calculateOrbitalPosition({
      elapsedDays: fraction * orbitalPeriodDays,
      semiMajorAxis,
      orbitalPeriodDays,
      eccentricity: data.eccentricity,
      inclinationDeg: data.inclinationDeg,
      orbitDirection: data.orbitDirection,
      phaseRadians,
      argumentOfPeriapsisRadians: argumentOfPeriapsisFromId(data.id),
      ascendingNodeRadians: ascendingNodeFromId(data.id),
    });
    points.push(result.position.clone());
  }
  return points;
}

export function phaseFromId(id: string): number {
  return hashToUnitInterval(id, 0x9e3779b9) * TWO_PI;
}

export function argumentOfPeriapsisFromId(id: string): number {
  return hashToUnitInterval(id, 0x85ebca6b) * TWO_PI;
}

export function ascendingNodeFromId(id: string): number {
  return hashToUnitInterval(id, 0xc2b2ae35) * TWO_PI;
}

export function normalizeAngle(angle: number): number {
  const normalized = angle % TWO_PI;
  return normalized < 0 ? normalized + TWO_PI : normalized;
}

export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function hashToUnitInterval(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x45d9f3b) >>> 0;
    hash ^= hash >>> 16;
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a finite positive number`);
  }
}
