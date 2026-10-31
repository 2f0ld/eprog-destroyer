# web — the IntelliJ-style IDE frontend

See the repository root `README.md` and `docs/` for the big picture.

```bash
npm install
npm run dev      # http://localhost:5173 (includes the DEV-ONLY local Java runner)
npm test         # unit tests (Java analysis, diagnostics, refactorings, task model)
npm run smoke    # drives system Firefox (or Chrome) through the main flows, screenshots in .e2e-shots/
npm run verify-tasks  # every task solution passes its tests, every starter fails (needs javac/java)
npm run build    # type-check + production bundle
```
