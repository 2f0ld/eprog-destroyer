# Milestones

Living roadmap. Update the status and the "Next up" section whenever you stop working.
Legend: ✅ done · 🟡 partial · ⬜ not started

---

## Next up (resume here)

1. **M3** (production-grade sandboxed Java execution) — now the most important gap: Run, Debug, live error
   highlighting (`/api/compile`) and task checking all go through the DEV-ONLY runner. M3 must implement
   `/api/run`, `/api/compile` (incl. `code`/`args` in diagnostics, DECISIONS D10/D15) and the debug protocol
   (`/api/debug`, `/api/run/:id/debug`, D19), behind the login wall (`createAccounts().handle`, D20).
2. **M4/M6 follow-ups**: a real mail provider (SMTP) for `server/main.ts`, deployment (D20), serving reference
   solutions/hidden tests from the server now that users are known.
3. **M5 follow-ups**: theory practice (EBNF quizzes, loop invariants, weakest preconditions), interfaces/generics,
   more exam-practice sets, German texts (D17), an IntelliJ-style test runner view for check details.
4. **M2 leftovers**: Ctrl+Q docs, Navigate Back/Forward, Ctrl+click underline, more quick fixes, smart completion,
   bundle size (lazy-load Monaco); debugger extras (Evaluate Expression / watches, Run to Cursor, `toString()`
   rendering, exception breakpoints, Breakpoints dialog).

Before continuing, run `cd web && npm install && npm test && npm run dev`, then `npm run smoke` and
`npm run verify-tasks` (with the dev server running for smoke) to make sure everything still works.
The IDE is behind a login now: in `npm run dev` sign up with any `…@ethz.ch` address and open the link from
http://localhost:5173/dev/mail (or the terminal). The smoke test does this itself.

---

## M0 — Research & setup ✅ (2026-10-31)

- ✅ Pick stack (see DECISIONS.md D1–D4)
- ✅ Extract IntelliJ Islands Dark/Light colors, metrics and editor schemes from JetBrains' open-source repo (RESEARCH.md)
- ✅ Vendor official New UI icons (Apache-2.0) with NOTICE

## M1 — IntelliJ-style web editor ✅ (2026-10-31)

Goal: a browser IDE that a student cannot easily tell apart from IntelliJ IDEA (New UI, Islands theme).

- ✅ Window chrome: main toolbar (hamburger main menu, project widget with gradient, branch widget,
  run configuration widget, Run/Debug/Stop, Search, Settings), left/right tool window stripes, status bar
- ✅ Islands layout with rounded tool window islands and draggable splitters; layout persisted
- ✅ Themes: Islands Dark (default) and Islands Light, switchable (View › Appearance, Settings)
- ✅ Project tool window: tree with IntelliJ ordering, `.java` files shown as classes (runnable mark for
  main classes), source root icon, External Libraries / Scratches nodes, keyboard navigation,
  context menu (New Java Class/File/Directory, Rename, Delete, Copy Path, Run)
- ✅ Editor (Monaco): JetBrains Mono 13px, IntelliJ color scheme, semantic highlighting (method
  declarations, fields, static members in italics, constants, type parameters), caret row, line numbers,
  right margin at 120, indent guides, sticky lines, folding on hover, gutter run icons (▶ on main class/method)
  with run popup, inspection widget, identifier-under-caret highlighting
- ✅ Editor tabs: IntelliJ pill style, middle-click close, context menu, MRU activation on close
- ✅ Completion: live templates (`psvm`/`main`, `sout`, `souf`, `soutv`, `soutm`, `serr`, `fori`, `forr`, `itar`,
  `iter`, `ifn`, `inn`, `psf`, `psfi`, `psfs`, `prsf`, `St`, `thr`, `lst`), postfix templates (`.sout`, `.var`,
  `.for`, `.fori`, `.if`, `.not`, `.null`, `.nn`, `.return`, ...), member completion for common JDK classes and
  project classes, class completion with automatic import insertion
- ✅ IntelliJ keymap (editor): Ctrl+D, Ctrl+Y, Ctrl+/, Ctrl+Shift+/, Ctrl+Alt+L, Alt+Shift+↑/↓, Ctrl+W/Ctrl+Shift+W,
  Ctrl+Shift+J, Alt+J, Ctrl+Alt+Shift+J, Ctrl+G, Ctrl+B, Ctrl+P, Ctrl+Q, Alt+Enter, F2/Shift+F2, Ctrl+Shift+Enter,
  Shift+Enter, Ctrl+Alt+Enter, Ctrl+−/+ folding
