# Task 02 scene/core validation

Date of validation: 2026-08-15T04:03:17Z (UTC)
Workspace: `/Users/miniadmin/Desktop/threejs-solar-system`

## Scope

Owned implementation paths are `src/scene/**`, `src/simulation/**`, `src/rendering/**`, and `src/main.ts`. This task does not modify the data, scales, types, UI, styles, package/config, README, or tests paths. `src/rendering/three.d.ts` is a local declaration surface for the committed `three` package, whose package manifest does not include `@types/three`; it does not alter runtime dependencies.

## Commands and exit codes

| Command / probe | Exit/result |
| --- | ---: |
| `npm install` | 0; 17 packages installed, 0 vulnerabilities reported; npm printed the existing install-script approval warning for `esbuild`/`fsevents` |
| `npm run typecheck` before dependency installation | 2; workspace had no installed `vite/client` types |
| `npm run typecheck` after `npm install` | 0 |
| `npm run build` | 0; TypeScript check and Vite build completed |
| `npx esbuild src/main.ts --bundle --platform=browser --format=esm --outfile=/tmp/solar-main-bundle.js` | 0; complete browser bundle produced, confirming the owned entry imports resolve |
| `npx esbuild src/simulation/orbitalMechanics.ts ...` plus Node invariant check | 0; Kepler solve residual and one-period position repeat both passed (`repeat=2.2644195468014703e-15`) |
| `npx esbuild src/scene/SceneScaleManager.ts ...` plus Node invariant check | 0; heliocentric ordering, satellite ordering, and 2.5–9 parent-radius bounds passed (`moonA=3.0000000000000004`, `moonB=10.8`, `earthRadius=1.2000000000000002`) |
| Source acceptance assertion for hierarchy, logarithmic/satellite scales, Kepler/inclination, rings, procedural materials, star field, Sun light, and disposal API | 0; all nine assertions returned `True` |
| `npm run dev -- --host 127.0.0.1` | Started successfully; Vite reported ready in 97 ms at `http://127.0.0.1:5173/` |
| Safe HTTP startup probe: `curl --fail --silent --show-error --http1.1 --output /tmp/solar-system-dev-response.html http://127.0.0.1:5173/` | 0; served HTML contained the `#app` mount and was 829 bytes |
| Dev process shutdown | Cleanly terminated with the tracked process manager after the HTTP probe; no server error output |
| `git diff --check` | 0 |

## Scene acceptance observations

- `SolarSystemSceneController` creates a data-driven parent/child hierarchy. Each moon node is added to its parent body's `moonSystemGroup`, so parent orbital motion carries the complete satellite system.
- Planet and dwarf-planet orbits use `mapHeliocentricDistance`/linear comparison or focus mode. Moon orbits use the separate `mapSatelliteDistance` policy and are multiplied by the displayed parent radius; physical astronomical fields remain untouched.
- `calculateOrbitalPosition` solves Kepler's equation, applies eccentricity, inclination, deterministic orbital orientation, and retrograde direction. Orbit lines are prebuilt as elliptical `LineLoop` geometry and refreshed only when a scale mode changes.
- `SimulationClock.advance(realDeltaSeconds)` drives all orbital and rotation angles from accumulated simulation days. The default is 365.25 simulation days per wall-clock second, with play/pause/reset and selectable rate methods.
- Body materials are procedural. `CanvasTexture` is generated in memory for atmospheric bands/surface variation; no external image or network asset is required. The Sun has a dedicated emissive material and `PointLight` at the origin.
- Saturn and Uranus use explicit `RingGeometry`/procedural ring materials. A deterministic `Points` star field is created with a mobile-sized fallback count.
- `RendererEnvironment` caps pixel ratio at 2, updates camera/renderer dimensions through `ResizeObserver` or a window-resize fallback, and exposes `dispose()`. The scene controller traverses and disposes geometries, materials, texture maps, renderer, and context.
- The UI handoff is explicit: `getSelectionTargets`, `getSelectionTarget`, `getBodyData`, `getRenderedBodyMetrics`, `focusBody`, `resetView`, scale/visibility setters, `setCameraControls`, `subscribe`, and the public camera/renderer/scene/clock properties are available without reaching into private nodes.
- `src/main.ts` exports `createSolarSystemApplication`, `bootstrapSolarSystem`, and `solarSystemApp`. The current scaffold `index.html` intentionally has no script tag because that path is outside this task's ownership; the later UI/integration task must wire the browser entry without changing the scene internals.

## Forbidden-path check

The staged task change must contain only:

- `src/main.ts`
- `src/rendering/**`
- `src/scene/**`
- `src/simulation/**`
- `evidence/task-02-scene-validation.md`

No files under `package.json`, lockfiles, config files, `src/data/**`, `src/scales/**`, `src/types/**`, `src/ui/**`, `src/styles/**`, `README.md`, or `tests/**` are staged or committed. Local `node_modules/` and `dist/` directories produced by validation are not task artifacts and are not staged.

## Remaining integration note

The development server smoke test validates the committed Vite shell and owned source bundle. Browser-level rendering, OrbitControls, labels, panels, and interaction smoke checks remain with the downstream UI/integration tasks, which consume the controller adapter rather than changing scene internals.
