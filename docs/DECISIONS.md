# Decision log

Short records of non-obvious choices. Newest at the bottom. Add an entry when you make a choice someone
might otherwise "fix".

### D1 — Vite + React + TypeScript SPA for the IDE (2026-10-31)
The IDE is a heavy client-side app; SSR brings nothing and complicates Monaco. A separate backend will be
added for auth, tasks and execution (M3/M4). Vite also hosts the dev-only runner middleware.

### D2 — Monaco as the editor engine (2026-10-31)
Monaco gives us a mature editor core (multi-cursor, folding, find/replace, sticky scroll, semantic tokens,
snippets) that we re-skin and re-key to IntelliJ. CodeMirror 6 would be lighter but needs much more work
to reach the same IntelliJ behaviors. We import `monaco-editor/editor/editor.api` + selected features, not
the full `editor.main` with all languages. Note: `features/register.all` registers only *range* semantic
tokens; `editor/contrib/semanticTokens/browser/documentSemanticTokens` must be imported explicitly.

### D3 — Target look: IntelliJ New UI, "Islands" theme (2026-10-31)
Islands has been the default since IntelliJ 2025.3, so a current exam installation will look like this.
Colors are not eyeballed: they are resolved from JetBrains' theme JSON / color scheme XML (RESEARCH.md).
Islands Light is provided as well. If the exam machines turn out to use an older UI, add a theme in
`src/theme/` — all colors go through CSS variables and the Monaco theme.

### D4 — Our own lightweight Java analyzer instead of a Java language server (2026-10-31)
IntelliJ-style highlighting needs semantic info (method declaration vs. call, field vs. local, static).
A real LSP (JDT LS) per student is expensive. `src/java/analyzer.ts` is a fault-tolerant heuristic analyzer
that covers student-sized code. Compiler-accurate errors come from javac via the runner. Revisit if we need
type-aware completion or refactorings (option: a server-side JDT LS pool, or a WASM Java parser).

### D5 — Run protocol designed for the future sandbox (2026-10-31)
`POST /api/run` streams NDJSON events (`compiling`, `compile-error`, `started`, `stdout`, `stderr`, `exit`);
stdin and kill are separate POSTs. The dev middleware (`web/dev/devRunner.ts`) runs `javac`/`java` locally
**without sandboxing** and is only registered by `vite serve`. M3 must provide the same protocol.

### D6 — State in zustand, persisted to localStorage for now (2026-10-31)
One store (`src/ide/store.ts`) holds files, tabs, layout, run state. Persisted parts are selected in
`partialize`. M4 moves file storage to the server.

### D7 — Browser-reserved shortcuts (2026-10-31)
Pages cannot intercept Ctrl+N, Ctrl+T, Ctrl+W, Ctrl+Shift+N, Ctrl+Tab, Ctrl+F4 in Chrome (Firefox is similar).
These IntelliJ shortcuts work only when the site runs as an installed PWA / in kiosk mode. The actions are
still reachable via menus, Search Everywhere and alternative shortcuts. Consider a PWA manifest in M2.

### D8 — Official icons, no logos (2026-10-31)
Icons come unmodified from `intellij-community` (Apache-2.0), with attribution in
`src/assets/icons/NOTICE.md`. We avoid JetBrains trademarks (logos, product names) in the UI. The Git branch
icon lives in a plugin we did not vendor, so `src/ui/BranchIcon.tsx` draws one in the same style.

### D9 — Testing (2026-10-31)
Unit tests use Node's built-in test runner with native TypeScript type stripping (`npm test`), so pure
modules under `src/java/` must avoid TS-only runtime syntax (enums, parameter properties) and import with
explicit `.ts` paths if they import each other. The browser smoke test uses `puppeteer-core` with the
system Firefox (no browser download) and keeps its profile inside `web/.e2e-profile`. It launches
`/usr/lib64/firefox/firefox` directly with `HOME` pointed at that profile, because Fedora's `/usr/bin/firefox`
wrapper writes to `~/.config/mozilla`. `web/.npmrc` keeps the npm cache in `web/.npm-cache` for the same reason.
