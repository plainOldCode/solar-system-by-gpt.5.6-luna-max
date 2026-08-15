# Task 03 UI validation evidence

- Task: `t_c80c9b0a`
- Workspace: `/Users/miniadmin/Desktop/threejs-solar-system`
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
