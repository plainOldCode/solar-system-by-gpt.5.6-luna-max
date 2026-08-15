import type { AstronomicalSourceId } from '../types/astronomy';

export interface AstronomicalSourceRecord {
  readonly id: AstronomicalSourceId;
  readonly publisher: string;
  readonly title: string;
  readonly url: string;
  readonly accessedOn: string;
  readonly scope: string;
  readonly notes: string;
}

/**
 * Runtime-readable provenance labels for the bundled dataset.
 * The durable manifest with field-level notes lives in
 * docs/astronomical-source-manifest.json.
 */
export const ASTRONOMICAL_SOURCES: readonly AstronomicalSourceRecord[] = [
  {
    id: 'nasa-planetary-fact-sheet',
    publisher: 'NASA Goddard Space Flight Center / NSSDC',
    title: 'Planetary Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
    accessedOn: '2026-08-15',
    scope: 'Sun and planets: radius, heliocentric semi-major axis, periods, rotation, eccentricity, and inclination.',
    notes: 'Values are rounded for a display dataset; NASA table headings define the units used here.',
  },
  {
    id: 'jpl-planet-physical-parameters',
    publisher: 'NASA Jet Propulsion Laboratory / Solar System Dynamics',
    title: 'Planetary Physical Parameters',
    url: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
    accessedOn: '2026-08-15',
    scope: 'Cross-check for planetary radii, rotation values, and physical parameters.',
    notes: 'JPL values are preferred where the NASA fact sheet rounds a value differently.',
  },
  {
    id: 'jpl-natural-satellite-physical-parameters',
    publisher: 'NASA Jet Propulsion Laboratory / Solar System Dynamics',
    title: 'Natural Satellite Physical Parameters',
    url: 'https://ssd.jpl.nasa.gov/sats/phys_par/',
    accessedOn: '2026-08-15',
    scope: 'Required major moons: radius, parent distance, orbital period, eccentricity, and inclination.',
    notes: 'Some irregular moons do not have a reliably tabulated rotation period; those fields remain absent rather than invented.',
  },
  {
    id: 'jpl-small-body-database',
    publisher: 'NASA Jet Propulsion Laboratory / Solar System Dynamics',
    title: 'Small-Body Database Lookup — Pluto (134340)',
    url: 'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=134340',
    accessedOn: '2026-08-15',
    scope: 'Pluto orbital classification and heliocentric orbital elements.',
    notes: 'The bundled Pluto values are rounded epoch-independent display parameters, not an ephemeris.',
  },
] as const;

export const astronomicalSourceById = new Map(
  ASTRONOMICAL_SOURCES.map((source) => [source.id, source]),
);
