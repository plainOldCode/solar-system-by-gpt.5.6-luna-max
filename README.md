# Three.js Logarithmic Solar System

> Created by GPT-5.6 Luna Max on Hermes.
>
> English | [Korean](README.ko.md)

A responsive Three.js visualization that lets users explore the Solar System using real astronomical data. It includes the Sun through Pluto and major moons while keeping physical values separate from display-space distance and size scales.

## Original implementation prompt

The original implementation prompt for this project is available here:

- [Three.js Logarithmic Solar System Demo — Implementation Prompt](https://gist.github.com/plainOldCode/fb2e3ea48caada23107704628c2a9384)
- Preserved in the repository as [`docs/threejs_solar_system_demo_prompt_en.md`](docs/threejs_solar_system_demo_prompt_en.md)

## Features

- The Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto
- Earth's Moon; Phobos and Deimos; Jupiter's Galilean moons; and major moons of Saturn, Uranus, Neptune, and Pluto
- `OrbitControls` camera interaction: orbit, zoom, and pan
- Raycaster-based body selection with smooth camera focus transitions
- Hover tooltips and an inspector that shows real astronomical data alongside rendered values
- Play/Pause, time-scale selection, and time reset
- Visibility controls for orbit lines, labels, moons, moon orbits, and the star field
- Distance modes: `Log Scale`, `Linear Scale`, and `Focus Scale`
- Body-size modes: `Enhanced Visibility`, `Relative Size`, and `Uniform Markers`
- Procedurally generated star field, materials, and orbit lines with no external texture assets
- Responsive desktop and mobile layout
- Mobile `Hide panels` / `Show panels` toggle for collapsing and restoring the HUD panels

## Requirements

- Node.js 20.19 or later
- npm
- A modern browser with WebGL support

## Install and run

```bash
npm install
npm run dev
```

The development server runs at `http://127.0.0.1:5173/` by default.

## Project commands

```bash
npm run typecheck    # TypeScript type checking
npm run build        # Type checking followed by a Vite production build
npm run preview      # Preview the production build
npm audit            # Audit all dependencies
npm audit --omit=dev # Audit production dependencies
```

### Browser smoke validation

`final-acceptance-smoke.cjs` connects to a running Vite server with Playwright and Chrome/Chromium to validate interactions, responsive layout, and browser errors. Playwright is not an application runtime dependency, so its module path can be supplied separately.

```bash
# Run the Vite server in a separate terminal
npm run dev -- --host 127.0.0.1 --port 5173

# Run the smoke test with the Playwright module path
PLAYWRIGHT_MODULE=/path/to/playwright \
SMOKE_OUTPUT=/tmp/solar-system-smoke.json \
node scripts/final-acceptance-smoke.cjs
```

Use `BASE_URL` to target a different development server. Set `SMOKE_SCREENSHOT_DIR` to generate desktop and mobile screenshots.

## Architecture

```text
.
├── docs/
│   ├── astronomical-source-manifest.json
│   ├── astronomical-source-manifest.md
│   └── threejs_solar_system_demo_prompt_en.md
├── evidence/
│   ├── final-acceptance*.{md,json,png}
│   └── task-*-validation.md
├── scripts/
│   ├── final-acceptance-smoke.cjs
│   ├── source-acceptance-check.mjs
│   ├── verify-prior-commits.mjs
│   └── verify-task-scope.mjs
├── src/
│   ├── data/        # Physical data and provenance
│   ├── rendering/   # Renderer, procedural materials, orbit lines, and star field
│   ├── scales/      # Distance and body-size display scales
│   ├── scene/       # Three.js scene, controller, and body graph
│   ├── simulation/  # Timekeeping and orbital calculations
│   ├── styles/      # HUD and responsive CSS
│   └── ui/          # Control panel, inspector, labels, and mobile panel toggle
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

## Astronomical data and provenance

The source of truth for physical data is [`src/data/solarSystemData.ts`](src/data/solarSystemData.ts). Source mappings are documented in:

- [`docs/astronomical-source-manifest.md`](docs/astronomical-source-manifest.md)
- [`docs/astronomical-source-manifest.json`](docs/astronomical-source-manifest.json)
- NASA NSSDC Planetary Fact Sheet
- NASA/JPL Solar System Dynamics physical-parameter tables
- JPL Small-Body Database cross-checks for Pluto

The values are static, rounded parameters chosen for stable browser visualization. They are not live ephemeris state vectors, and provenance is tracked through each data record's `sourceIds`.

## Physical scale versus display scale

Physical astronomical values are preserved; display functions calculate separate render-space values for visualization.

### Heliocentric distance

The default Solar System view uses the following logarithmic mapping:

```text
bounded = clamp(distanceAU, 0, maxDistanceAU)
normalized = log1p(bounded) / log1p(maxDistanceAU)
rendered = minRenderDistance
         + normalized * (maxRenderDistance - minRenderDistance)
```

The default range is approximately `maxDistanceAU = 39.5`, `minRenderDistance = 16`, and `maxRenderDistance = 190`. Linear comparison mode and a Focus mode centered on the selected planetary system are also available.

### Moon distance

Moons use a separate logarithmic mapping in a local coordinate system centered on their parent body rather than the global Solar System coordinates. This preserves the ordering of actual moon distances while keeping moons visually separate from their parent.

### Body size

Actual body radii are preserved as `radiusKm`, while the display uses an independent visibility mapping.

- Enhanced Visibility: enlarges planets and moons using a square-root-based mapping
- Relative Size: emphasizes actual size ordering more strongly
- Uniform Markers: provides comparable marker sizes
- The Sun uses a separate render radius

Rendered orbital radii and rendered body radii therefore do not share one uniform physical scale. The UI states this distinction explicitly.

## Validation status

The current implementation is validated with:

- `npm run typecheck`
- `npm run build`
- `npm audit`
- Browser smoke coverage for desktop interaction, raycast selection, camera focus, simulation controls, scale selectors, moon selection, mobile resize, mobile panel hide/show, and resource disposal

Recent smoke result:

```text
88/88 assertions passed
console errors: 0
page errors: 0
request failures: 0
```

Generated validation artifacts are kept in [`evidence/`](evidence/). `node_modules/`, `dist/`, `.vite/`, environment files, and logs are excluded by `.gitignore`.

## Security and privacy

- The application does not require API keys, OAuth tokens, passwords, or private keys at runtime.
- `.env` and environment-specific `.env.*` files are excluded from Git. Commit only `.env.example` if an example environment file is needed.
- Local usernames and absolute workspace paths are omitted from public documentation and represented with `<repo-root>` or repository-relative paths.
- The repository has no external image, font, audio, or video assets; tracked PNG files are project-generated validation screenshots.
- No `LICENSE` or `NOTICE` file has been declared yet. Repository visibility alone does not grant reuse permission, so a project license should be chosen separately before reuse or redistribution.

## Git workflow

The default branch is `main`. After making a change:

```bash
git status --short --branch
git diff --check
npm run typecheck
npm run build
git add <intended-files>
git commit -m "<scoped message>"
```

Before staging, inspect `git diff --cached --name-only` to avoid accidentally committing generated files or dependency directories.
