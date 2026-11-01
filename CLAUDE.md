# CLAUDE.md

Web practice environment for ETH's EProg course: a browser IDE that must look and behave exactly like
IntelliJ IDEA (New UI, Islands theme), later behind an ethz.ch-only login with task catalog.

- **Resume work from `docs/MILESTONES.md`** ("Next up"). Update it (status + next steps) before stopping.
- Record non-obvious choices in `docs/DECISIONS.md`; sources for colors/icons/metrics in `docs/RESEARCH.md`.
- Only change files inside this repository. Do not install anything globally or write outside the repo
  (the smoke test keeps its Firefox profile in `web/.e2e-profile`).
- Frontend lives in `web/`, the accounts backend in `web/server/` (D20). Commands: `npm run dev`, `npm test`, `npm run smoke` (needs the dev server), `npm run verify-tasks`, `npm run build`, `npm start`.
- The IDE is behind a login: in dev, sign up with any `…@ethz.ch` address and confirm via `/dev/mail`.
- Practice tasks live in `web/tasks/<id>/` (format: `docs/TASKS.md`); run `npm run verify-tasks` after changing one.
- Fidelity rule: take IntelliJ colors/metrics/icons from JetBrains' sources (see RESEARCH.md), don't eyeball them.
- `web/dev/devRunner.ts` (and the JDWP debugger in `web/dev/`) executes code unsandboxed — dev only, never deploy it.
- Pure modules in `web/src/java/` are unit-tested with Node type stripping: no enums / parameter properties.
