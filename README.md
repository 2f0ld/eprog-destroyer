# eprog-destroyer

A web practice environment for ETH Zürich's first-year course **"Einführung in die Programmierung" (EProg)**.
Students solve Java tasks in a browser IDE that looks and behaves like **IntelliJ IDEA**, because the exam is written in IntelliJ.
Access will be restricted to verified `ethz.ch` email addresses.

**Status:** Milestone 1 (IntelliJ-style web editor) is done. See [`docs/MILESTONES.md`](docs/MILESTONES.md) for what's next.

## Quick start

Requirements: Node ≥ 22 and a JDK (`javac`/`java` on `PATH`). The JDK is only needed for the dev-only local runner.

```bash
cd web
npm install
npm run dev        # open http://localhost:5173
```

Press **Shift+F10** to run `Main`. Programs that read from `System.in` take input in the Run console.

## Repository layout

```
docs/
  MILESTONES.md     roadmap + status; start here when resuming work
  DECISIONS.md      architecture decision log (why things are the way they are)
  RESEARCH.md       where the IntelliJ colors, metrics and icons come from
web/                Vite + React + TypeScript frontend (the IDE)
  src/ide/          IDE shell: store, actions, menus, shortcuts, run client, tool windows
  src/editor/       Monaco bootstrap, IntelliJ keymap, editor instance ref
  src/java/         Java tokenizer, analyzer (highlighting/outline), completion, formatter, JDK API table
  src/theme/        Islands Dark/Light UI tokens + editor color schemes (from JetBrains sources)
  src/ui/           generic UI: icons, menus, dialogs/popups
  src/assets/icons/ official IntelliJ New-UI icons (Apache-2.0, see NOTICE.md)
  dev/devRunner.ts  DEV-ONLY Java runner (no sandbox! never deploy)
  scripts/          smoke test + inspect tools (drive system Firefox via puppeteer-core)
  tests/            unit tests (node --test)
```

## Legal notes

Not affiliated with JetBrains. The icons are from the Apache-2.0 licensed IntelliJ Community repository
(see `web/src/assets/icons/NOTICE.md`). We do not use JetBrains logos or product names in the UI.
