# Practice tasks: authoring guide

Students open a task from the **Task** tool window (right stripe) or the project widget in the toolbar.
Each task opens as its own IntelliJ project; **Check** compiles the student's code together with a generated
test harness and shows the result in the Task window. Progress is stored per browser (until accounts, M4).

## Folder layout

```
web/tasks/w04-even-odd/
  task.md          front matter, description, steps, hints
  tests.json       test cases
  src/Main.java    starter files (everything under src/ is copied into the student's project)
  solution/Main.java   reference solution (same paths as src/)
```

The folder name is the task id. Prefix it with the week (`w04-`) so folders sort in course order.

## German texts: task.de.md

Every task also has `task.de.md` with the same structure: front matter `title`, `lesson`, `concepts`, the
description, and **the same number of steps and hints in the same order** (the tests of each step come from
`task.md`). Test failure messages get a German version as `messageDe` in `tests.json`. Use Swiss spelling
(`ss`, never `ß`); `npm test` checks all of this. Students switch with EN | DE in the Task window header.

## task.md

```markdown
---
title: Even or Odd
week: 4
lesson: Conditionals and input      # tasks with the same week + lesson form one lesson
difficulty: 1                       # 1 easy · 2 medium · 3 hard
concepts: Scanner, if/else, modulo  # shown as chips
requires: w03-duration              # tasks this one builds on (comma-separated ids)
open: src/Main.java                 # optional: file opened first (default: the main class)
mainClass: Main                     # optional, default Main
---
What to build, with an example table.

### Before you code
Questions that make the student plan before typing.

## Steps

1. Read the number and recognize even numbers (tests: even)
2. Recognize odd numbers (tests: odd)

## Hints

### Approach
The idea, no code.

### Structure
A code skeleton with gaps.

### Almost there
The last missing piece.
```

### Writing for beginners

The hard part for beginners is often *how to approach* a problem, not the Java syntax. So every task has:

- **Before you code**: 2–4 questions that lead to the approach (what is the input, what is the output, work one
  example by hand, which known pattern fits).
- **Steps**: the problem broken into sub-goals that can be checked one by one. Each step names the tests that
  prove it; after Check, finished steps turn green, so partial progress is visible.
- **Graded hints** (revealed one at a time): 1. the idea in words, 2. a skeleton with gaps, 3. the last missing
  detail. Hints never contain the complete solution.
- **Peek Solution** unlocks only after all hints were shown or after 3 checks, and opens as a diff.
- Tasks **build on each other** (`requires`): reuse concepts from earlier tasks and mention the connection
  ("This is the cumulative sum from week 4 again").

Keep descriptions short, use `inline code` for anything typed, and give at least one example.

### Course alignment

`week` is the EProg exercise-sheet week, so tasks appear when the course reaches the topic: first programs
and decisions (3), loops and prose algorithms (4), arrays and 2D arrays (5), recursion and text (6), classes
(7), sorted data and parsing (8), linked lists (9), linked structures (10), inheritance and exceptions (11),
parsing from a grammar (12), collections (13), exam practice (14). The target level is the programming exam:
staged parts (validate input with `IllegalArgumentException` first, then compute), 2D arrays, graphs over
`Map`/`List`, and class hierarchies with rules. **Trace It** tasks practise the written exam (predicting
output, dispatch) and forbid running the code via a `source` test.

All tasks are original. Official course material is used only as a reference for topics and level and must
never be copied into this repository (it is public).

Where beginners get stuck, and how tasks respond:

- *Prose or formula → loop* (base conversion, Euclid, neighbourhoods): "Before you code" asks for a trace
  table of one example; the first hint names the loop variables.
- *Index arithmetic* (2D arrays, jagged arrays, offsets): steps test a helper for one cell or one row first.
- *Edge cases* (empty input, 0, negative numbers, one element): a dedicated step with its own test.
- *Recursion*: the planning section asks for the choice at the first element and the base cases.
- *Exam tasks*: one step per exam part, so partial progress counts like partial points.

## tests.json

```json
[
  { "type": "io", "name": "even", "stdin": "12\n", "expected": "12 is even\n" },
  { "type": "io", "name": "first-line", "expected": "Hello, ETH!", "match": "contains" },
  { "type": "expr", "name": "basic", "expr": "Main.distance(0, 0, 3, 4)", "expected": "5.0" },
  { "type": "code", "name": "withdraw", "code": "BankAccount a = new BankAccount(100); a.withdraw(30); return a.getBalance();", "expected": "70" },
  { "type": "source", "name": "no-loops", "forbid": "\\b(for|while)\\b", "message": "Solve it recursively." }
]
```

| Type | What it does |
|---|---|
| `io` | Runs `main` with `stdin`; output must equal `expected` (trailing spaces/newlines ignored), or contain it with `"match": "contains"` |
| `expr` | Evaluates a Java expression; its value (arrays via `Arrays.toString`) must equal `expected` (numbers with a tolerance) |
| `code` | Runs Java statements ending in `return ...;` and compares the returned value |
| `source` | Regex `require` / `forbid` on the student's source with comments and strings removed (`file` defaults to the main class) |

Optional on every test: `message` (shown when it fails — explain the likely mistake), `hidden: true` (do not
reveal input/expected value), `timeoutMs` (default 2000).

The harness (`buildHarness` in `web/src/tasks/model.ts`) runs all tests in one JVM with `Locale.US`, captures
`System.out` for `io` tests and reports results with base64 marker lines. If the student renamed a method
the harness calls, the check reports "The tests could not call your code" with the missing symbol.

## Verify

```bash
cd web && npm run verify-tasks            # all tasks
cd web && npm run verify-tasks w04-even-odd
```

It checks that the solution passes every test and that the starter code does **not** pass (otherwise the task
would be solved without doing anything). `npm test` also parses every task folder.
