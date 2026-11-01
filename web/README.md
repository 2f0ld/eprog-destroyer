# web — the IntelliJ-style IDE frontend

See the repository root `README.md` and `docs/` for the big picture.

```bash
npm install
npm run dev      # http://localhost:5173 (accounts backend + the DEV-ONLY local Java runner and debugger)
                 # sign up with any …@ethz.ch address; the confirmation link is in the terminal and at /dev/mail
npm test         # unit tests (Java analysis, diagnostics, refactorings, task model, JDWP debugger, accounts)
npm run smoke    # drives system Firefox (or Chrome) through the main flows, screenshots in .e2e-shots/
npm run verify-tasks  # every task solution passes its tests, every starter fails (needs javac/java)
npm run build    # type-check + production bundle (dist/index.html = IDE, dist/auth.html = auth pages)
npm start        # production server for dist/ + accounts API (needs PUBLIC_URL; no Java runner until M3)
```

Layout: `src/` frontend (IDE, `src/auth/` auth pages, `src/debugger/`, `src/account/`), `dev/` DEV-ONLY runner
and JDWP debugger (Vite middleware), `server/` accounts backend (Vite plugin in dev, `server/main.ts` in production).
Account data lives in `web/.data/` (gitignored).
