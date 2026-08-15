# Solar System demo — final acceptance evidence

## Scope and provenance

- Workspace: `<repo-root>`
- Branch: `main`
- Application source validated at pre-integration HEAD: `be82344da0b133b666da9ed049c1027b09f82b20`
- Authoritative requirements: `docs/threejs_solar_system_demo_prompt_en.md`
- Validation environment: macOS, Node `v26.7.0`, npm `11.19.0`, Vite `7.3.6`, installed Google Chrome `151.0.7922.138`
- No application source files were changed for this acceptance pass. The task-owned changes are validation scripts and evidence artifacts.

The acceptance run preserves the raw machine-readable reports beside this document. The prior-commit audit checks full 40-character hashes and allowed-path scope for the required task history; the scope audit checks the complete working tree, including untracked files and staged paths.

## Required command results

| Command | Result | Evidence |
|---|---:|---|
| `npm install` | exit `0`; dependencies installed; npm reported `18` packages seeking funding and `0` vulnerabilities | terminal run in the final validation window |
| `npm run typecheck` | exit `0`; no TypeScript errors | terminal run in the final validation window |
| `npm run build` | exit `0`; Vite production build completed | terminal run in the final validation window |
| `npm run dev -- --host 127.0.0.1` | Vite ready on `http://127.0.0.1:5173/`; the server was intentionally terminated after validation | process log and HTTP probe |
| `curl --fail --silent --show-error --http1.1 ... http://127.0.0.1:5173/` | exit `0`; HTTP `200`; `1156` bytes served | terminal HTTP probe |
| `node scripts/source-acceptance-check.mjs` | exit `0`; `31/31` source checks passed | `evidence/source-acceptance.json` |
| `node scripts/verify-prior-commits.mjs` | exit `0`; `8/8` required commit records passed | `evidence/prior-commit-audit.json` |
| `node scripts/verify-task-scope.mjs` | exit `0`; no forbidden paths | `evidence/task-scope.json` (re-run after this document was created) |
| `node scripts/final-acceptance-smoke.cjs` | exit `0`; `83/83` browser checks passed, `0` failed | `evidence/final-acceptance-smoke.json` |
| `git diff --check` | exit `0`; no whitespace errors | terminal scope review |

The npm build emitted the standard Vite chunk-size advisory for the main Three.js bundle. It is non-fatal and did not affect the successful build or browser run.

## Prior commit and scope audit

`evidence/prior-commit-audit.json` records the full hashes and path checks for the required history:

- Task 01 scaffold/data: `df2d1c79408a290f173f520abf6d92b058f07349`
- Task 02 scene/core: `fc30167cbd03a92b1fc6ad7973293b16c5ae1cdc`
- Task 03 UI integration: `27306450721479e171350d00ab423be14e34484f`
- Task 03 UI hardening: `7a48262bb58577f72e9e03aa7bc178c21cac1d1c`
- Task 03 UI validation evidence: `91e919908cf19e319108304ad36dcb75c053f95d`
- Live UI state: `5290eb15098817f7b9811ca46ff06551a44c784a`
- Browser entry/evidence: `c24ce1155486d42d10d5579c9e1cd0507a2207e8`
- Final browser-noise fix: `be82344da0b133b666da9ed049c1027b09f82b20`

The verifier passed all `8/8` records. Each checked commit is limited to its expected task paths and the evidence files report no forbidden-path violations. The exact commit metadata and changed paths are preserved in `evidence/prior-commit-audit.json`.

The final task scope is intentionally limited to:

- `scripts/source-acceptance-check.mjs`
- `scripts/verify-prior-commits.mjs`
- `scripts/verify-task-scope.mjs`
- `scripts/final-acceptance-smoke.cjs`
- `evidence/source-acceptance.json`
- `evidence/prior-commit-audit.json`
- `evidence/task-scope.json`
- `evidence/final-acceptance-smoke.json`
- `evidence/final-acceptance-desktop.png`
- `evidence/final-acceptance-mobile.png`
- `evidence/final-acceptance.md`

`dist/` and `node_modules/` are generated validation artifacts and are explicitly excluded from the task scope; they will not be committed. No changes are present under application implementation directories, package/configuration files, or documentation outside the evidence artifact above.

## Source acceptance coverage

`evidence/source-acceptance.json` passed `31/31` deterministic checks against the prompt and implementation, including:

- Vite/Three.js scaffold and browser entrypoint
- complete Sun-to-Pluto body data and required major moons
- real astronomical values and explicit display-scale disclaimer
- separate logarithmic/linear/focus distance modes and enhanced/uniform size modes
- elliptical/inclined orbit data and Kepler-style simulation inputs
- procedural rendering, star field, orbit lines, Saturn rings, and moon rendering
- selection, tooltip, inspector, controls, responsive styles, and cleanup/disposal paths

## Browser/runtime acceptance coverage

The final run was generated at `2026-08-15T06:40:00.209Z` against `http://127.0.0.1:5173/`, using the installed Chrome executable. It passed `83/83` checks with empty console-error, page-error, and request-failure streams.

The browser checks exercised:

- one mounted UI root and one scene canvas at `1280x800`
- all 10 major labels from Sun through Pluto, plus the complete `35`-label body set
- required Play/Pause, reset, complete-view, speed, distance, body-size, orbit, label, moon, moon-orbit, and star-field controls
- OrbitControls left-drag camera movement
- complete-view reset behavior
- Earth projection, hover tooltip, Raycaster selection, and Korean/English identity/type text
- smooth camera-focus motion across multiple samples
- Earth inspector fields including `REAL ASTRONOMICAL DATA`, radius, distance, orbit period, rotation period, eccentricity, inclination, rendered radius, and scale modes
- visibility toggles and simulation pause/play/reset behavior
- distance modes `linear`, `log`, and `focus`; size modes `enhanced-visibility` and `uniform-markers`
- Jupiter selection and all four Galilean moons, including Io selection and inspector data
- Pluto selection and inspector data, including its five listed major moons
- responsive resize at `390x844`: root/canvas width `390`, panels inset from both edges, page scroll width `390`, inspector `scrollHeight=539` versus `clientHeight=268`, and five Pluto moon list items
- runtime disposal: `hasSolarUI=false`, `canvasCount=0`, `mountedRootCount=0`

The first exploratory smoke attempt caught a stale screen-coordinate race while the simulation was advancing between projection and click. The browser harness was corrected to pause simulation during projected-body raycast checks; the final run above passed with no application-source change.

## Rendered visual artifacts

Fresh screenshots were captured by the final browser run and visually inspected:

- `evidence/final-acceptance-desktop.png` — `1280x800`; canvas, labels, controls, inspector, and scale disclaimer are visible and legible with no concrete clipping or overlap defect observed.
- `evidence/final-acceptance-mobile.png` — `390x844`; responsive panels remain inside the viewport, controls are reachable, and the inspector's longer content is backed by the measured scrollable region. No concrete rendering defect was observed. Labels behind the selected-body panels are expected canvas content and do not create page overflow.

## Final assessment

The implementation satisfies the authoritative Solar System demo acceptance requirements under the available local runtime. The application source is validated, the historical task chain is independently verified, the live browser run is clean, rendered desktop/mobile artifacts are preserved, and this task-scoped acceptance bundle is committed and ready for Kanban handoff.
