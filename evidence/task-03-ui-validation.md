# Task 03 UI validation evidence

- Task: `t_c80c9b0a`
- Workspace: `<repo-root>`
- Validation timestamp (UTC): `2026-08-15T06:10:57Z`
- Validation source HEAD before this task commit: `5290eb15098817f7b9811ca46ff06551a44c784a`
- Branch: `main`

## Scope and bootstrap follow-up

The upstream UI implementation was exported but the browser document did not invoke it. Before the follow-up, `curl http://127.0.0.1:5173/` returned the static scaffold and the initial Vite build transformed only one module. The task-scoped public-entry fix adds this module script to `index.html`:

```html
<script type="module" src="/src/ui/index.ts" data-solar-system-ui></script>
```

No change was made to `src/main.ts`; the existing exported `solarSystemApp` is consumed by the UI entry. After the fix, the browser mounted one `.solar-ui` root, one scene canvas, `window.solarSystemApp`, and `window.solarSystemUI`.

## Canonical project checks

Commands were run from the repository root on the final source tree:

| Command | Exit code | Result |
|---|---:|---|
| `npm run typecheck` | 0 | TypeScript check passed with no diagnostics. |
| `npm run build` | 0 | Vite build passed; 26 modules transformed; emitted `dist/index.html`, CSS, and JS assets. Vite printed only the existing >500 kB chunk-size advisory. |
| `npm run dev -- --host 127.0.0.1` | running/ready | Vite reported `http://127.0.0.1:5173/`. The process was used for the browser smoke run. |
| `node /tmp/solar-system-ui-smoke.cjs` | 0 | 65 browser assertions passed; 0 failed. |

The temporary smoke harness used Playwright `1.55.1` with the locally installed Chromium headless shell, browser version `151.0.7922.34`. It was not added to the repository.

## Browser smoke observations

All 65 checks passed. The check matrix covered:

- Bootstrap: one mounted UI root and canvas; `window.solarSystemApp` and `window.solarSystemUI` available.
- Complete-view labels: 10 visible labels, including the Sun, all major planets, and Pluto.
- OrbitControls: left-drag changed camera position by `111.72039314476048` units.
- Reset: Complete view cleared selection.
- Raycast selection: projected pointer click selected Earth, then Jupiter.
- Smooth camera focus: after Earth selection, camera movement was observed in both samples (`3.5253210955645855` units from start to middle and `314.4510451786533` units from middle to settled sample), rather than jumping in one step.
- Earth detail panel: contained Korean/English name, object type, description, REAL ASTRONOMICAL DATA, actual radius, mean distance, orbital period, rotation period, eccentricity, inclination, CURRENT RENDERED VIEW, rendered orbital radius/radius, active distance scale, and active size scale.
- Focused labels: Earth and its focused local moon system labels remained visible.
- Simulation controls: Pause stopped elapsed-time changes; Play resumed them; the 1 day/second preset applied; Reset time returned elapsed simulation to `0` days.
- Scale controls: disclaimer explained logarithmic orbital-distance compression, enhanced body sizes, and the non-uniform physical/rendered scales. Linear Scale, Focus Scale, and Uniform Markers selector changes were reflected in live controller state and panel text.
- Documented moon behavior: Jupiter inspector listed Io, Europa, Ganymede, and Callisto. Selecting the Io moon-list item selected/focused Io, preserved the parent-system moon list, and showed sibling labels for all four Galilean moons.
- Responsive resize: at `390x844`, root and canvas were `390x844`, camera aspect was `0.46208530805687204` (390/844), control panel bounds were `10..380` horizontally, inspector bounds were `10..380`, the inspector retained 4 moon items, its content remained scrollable (`scrollHeight=498`, `clientHeight=268`), and document `scrollWidth` stayed `390`.
- Runtime health: console error messages `0`; page errors `0`; failed requests `0`.

## Git-based forbidden-path check

The task-scoped change set was checked with Git before commit. The intended tracked paths are `index.html` and `evidence/task-03-ui-validation.md`; no scene, simulation, data, dependency, or generated-output path is allowed in the commit. `dist/` and `node_modules/` were pre-existing untracked local validation outputs and were deliberately not staged.

Commands used for the final staged check:

```text
git diff --cached --name-only
git diff --cached --check
```

Acceptance: the first command must list exactly `index.html` and `evidence/task-03-ui-validation.md`; the second must return exit code `0`. The commit was created only after this path/syntax check. The full 40-character commit hash is included in the Kanban handoff.

## Remaining risks

- Vite reports the generated JavaScript chunk is larger than 500 kB after minification; this is a performance advisory, not a validation failure and is outside this task's allowed scope.
- Browser smoke used Chromium headless-shell with SwiftShader; no console, page, request, interaction, or responsive failures were observed.

## Task-root revalidation

- Revalidation timestamp (UTC): `2026-08-15T06:18:46Z`.
- Source HEAD before the revalidation-only change: `c24ce1155486d42d10d5579c9e1cd0507a2207e8`.
- The revalidation-only source change adds an inline favicon declaration to `index.html`; this prevents the browser's automatic `/favicon.ico` 404 from being reported as a console error. No scene, simulation, rendering, data, scale, type, package, configuration, README, or test path was modified.
- `npm run typecheck` — exit code `0`; TypeScript completed without diagnostics.
- `npm run build` — exit code `0`; Vite 7.3.6 transformed 26 modules and emitted the application bundle. The existing >500 kB chunk advisory remained non-fatal.
- `npm run dev -- --host 127.0.0.1` — Vite ready at `http://127.0.0.1:5173/`; an HTTP `HEAD /` probe returned `200`.
- `node /tmp/solar-system-ui-smoke-revalidated.cjs` — exit code `0`; browser version `151.0.7922.138`; all `65` assertions passed; failed assertions `0`; console errors `0`; page errors `0`; request failures `0`.
- The smoke matrix rechecked bootstrap, complete-view labels, OrbitControls drag, reset view, Earth/Jupiter raycast selection, smooth focus movement, real/rendered detail fields, play/pause/time scale/reset controls, distance and size selectors, scale disclaimer, documented Io selection with sibling labels, and desktop-to-`390x844` responsive bounds/overflow. The reset-time assertion sampled immediately after the click while playback remained enabled and observed `elapsedSimulationDays: 0`; subsequent frames are expected to advance the running simulation.
- Responsive observations: root and canvas `390x844`, camera aspect `0.46208530805687204`, control panel bounds `10..380`, inspector bounds `10..380`, selected-parent moon list count `4`, inspector `scrollHeight=498` versus `clientHeight=268`, and document `scrollWidth=390`.
- Final forbidden-path check must list only `index.html` and `evidence/task-03-ui-validation.md` in the staged diff; `git diff --cached --check` must exit `0`. Pre-existing untracked `dist/` and `node_modules/` are not staged.
