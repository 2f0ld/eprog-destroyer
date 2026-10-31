# Milestones

Living roadmap. Update the status and the "Next up" section whenever you stop working.
Legend: ✅ done · 🟡 partial · ⬜ not started

---

## Next up (resume here)

1. **M2 polish** — see the open items under M2 below. The most visible gaps vs. real IntelliJ are:
   on-the-fly error highlighting (red squiggles while typing, not only after Run), IntelliJ-style completion
   popup icons, Rename refactoring (Shift+F6 currently does "change all occurrences"), Optimize Imports.
2. Then **M3** (production-grade sandboxed Java execution) because M4/M5 depend on a real backend.

Before continuing, run `cd web && npm install && npm test && npm run dev` and `npm run smoke`
(with the dev server running) to make sure everything still works.

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

## M5 — Task catalog ⬜

- ⬜ Task model: statement (Markdown), starter project files, hidden + visible tests, difficulty, topic, week
- ⬜ Task browser + task description tool window inside the IDE (like IntelliJ's "Task Description" in JetBrains Academy)
- ⬜ "Check" button running tests; progress tracking per user
- ⬜ Authoring workflow for tutors (tasks as files in a git repo)
- ⬜ Exam-mode: timed sessions mimicking the exam setup

## M6 — Deployment & operations ⬜

- ⬜ Hosting (Switzerland/EU), CI (tests + smoke), staging/prod, backups, monitoring, error reporting
- ⬜ Load test for exam-week peaks
