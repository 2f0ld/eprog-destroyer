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
`partialize`. M4 moves file storage to the server. *Update: done, see D24.*

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

### D10 — Live error highlighting = background javac + IntelliJ message table (2026-10-31)
IntelliJ highlights errors while typing. Instead of writing a Java type checker in JS, the IDE compiles the
whole project in the background ~350 ms after the last keystroke (`POST /api/compile`, compile only, ~0.2 s
for student projects). javac runs with `-XDrawDiagnostics` (in parallel with a normal run for the console
text), so we get stable keys like `compiler.err.cant.resolve.location` + arguments that
`src/java/diagnostics.ts` maps to IntelliJ's wording ("Cannot resolve symbol 'x'", "Incompatible types.
Found: 'int', required: 'java.lang.String'") and to the range IntelliJ underlines. Unknown keys fall back to
javac's text, capitalized. Limitation: javac reports flow errors (missing return, uninitialized variable)
only once attribution errors are fixed; IntelliJ shows them all at once. M3 must implement `/api/compile`
with the same `code`/`args` fields.

### D11 — Problems are decorations, not Monaco markers (2026-10-31)
IntelliJ uses three looks: red wave (ERRORS_ATTRIBUTES), red text without underline for unresolved
references (WRONG_REFERENCES_ATTRIBUTES) and grey text for unused code (NOT_USED_ELEMENT_ATTRIBUTES).
Monaco markers always draw squiggles, so `editor/problemDecorations.ts` draws problems as decorations with
hover text and overview-ruler marks, and F2/Shift+F2 and the Alt+Enter provider read problems from the store.

### D12 — Scope-aware symbol table for refactorings (2026-10-31)
`src/java/symbols.ts` resolves identifiers to declarations (block scopes, lambda/catch/for/pattern variables,
fields through `this.` and typed receivers, classes across files). Rename, unused inspections, Optimize
Imports, Generate and completion of locals share it. Like D4 it is heuristic; overloads are told apart by
argument count only, and members reached through inheritance or untyped expressions are not renamed.

### D13 — Smoke test falls back to Chrome (2026-10-31)
macOS machines often have no Firefox. `scripts/browser.mjs` uses Firefox when present, else Chrome. Chrome
is launched with a minimal flag set (`ignoreDefaultArgs`) because one of Puppeteer's default flags makes
Chrome 156 exit about two seconds after launch.

### D14 — Practice tasks follow JetBrains Academy (EduTools) (2026-10-31)
IntelliJ's own course plugin defines what "tasks inside IntelliJ" look like: a **Task** tool window on the
right with the description, a Check button, "Congratulations!" / "Incorrect" results, Peek Solution as a diff,
Reset Content, and a course view with lesson/task status icons. We copy that look and wording (EduCoreBundle)
and vendor its New UI icons (Apache-2.0). Each task opens as its **own project** (project widget = recent
projects), so the Project view stays a normal `src/` project like in the exam; the sample project is kept as
"eprog". Per-project workspaces (`workspaces` in the IDE store) remember each task's files and tabs.

