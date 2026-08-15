# Astronomical source manifest

This manifest records the public NASA/JPL sources used to build the bundled, rounded display dataset in `src/data/solarSystemData.ts`. The application does not fetch these pages at runtime: the manifest and the `sourceIds` on each body preserve provenance in the repository.

## Retrieval record

- Dataset revision: `2026-08-15-rounded-v1`
- Access date for all sources: `2026-08-15` (UTC)
- Rounding policy: values are rounded to practical display precision; units and ordering are retained. The data is not an ephemeris and does not encode a particular observation epoch.

## Sources

| ID | Publisher and title | URL | Used for |
| --- | --- | --- | --- |
| `nasa-planetary-fact-sheet` | NASA Goddard Space Flight Center / NSSDC — Planetary Fact Sheet | <https://nssdc.gsfc.nasa.gov/planetary/factsheet/> | Sun and planet radius, heliocentric semi-major axis, orbital period, rotation period, eccentricity, and inclination. |
| `jpl-planet-physical-parameters` | NASA Jet Propulsion Laboratory / Solar System Dynamics — Planetary Physical Parameters | <https://ssd.jpl.nasa.gov/planets/phys_par.html> | Cross-check and precision source for planetary radii, physical parameters, and rotation values. |
| `jpl-natural-satellite-physical-parameters` | NASA Jet Propulsion Laboratory / Solar System Dynamics — Natural Satellite Physical Parameters | <https://ssd.jpl.nasa.gov/sats/phys_par/> | Required major moons: radius, parent-body semi-major axis, orbital period, eccentricity, and inclination. |
| `jpl-small-body-database` | NASA Jet Propulsion Laboratory / Solar System Dynamics — Small-Body Database Lookup for Pluto (134340) | <https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=134340> | Pluto's dwarf-planet classification and heliocentric orbital elements; also retained as context for the Pluto system. |

The machine-readable form of this record is `docs/astronomical-source-manifest.json`.

## Field conventions

- `radiusKm` is the physical mean/equatorial radius in kilometres.
- `semiMajorAxis` is in AU for Sun-orbiting planets/dwarf planets and kilometres for moons orbiting a parent body. `semiMajorAxisUnit` is always present when the value is present.
- `orbitalPeriodDays` is the sidereal orbital period in days where tabulated.
- `rotationPeriodHours` is the sidereal rotation period in hours where reliably tabulated. `rotationDirection` makes retrograde rotation explicit instead of encoding a negative duration.
- `eccentricity` and `inclinationDeg` describe the orbit. Planetary inclinations are heliocentric/ecliptic values; moon inclinations follow the satellite source's parent-system reference plane. `orbitDirection: "retrograde"` is used for Triton.
- A missing optional field means the source does not provide a stable value suitable for this rounded demo dataset. In particular, the small irregular Pluto moons have no invented rotation period.

## Body-to-source assignment

- Sun and Mercury through Neptune: `nasa-planetary-fact-sheet` plus `jpl-planet-physical-parameters`.
- Pluto: the two planetary sources plus `jpl-small-body-database`.
- Earth Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Mimas, Enceladus, Tethys, Dione, Rhea, Titan, Iapetus, Miranda, Ariel, Umbriel, Titania, Oberon, and Triton: `jpl-natural-satellite-physical-parameters`.
- Charon, Styx, Nix, Kerberos, and Hydra: `jpl-natural-satellite-physical-parameters` plus `jpl-small-body-database` for Pluto-system context.

The exact assignment is also encoded in each body's `sourceIds` array so downstream scene and UI code can display or audit provenance without duplicating a lookup table.
