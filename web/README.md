# web — the IntelliJ-style IDE frontend

See the repository root `README.md` and `docs/` for the big picture.

```bash
npm install
npm run dev      # http://localhost:5173 (includes the DEV-ONLY local Java runner)
npm test         # analyzer / formatter unit tests
npm run smoke    # drives system Firefox through the main flows, screenshots in .e2e-shots/
npm run build    # type-check + production bundle
```
