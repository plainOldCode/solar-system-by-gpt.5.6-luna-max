# Task 01 scaffold validation evidence

- Workspace: `<repo-root>`
- Validation timestamp (UTC): `2026-08-15T03:43:17Z`
- Source specification read first: `docs/threejs_solar_system_demo_prompt_en.md`

## Required commands

| Command | Exit code | Result |
| --- | ---: | --- |
| `npm install` | `0` | Installed 16 packages, audited 17 packages, and reported 0 vulnerabilities. npm emitted an install-script approval warning for esbuild; installation completed successfully. |
| `npm run typecheck` | `0` | `tsc --noEmit` completed without TypeScript errors. |
| `npm run build` | `0` | `tsc --noEmit && vite build` completed; Vite produced `dist/index.html`. |

## Dataset integrity check

A repository-local Python assertion checked the bundled TypeScript data and manifest:

```text
coverage-ok bodies=35 required=35 sources=4
```

The check confirmed the Sun, nine heliocentric planets/dwarf planet records, all 25 required moon records, and that every `sourceIds` value resolves to the four manifest source IDs.

## Forbidden-path check

The task-owned change set is limited to the scaffold/configuration files, `src/data/**`, `src/scales/**`, `src/types/**`, README/source-manifest files, and this evidence file. No `src/scene/**`, `src/ui/**`, `src/main.ts`, `src/styles/**`, `tests/**`, or CI/integration artifact was created or modified.

The final committed change-set check is run as:

```bash
git diff --name-only HEAD~1..HEAD
```

Its output is recorded in the task handoff after the task-scoped commit is created.