### D15 — Tasks are folders; checking reuses the run protocol (2026-10-31)
Tasks are plain folders under `web/tasks/` (task.md, tests.json, src/, solution/) so tutors can write real Java
and review changes in git (M5's authoring goal). Checking needs no new backend endpoint: the frontend
generates a Java harness (`EprogCheck`) and runs it through `POST /api/run`, so M3's sandbox covers checking
too. All comparison logic stays in TypeScript (unit-tested) and produces beginner-oriented messages
("Line 2 differs: …", "Is there an infinite loop?"). Marker lines carry a per-check nonce so stray program
output cannot fake a pass by accident. Limitations: tests run in one JVM (static state survives between tests;
`System.exit` in student code ends the check), and a timed-out test thread keeps running until the check ends.

### D16 — Graded help instead of answers (2026-10-31)
Beginners struggle most with finding an approach. Each task therefore has a "Before you code" planning
section, Steps (sub-goals tied to tests, ticked off after each Check) and three graded hints (idea → skeleton →
last detail). Peek Solution unlocks only after all hints or 3 checks and shows a diff with a reminder to write
it yourself. Progress records attempts, hints used and peeks, and the success message acknowledges solving
without hints. Prerequisites (`requires`) are shown as "Builds on" links but do not lock tasks.

### D17 — Task texts in English and German (2026-10-31, German added 2026-11-01)
The IDE chrome stays English like IntelliJ's default UI (tab names, menus). Task texts, hints, check feedback and
the task UI exist in English and German (`task.de.md`), switchable at any time; German uses Swiss spelling.
Progress lives in localStorage (`eprog-tasks`) until M4 moves it to the server.

### D18 — Task catalog follows the real EProg schedule; course material stays out of the repo (2026-10-31)
The starter set first followed the textbook order. After reviewing the actual exercise sheets and three past
exams (as reference only), tasks are now placed at the sheet week where the course covers the topic, and the
catalog was extended to the exam level: prose algorithms, 2D/jagged arrays with validation, backtracking,
parsing, linked lists, object graphs (DFS/BFS), inheritance, a recursive-descent parser, Maps, written-exam
style tracing, and an "Exam practice" lesson with three staged tasks. All task texts and code are original;
the user decided that no ETH material is published in this public repository. The EBNF task sits in week 4
(not 2) because turning a grammar into code needs loops and String methods.

### D19 — Gamified progress: dig through the EProg mountain (2026-11-01)
Progress should feel like an achievement without cluttering the IntelliJ look. The course is a mountain of one
block per task (Task window › Mountain). Solving any task removes the next block from the top, so the mountain
shrinks steadily regardless of order. Tools (teaspoon → dynamite) and eight "finds" unlock at fixed fractions of
the course (`src/tasks/mountain.ts`), and the solve balloon announces them. Emoji keep it light and need no
assets. It lives in its own tab so the IntelliJ chrome stays untouched.

### D20 — Intro tour as IntelliJ "Got It" tooltips (2026-11-01)
IntelliJ introduces features with blue Got It tooltips (`GotItTooltip.*` theme keys), so the tour uses that
style: spotlight on one element, bubble with Next / Back / Skip tour, Escape skips. It runs once on the first
visit (not in automated browsers, so the smoke test is unaffected) and can be restarted from Help.

### D21 — "Did you use AI?" paste check (2026-11-01)
Pasting a code-like snippet (3+ lines or 80+ characters with `;{}()=`) that was not copied inside the IDE opens
a tongue-in-cheek dialog: yes → "fair enough"; no → "are you sure sure?"; sure → "we know you have". It is a
nudge, not a detector: it cannot see where text came from, it asks once per snippet, and nothing is recorded.
### D22 — Debugger: JDWP spoken from Node, protocol next to the run protocol (2026-11-01)
Debug runs start `java -agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=127.0.0.1:0` and the dev
runner talks JDWP over the socket itself (`web/dev/jdwp.ts`, ~25 commands; session logic in `dev/debugSession.ts`).
Scripting `jdb` was the alternative, but its output is free text interleaved with prompts and program output, and
it has no object ids for lazy expansion. JDWP gives structured values, so the Variables tree expands on demand
like IntelliJ's. Breakpoints are placed on `CLASS_PREPARE` of the user's compiled classes (no polling); stepping
uses `SINGLE_STEP` with class excludes `java.*, javax.*, jdk.*, sun.*, com.sun.*` (IntelliJ's default stepping
filters). Pause suspends the VM and shows the `main` thread (useful for endless loops). Values are rendered like
IntelliJ's renderers: `{int[3]@812} [1, 2, 3]`, `"text"`, `'a' 97`, boxed `{Integer@5} 7`, `ArrayList` as
`size = N` with elements as children, enums by constant name; `toString()` is not invoked (no method invocation
in the debuggee). The wire format (`POST /api/debug` NDJSON stream with `attached/paused/resumed/breakpoint`
events, `POST /api/run/:id/debug` commands `resume|pause|stepOver|stepInto|stepOut|stop|frame|children|breakpoints`)
is documented in `web/dev/devRunner.ts` and typed in `web/src/debugger/protocol.ts`; **M3 must implement it** —
the JDWP client can be reused inside the sandbox since it only needs a socket to the debuggee.
Editor look follows the New UI: breakpoints are drawn over line numbers (click / Ctrl+F8, hover preview),
inline values after executed lines of the current method (only variables mentioned on the line).
Breakpoints live in their own store (`eprog-debugger`, per project and file) to keep `ide/store.ts` changes small.

### D23 — Accounts: own small backend in `web/server/`, node:sqlite + argon2id from node:crypto (2026-11-01)
No framework and no native dependency: Node 24+ ships `crypto.argon2` and `node:sqlite`, so the accounts backend
needs no `npm install` of native modules (bcrypt/argon2 packages need build tools). Passwords: argon2id with the
OWASP minimum (m=19 MiB, t=2, p=1) as PHC strings; length rule (≥10) instead of composition rules (NIST 800-63B),
and no user name in the password. Only SHA-256 hashes of session/verification/reset tokens are stored.
Verification links are single-use and valid 24 h, reset links 1 h; verifying does *not* log in (mail scanners
open links), reset ends all sessions. Sign-up, resend and forgot always answer 200 so addresses cannot be
enumerated; signing up again for a verified address sends a notice mail instead. Address check on the server:
`/^[^@\s]+@([a-z0-9-]+\.)*ethz\.ch$/i` (shared with the auth pages in `src/auth/email.ts`; look-alikes are
unit-tested). Sessions: random 32-byte token in the HTTP-only `eprog_session` cookie, `SameSite=Lax`, `Secure`
when `PUBLIC_URL` is https, 30 days. CSRF: state-changing requests with a foreign `Origin` are refused. Rate
limits (in memory, one process): sign-ups per IP, mails per address, failed logins per address+IP.
Unverified accounts are purged after a week; deleting an account cascades to sessions, tokens and saved state.
In `npm run dev` the same handler is a Vite plugin (`server/devPlugin.ts`, registered *before* the dev runner so
`/api/run`, `/api/compile` and `/api/debug` are behind the login wall); mails go to the terminal and the outbox
page `/dev/mail`. `npm start` (`server/main.ts`) serves `dist/` + the API for production; it has no SMTP yet
(links are logged — M6) and no runner (503 until M3).

### D24 — Auth pages are a second Vite page; IDE state lives on the server (2026-11-01)
`auth.html` (`src/auth/`) is a separate small bundle with a plain, neutral look (no IDE styling, no ETH logos), so
the login pages load fast and the IDE bundle is only served to logged-in users (`/` redirects to `/login`
otherwise). The persisted zustand stores (`eprog-ide` workspaces + layout, `eprog-tasks` progress,
`eprog-debugger` breakpoints) use `syncedStorage` (`src/account/serverStorage.ts`): `main.tsx` loads
`GET /api/state` before rendering, writes are debounced `PUT /api/state/:key` (JSON, 20 MB per user). On the first
login, data the browser still has in localStorage is uploaded if the account has none for that key, then removed
locally (shared lab computers). The server copy wins if both exist. Several tabs: last write wins. Without the
accounts API (static `vite preview`) the stores fall back to localStorage. New persisted stores should pass
`storage: syncedStorage` and be added to `SYNCED` in `src/account/bootstrap.ts`.
