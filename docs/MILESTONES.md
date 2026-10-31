# Milestones

Living roadmap. Update the status and the "Next up" section whenever you stop working.
Legend: ✅ done · 🟡 partial · ⬜ not started

---

## Next up (resume here)

1. **M3** (production-grade sandboxed Java execution) — now the most important gap: Run, live error
   highlighting (`/api/compile`) and task checking all go through the DEV-ONLY runner. M3 must implement
   `/api/run` and `/api/compile` (incl. `code`/`args` in diagnostics, DECISIONS D10/D15).
2. **M5 follow-ups**: theory practice (EBNF quizzes, loop invariants, weakest preconditions), interfaces/generics,
   more exam-practice sets, German texts (D17), an IntelliJ-style test runner view for check details.
3. **M2 leftovers**: Ctrl+Q docs, Navigate Back/Forward, Ctrl+click underline, more quick fixes, smart completion,
   bundle size (lazy-load Monaco).

Before continuing, run `cd web && npm install && npm test && npm run dev`, then `npm run smoke` and
`npm run verify-tasks` (with the dev server running for smoke) to make sure everything still works.

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
- ✅ Files persisted in localStorage (until accounts exist in M4)
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
- ⬜ Debugger UI (breakpoints on line numbers, Debug tool window) — needs M3 support (JDWP)
- ⬜ Bundle size: pick only needed Monaco features (currently 4.5 MB JS), lazy-load Monaco
- ⬜ Accessibility pass, Firefox/Chrome/Safari check, small-screen behavior

## M3 — Sandboxed Java execution service ⬜

- ⬜ Backend service (Node or JVM) implementing the same protocol as `web/dev/devRunner.ts`
  (`POST /api/run` NDJSON stream, `/stdin`, `/kill`) — the frontend should not need changes
- ⬜ Isolation: per-run container (e.g. gVisor/nsjail/firecracker), no network, CPU/memory/time/output/pid limits,
  read-only rootfs, ephemeral workdir
- ⬜ Warm JVM pool / class data sharing to keep run latency < 1 s
- ⬜ JUnit test execution for tasks (results in an IntelliJ-style test runner tool window)
- ⬜ Rate limiting per user; abuse monitoring
- ⬜ Replace the dev runner in production builds; keep it for local dev

## M4 — Accounts: ethz.ch-only sign-up & email verification ⬜

- ⬜ Sign up / log in pages (separate from the IDE look)
- ⬜ Email must be `@ethz.ch` or a subdomain (e.g. `@student.ethz.ch`): validate with
  `/^[^@\s]+@([a-z0-9-]+\.)*ethz\.ch$/i` on the server — beware look-alikes such as `@fooethz.ch`
- ⬜ Verification email with single-use, expiring token (SMTP provider TBD); resend with rate limit
- ⬜ Password hashing (argon2id), sessions (HTTP-only secure cookies), password reset
- ⬜ Everything (IDE, API, runner) behind the login wall; only auth pages public
- ⬜ Move file persistence from localStorage to the server (per user, per task)
- ⬜ Privacy: data minimization, deletion on request (Swiss nDSG / GDPR)

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
  hints, peeks) in localStorage; success + lesson-completed balloons
- ⬜ Progress tracking per user on the server (needs M4), sync of task workspaces
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
