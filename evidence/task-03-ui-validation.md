# Task 03 UI/integration validation

Date of validation: 2026-08-15T05:32:56Z (UTC)
Workspace: `/Users/miniadmin/Desktop/threejs-solar-system`

## Scope

Owned implementation paths are `src/ui/**`, `src/styles/**`, and this evidence file. The UI hardening keeps the existing `SolarSystemUI`/controller-adapter boundary and does not modify tests, package or lock files, configuration, data, scales, types, scene/core, simulation, rendering, `src/main.ts`, or README paths. Local `node_modules/` and `dist/` directories produced by validation are not task artifacts and are not staged.

## Commands and exit codes

| Command / probe | Exit/result |
| --- | ---: |
| `npm install` | 0; dependencies already up to date, 18 packages audited, 0 vulnerabilities reported; npm printed the existing install-script approval warning for `esbuild`/`fsevents` |
| `npm run typecheck` | 0; TypeScript completed with no diagnostics |
| `npm run build` | 0; TypeScript check and Vite 7.3.6 production build completed |
| `npx esbuild src/ui/index.ts --bundle --platform=browser --format=esm --outfile=/tmp/solar-ui-bundle.js` | 0; browser UI bundle and imported stylesheet produced successfully (`/tmp/solar-ui-bundle.js`, plus the emitted CSS file) |
| `npm run dev -- --host 127.0.0.1` | Started successfully; Vite reported ready in 62 ms at `http://127.0.0.1:5173/` |
| `node /tmp/solar-system-smoke.mjs` | 0; Playwright 1.62.1 with installed Chromium exercised the UI in a fresh browser session; all assertions passed |
| `git diff --check` | 0 |

The browser smoke run used headless Chromium with SwiftShader-compatible launch flags and recorded zero console errors, page errors, or failed requests. The temporary smoke script is outside the repository and was not staged.

## Re-verification run

Re-verified from `HEAD 7a48262bb58577f72e9e03aa7bc178c21cac1d1c` at `2026-08-15T05:37:21Z` (UTC). The tracked worktree was clean before and after validation; local `dist/` and `node_modules/` remain untracked validation outputs.

| Command / probe | Exit/result |
| --- | ---: |
| `npm run typecheck` | 0; TypeScript completed with no diagnostics |
| `npm run build` | 0; TypeScript check and Vite 7.3.6 production build completed (`dist/index.html`, 0.77 kB) |
| `npm run dev -- --host 127.0.0.1` | Started successfully; Vite reported ready in 61 ms at `http://127.0.0.1:5173/`; HTTP `HEAD /` returned 200; server stopped after smoke validation |
| `node /tmp/solar-system-smoke.mjs` | 0; all 15 browser assertions passed with zero console errors, page errors, or request failures |
| `git diff --check HEAD` | 0 |
| `git diff-tree --check -r HEAD` | 0 |
| forbidden-path check against `HEAD` | 0; all committed paths are task-owned |
| `git status --short --untracked-files=no` | 0; no tracked modifications |

Fresh smoke observations: the default state mounted a canvas with `log`/`enhanced-visibility` scales and 10 visible primary labels; play/pause, distance and size selectors, Earth raycast selection, hover tooltip, Moon keyboard focus, OrbitControls drag/zoom, moon/label visibility, complete-view reset, and the 390×844 responsive layout all passed. The current smoke screenshots were written to `/tmp/solar-ui-default.png`, `/tmp/solar-ui-mobile.png`, and `/tmp/solar-ui-desktop.png` outside the repository.

## Browser smoke assertions

The fresh browser session verified:

- Canvas and UI mount successfully; the default state has no selected body, `log` distance scale, `enhanced-visibility` body-size scale, visible orbit/moon/star-field layers, and 10 visible primary labels out of 35 label nodes.
- Play/pause controls change `isPlaying` to `false`/`true` as expected, and the time-scale selector remains functional.
- Distance and body-size selectors change to `linear` and `uniform-markers` respectively.
- Hovering the projected Earth produces a visible `Planet · 행성` tooltip; clicking it selects Earth and fills the inspector with both real astronomical fields (including actual radius) and rendered-view fields (including rendered body radius).
- The Moon entry in the inspector is keyboard-accessible (`role="button"`, `Enter` activation) and selects the Moon. OrbitControls drag changed the camera position from `(-10.8455, 6.3351, 18.5230)` to `(-16.9376, 1.2891, 19.1984)` in the same run.
- Turning Moons off sets `moonVisibility=false` and hides the Moon label; turning Labels off hides the label layer. Complete view resets selection to `null`.
- At `390x844`, the control panel is `[x=10, y=566, w=370, h=268]`, the inspector is `[x=10, y=260, w=370, h=270.08]`, and the scale disclaimer is `[x=10, y=151.91, w=370, h=86.23]`. The panels are separated, the full disclaimer fits without internal clipping, and there is no horizontal overflow.

Fresh screenshots `/tmp/solar-ui-default.png` and `/tmp/solar-ui-mobile.png` were visually inspected. The default composition keeps the Sun through Pluto visible with readable labels and separated desktop panels; the selected-body mobile layout keeps the header, full scale disclaimer, inspector, and bottom control surface readable without overlap.

## UI hardening observations

- Moon list rows now use text nodes instead of interpolated `innerHTML`, expose an accessible button role/name, and support click, Enter, and Space activation.
- Raycast selection ignores moons while Moon visibility is disabled, preventing hidden moon meshes from remaining clickable.
- Label updates honor Moon visibility and apply a compact secondary-label treatment on narrow viewports or distant cameras while preserving the selected body's label.
- `SolarSystemUI.dispose()` removes the stage container in addition to the overlay and controller/application resources.
- Mobile CSS separates the inspector and scale disclaimer, keeps the disclaimer text fully visible, prevents horizontal overflow, and corrects the moon-section selector so the intended compact mobile inspector behavior applies.

## Forbidden-path check

The task-scoped change is limited to:

- `src/ui/InfoPanel.ts`
- `src/ui/SolarSystemUI.ts`
- `src/ui/labels.ts`
- `src/styles/solar-system.css`
- `evidence/task-03-ui-validation.md`

No files under tests, package/lock/config, data, scales, types, scene/core, simulation, rendering, `src/main.ts`, or README are part of this task change. `node_modules/` and `dist/` remain local validation outputs and are not staged.