- ✅ IntelliJ keymap (global): Shift+F10, Ctrl+Shift+F10, Ctrl+F2, Ctrl+F5, Alt+1/0/4/6/7, Alt+F12, Shift+Esc,
  Ctrl+Shift+F12, Ctrl+E, Double Shift, Ctrl+Shift+A, Ctrl+N, Alt+F1, Ctrl+Alt+S, Alt+←/→
- ✅ Reformat Code (Ctrl+Alt+L): indentation (incl. switch/case), IntelliJ spacing rules
- ✅ Run tool window: IntelliJ-style console (command line, output, red stderr, green stdin, "Process finished
  with exit code N"), interactive stdin, clickable stack trace links, rerun/stop/soft-wrap/scroll/clear
- ✅ Compile errors: parsed from javac, shown in console, as editor squiggles, inspection widget, Problems tool window
- ✅ Popups: Search Everywhere (All/Classes/Files/Symbols/Actions, CamelHumps), Recent Files (Ctrl+E),
  New Java Class (Class/Interface/Record/Enum/Annotation/Exception), Rename, Settings, About
- ✅ Structure tool window, Problems, Notifications; Terminal and Commit are informative stubs
- ✅ Files persisted in localStorage (until accounts exist in M4) — now per user on the server (M4)
- ✅ DEV-ONLY local Java runner (Vite middleware) implementing the run protocol M3 will reuse
- ✅ Tests: unit tests for analyzer/formatter (`npm test`), browser smoke test (`npm run smoke`)

## M2 — Editor fidelity & polish 🟡 (started 2026-10-31)

- ✅ On-the-fly diagnostics while typing: debounced background compile (`POST /api/compile`), javac keys
  translated to IntelliJ's wording/ranges (`src/java/diagnostics.ts`); red wave for errors, red text for
  unresolved symbols, grey for unused imports/variables/private members, error-stripe marks, F2/Shift+F2
- ✅ IntelliJ completion popup look: node icons, bold matched prefix in `CompletionPopup.matchForeground`, bold
  keywords, type on the right, advertiser footer with working Ctrl+., Enter inserts / Tab replaces,
  scope-aware locals with their types
- ⬜ Completion: second Ctrl+Space, smart type completion (Ctrl+Shift+Space)
- ✅ Real Rename refactoring (Shift+F6), in-place with boxed occurrences, for locals/params/fields/methods/classes
  across files (+ file rename); Project view file rename renames the class and its references
- ✅ Optimize Imports (Ctrl+Alt+O) with IntelliJ's import layout and wildcard thresholds
- ✅ Generate (Alt+Insert): constructor, getters/setters, toString(), equals()/hashCode() with field chooser
- ✅ Quick-fixes on Alt+Enter: Import class, Add exception to method signature, Optimize imports,
  Remove local variable, Insert ';' — ⬜ more (create local variable, add cast, surround with try/catch)
- ⬜ Quick documentation (Ctrl+Q) with Javadoc for JDK members
- ✅ Parameter info popup (Ctrl+P) backed by the JDK table / project methods and constructors
- ⬜ Breadcrumb/caret-aware Structure view selection; Navigate › Back/Forward (Ctrl+Alt+←/→)
- 🟡 Editor: ✅ error stripe, ✅ "unused" greying; ⬜ Ctrl+click underline, Ctrl+mouse wheel font size
- 🟡 Settings: ✅ editor font size, soft wraps, show whitespaces; ⬜ font family, line spacing
- ⬜ Drag & drop in project tree; multiple selection
- ✅ Debugger (2026-11-01, D19): breakpoints over line numbers (click, hover preview, Ctrl+F8, persisted per
  project/file, verified/invalid icons, Mute), Debug (Shift+F9) via JDWP in the dev runner, Debug tool window with
  Threads & Variables (frames, lazily expandable Variables tree with IntelliJ renderers and changed-value colour)
  and Console tabs, execution point / caller frame line highlight, inline values, Resume F9, Pause, Step Over F8,
  Step Into F7 (skips JDK classes), Step Out Shift+F8, Stop Ctrl+F2; unit + JDWP integration tests, smoke test
  - ⬜ Evaluate Expression / watches, Run to Cursor, Force Step Into, `toString()` rendering, exception and
    conditional breakpoints, Breakpoints dialog (now a list menu), Set Value, threads other than `main`
- ⬜ Bundle size: pick only needed Monaco features (currently 4.5 MB JS), lazy-load Monaco
- ⬜ Accessibility pass, Firefox/Chrome/Safari check, small-screen behavior

## M3 — Sandboxed Java execution service ⬜

- ⬜ Backend service (Node or JVM) implementing the same protocol as `web/dev/devRunner.ts`
  (`POST /api/run` NDJSON stream, `/stdin`, `/kill`, `/api/compile`, debug protocol D19) — the frontend should not
  need changes; `web/dev/jdwp.ts` + `debugSession.ts` can be reused inside the sandbox
- ⬜ Isolation: per-run container (e.g. gVisor/nsjail/firecracker), no network, CPU/memory/time/output/pid limits,
  read-only rootfs, ephemeral workdir
- ⬜ Warm JVM pool / class data sharing to keep run latency < 1 s
- ⬜ JUnit test execution for tasks (results in an IntelliJ-style test runner tool window)
- ⬜ Rate limiting per user; abuse monitoring
- ⬜ Replace the dev runner in production builds; keep it for local dev

## M4 — Accounts: ethz.ch-only sign-up & email verification 🟡 (2026-11-01, D20/D21)

- ✅ Sign up / log in / forgot / reset / account pages (`auth.html`, plain and neutral, no ETH branding)
- ✅ Email must be `@ethz.ch` or a subdomain (e.g. `@student.ethz.ch`): validated on the server with
  `/^[^@\s]+@([a-z0-9-]+\.)*ethz\.ch$/i`, look-alikes (`@fooethz.ch`, `@ethz.ch.evil.com`) unit-tested
- ✅ Verification mail with single-use token (24 h, hash stored), resend with rate limit, no account enumeration
- ✅ argon2id (node:crypto), HTTP-only `SameSite=Lax` session cookies (`Secure` on https), Origin check,
  password reset (1 h, ends all sessions), change password, log out, delete account (cascades)
- ✅ Everything (IDE page, state API, runner/compile/debug API) behind the login wall; only auth pages public
- ✅ Files/workspaces, task progress and breakpoints stored per user on the server (`/api/state`), migration of
  existing localStorage data on first login, local copy removed afterwards
- ✅ Account avatar menu in the main toolbar (Manage Account…, Log Out)
- ✅ Dev: same backend as a Vite plugin, mails in the terminal + outbox page `/dev/mail`; prod: `npm start`
- 🟡 Privacy: data minimisation (email, password hash, timestamps, saved state), deletion on request, purge of
  unverified accounts — ⬜ privacy notice text, data export, retention policy for inactive accounts
- ⬜ Real mail provider (SMTP), shared rate limiting / sessions for more than one server process (M6)
- ⬜ Conflict handling for several open tabs/devices (last write wins today)

## M5 — Task catalog & practice tasks 🟡 (started 2026-10-31)

Goal: beginners solve exercises that build on each other inside the familiar IntelliJ UI, see their progress
and get stepping-stone help instead of answers. Design: DECISIONS D14–D17, authoring guide: docs/TASKS.md.

- ✅ Task model: statement (Markdown), starter files, visible + hidden tests (io / expr / code / source),
  difficulty, concepts, week/lesson, prerequisites, steps, graded hints, reference solution
- ✅ Tasks as folders in git (`web/tasks/<id>/`), `npm run verify-tasks` checks solutions pass / starters fail
- ✅ Catalog: 41 original tasks placed at the real EProg sheet weeks 3–13 plus an "Exam practice" lesson
  (3 staged exam-style tasks), incl. Trace It tasks for the written exam (DECISIONS D18)
- ✅ Task tool window (like JetBrains Academy): description, steps checklist, graded hints, Check, result with
  Expected/Actual, Reset Content, Peek Solution diff, previous/next; Course tab with lesson progress
- ✅ Tasks open as their own project; recent projects in the project widget; File › Learn and Teach
- ✅ "Check" runs the tests through the run protocol (dev runner for now); progress per task (status, attempts,
  hints, peeks) per user on the server (M4); success + lesson-completed balloons
- ✅ Progress tracking per user on the server, sync of task workspaces (M4)
- ⬜ Serve reference solutions and hidden test expectations from the server (they ship in the JS bundle now,
  so Peek Solution gating and hidden tests are only a nudge, not a protection)
- ⬜ More tasks: EBNF without code (grammar quizzes), loop invariants / weakest preconditions, interfaces and
  generics, file input; more exam-practice sets; German texts
- ⬜ IntelliJ-style test runner tool window for check details (green/red tree); JUnit-based tests (M3)
- ⬜ Tutor tooling: task preview, "check all tasks" in CI (`npm run verify-tasks` needs a JDK in CI)
- ⬜ Exam-mode: timed sessions mimicking the exam setup

## M6 — Deployment & operations ⬜

- ⬜ Hosting (Switzerland/EU), CI (tests + smoke), staging/prod, backups, monitoring, error reporting
- ⬜ Load test for exam-week peaks
