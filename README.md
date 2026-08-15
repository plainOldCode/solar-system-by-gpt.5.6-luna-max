# Logarithmic Solar System scaffold

This repository contains the foundational Vite + TypeScript + Three.js data and scale layer for an interactive Solar System visualization. It keeps physical astronomical values separate from render-space values so the scene can compress heliocentric distances and enlarge small bodies without corrupting the source data.

The current scaffold intentionally owns the application shell, typed data model, source manifest, and scale policies. The Three.js scene, animation loop, styles, and interaction entry point are supplied by the downstream scene/UI tasks in the project plan.

## Project structure

```text
.
├── docs/
│   ├── astronomical-source-manifest.json
│   ├── astronomical-source-manifest.md
│   └── threejs_solar_system_demo_prompt_en.md
├── index.html
├── package.json
├── src/
│   ├── data/
│   │   ├── solarSystemData.ts
│   │   └── sourceCatalog.ts
│   ├── scales/
│   │   ├── distanceScales.ts
│   │   └── sizeScales.ts
│   └── types/
│       └── astronomy.ts
├── tsconfig.json
└── vite.config.ts
```

## Install and run

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npm run dev
```

Other project commands:

```bash
npm run typecheck   # TypeScript validation without emitting files
npm run build       # TypeScript validation followed by a Vite production build
npm run preview     # Serve the production build locally
```

## Data model

`src/data/solarSystemData.ts` exports `SOLAR_SYSTEM_DATA`, `SOLAR_SYSTEM_BODIES`, `celestialBodyById`, and `majorMoonsByParentId`. Each `CelestialBodyData` record contains:

- physical `radiusKm`;
- `semiMajorAxis` and an explicit `semiMajorAxisUnit` (`AU` for heliocentric bodies, `km` for moons);
- orbital period, rotation period, eccentricity, inclination, and optional axial tilt;
- explicit parent IDs for moons;
- Korean and English names, display color, description, and source IDs.

The dataset includes the Sun, Mercury through Neptune, Pluto, and the required major moons: Earth's Moon; Phobos and Deimos; Io, Europa, Ganymede, and Callisto; Mimas, Enceladus, Tethys, Dione, Rhea, Titan, and Iapetus; Miranda, Ariel, Umbriel, Titania, and Oberon; Triton; and Charon, Styx, Nix, Kerberos, and Hydra.

Values are rounded static parameters, not live ephemeris state vectors. Optional rotation fields are intentionally absent for small irregular Pluto moons when a stable source value is not available.

## NASA/JPL provenance

The source manifest is maintained in both human-readable and machine-readable form:

- `docs/astronomical-source-manifest.md`
- `docs/astronomical-source-manifest.json`

The primary sources are NASA NSSDC's Planetary Fact Sheet and NASA/JPL Solar System Dynamics' Planetary Physical Parameters and Natural Satellite Physical Parameters tables. Pluto is additionally cross-checked against the JPL Small-Body Database API. Each record's `sourceIds` points to the manifest IDs, and `src/data/sourceCatalog.ts` exposes the same provenance to runtime code.

## Physical values versus rendered values

The data model is the source of truth. `radiusKm`, `semiMajorAxis`, `orbitalPeriodDays`, and related fields remain physical quantities. Functions in `src/scales/` return render units only; they never mutate a `CelestialBodyData` record. A rendered unit has no interpretation as AU or kilometres.

The application therefore has three separate concepts:

1. **Physical astronomical data** — values and units from NASA/JPL sources.
2. **Rendered orbital distance** — a display mapping used to fit the system in a viewport.
3. **Rendered body size** — a visibility mapping independent of orbital distance.

## Distance scales

### Heliocentric log scale (default)

With `d` as a non-negative distance in AU, `D` as the configured maximum AU, and `[r_min, r_max]` as render-space bounds:

```text
bounded = clamp(d, 0, D)
normalized = log1p(bounded) / log1p(D)
rendered = r_min + normalized * (r_max - r_min)
```

The default configuration is `D = 39.5 AU`, `r_min = 16`, and `r_max = 190`. This preserves the order from Mercury to Pluto while preventing the outer planets from consuming the complete viewport. `mapLinearHeliocentricDistance` is available as a comparison mode, and `mapFocusDistance` provides a local extent for a selected system.

### Satellite log scale

Moon distances use their parent system's local coordinate space instead of the heliocentric scale. With `s` as a moon-to-parent distance, `s_min`/`s_max` as the local data range, and `[r_min, r_max]` as local render bounds:

```text
shifted = max(0, s - s_min)
shiftedMax = max(1, s_max - s_min)
normalized = log1p(min(shifted, shiftedMax)) / log1p(shiftedMax)
rendered = r_min + normalized * (r_max - r_min)
```

The scene should choose local bounds so moon orbits remain approximately 2.5–9 times the displayed parent radius in detail view. The global Solar System view can reduce or hide moon orbit opacity without changing the physical data.

## Body-size policy

`src/scales/sizeScales.ts` uses independent render-space policies:

- **Enhanced Visibility (default, planets):** `clamp(0.55 + 0.65 * sqrt(radiusKm / 6371), 0.55, 4.0)`.
- **Enhanced Visibility (moons):** `clamp(0.16 + 0.4 * sqrt(radiusKm / 6371), 0.16, 0.75)`.
- **Relative Size:** stronger square-root emphasis while retaining the physical ordering.
- **Uniform Markers:** stable marker sizes for visual comparison.
- **Sun:** handled separately at `8` render units so it remains prominent without overwhelming the complete view.

These are not physical radii and do not share a uniform scale with orbital distance. The UI must repeat this distinction whenever it reports rendered metrics.

## Moon-selection policy

The dataset includes the moons required by the project specification rather than every catalogued satellite. Selection favors Earth's Moon, Mars's two moons, Jupiter's four Galilean moons, Saturn's seven named major moons, Uranus's five classical major moons, Neptune's Triton, and all five known Pluto moons required by the prompt. Adding another moon only requires a new data record and source assignment; rendering code should consume `parentId` and the typed fields rather than hard-code names.

## Handoff notes

- `index.html` is a valid Vite entry shell without a script import while the downstream scene task owns `src/main.ts`.
- No external textures or runtime data downloads are required by this layer.
- The implementation must keep the physical/rendered distinction visible in the eventual HUD and information panel.
