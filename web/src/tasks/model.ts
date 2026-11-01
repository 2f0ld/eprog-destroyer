/**
 * Practice tasks: data model, task-folder parser, check harness generator and result evaluation.
 * Pure module (no DOM, no Monaco) so it is unit-tested with Node and reused by scripts/verify-tasks.mjs.
 *
 * A task is a folder `web/tasks/<id>/`:
 *   task.md      front matter + description; "## Steps" and "## Hints" sections (see docs/TASKS.md)
 *   tests.json   test cases (io / expr / code / source)
 *   src/**       starter files the student gets
 *   solution/**  reference solution (verified by `npm run verify-tasks`, shown by "Peek Solution")
 */

export interface TaskStep {
  text: string
  /** names of the tests that must pass for this step to count as done */
  tests: string[]
}

export interface TaskHint {
  title: string
  body: string
}

export type TaskTest =
  /** runs main() with `stdin`; output must equal `expected` (or contain it with match: 'contains') */
  | { type: 'io'; name: string; stdin?: string; expected: string; match?: 'exact' | 'contains'; message?: string; messageDe?: string; hidden?: boolean; timeoutMs?: number }
  | { type: 'expr'; name: string; expr: string; expected: string; message?: string; messageDe?: string; hidden?: boolean; timeoutMs?: number }
  | { type: 'code'; name: string; code: string; expected: string; message?: string; messageDe?: string; hidden?: boolean; timeoutMs?: number }
  /** regex checks on the student's source (comments and strings removed); `file` defaults to the main class */
  | { type: 'source'; name: string; require?: string; forbid?: string; file?: string; message: string; messageDe?: string; hidden?: boolean }

export interface Task {
  id: string
  title: string
  week: number
  lesson: string
  difficulty: 1 | 2 | 3
  concepts: string[]
  /** ids of tasks this one builds on */
  requires: string[]
  mainClass: string
  /** IntelliJ project name when the task is opened */
  project: string
  /** Markdown (without the Steps / Hints sections) */
  description: string
  steps: TaskStep[]
  hints: TaskHint[]
  tests: TaskTest[]
  files: Record<string, string>
  solution: Record<string, string>
  /** file opened in the editor when the task is opened */
  openFile: string
  /** German texts from task.de.md (same steps and hints, in the same order) */
  de?: TaskTexts
}

export type Lang = 'en' | 'de'

export interface TaskTexts {
  title: string
  lesson: string
  concepts: string[]
  description: string
  steps: TaskStep[]
  hints: TaskHint[]
}

/** The task's texts in `lang`, falling back to English when there is no translation. */
export function textsOf(t: Task, lang: Lang): TaskTexts {
  if (lang === 'de' && t.de) return t.de
  return { title: t.title, lesson: t.lesson, concepts: t.concepts, description: t.description, steps: t.steps, hints: t.hints }
}

/** The failure message of a test in `lang`. */
export const testMessage = (t: TaskTest, lang: Lang) => (lang === 'de' && t.messageDe) || t.message

// ------------------------------------------------------------------ parsing

/** Parse a task folder given as {relative path: content}. Throws with a readable message on bad input. */
export function parseTaskFolder(id: string, folder: Record<string, string>): Task {
  const md = folder['task.md']
  if (md === undefined) throw new Error(`task ${id}: task.md missing`)
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(md)
  const meta: Record<string, string> = {}
  for (const line of (fm?.[1] ?? '').split('\n')) {
    const m = /^(\w+)\s*:\s*(.*)$/.exec(line.trim())
    if (m) meta[m[1]] = m[2].trim()
  }
  const body = fm ? md.slice(fm[0].length) : md
  const sections = splitSections(body)
  const tests = JSON.parse(folder['tests.json'] ?? '[]') as TaskTest[]
  const files: Record<string, string> = {}
  const solution: Record<string, string> = {}
  for (const [p, c] of Object.entries(folder)) {
    if (p.startsWith('src/')) files[p] = c
    else if (p.startsWith('solution/')) solution['src/' + p.slice('solution/'.length)] = c
  }
  const list = (s: string | undefined) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [])
  const mainClass = meta.mainClass || 'Main'
  const difficulty = Number(meta.difficulty || 1)
  const task: Task = {
    id,
    title: meta.title || id,
    week: Number(meta.week || 0),
    lesson: meta.lesson || '',
    difficulty: (difficulty >= 1 && difficulty <= 3 ? difficulty : 1) as Task['difficulty'],
    concepts: list(meta.concepts),
    requires: list(meta.requires),
    mainClass,
    project: meta.project || id,
    description: sections.description.trim(),
    steps: parseSteps(sections.steps),
    hints: parseHints(sections.hints),
    tests,
    files,
    solution,
    openFile: meta.open || (`src/${mainClass}.java` in files ? `src/${mainClass}.java` : Object.keys(files)[0] ?? ''),
  }
  if (folder['task.de.md'] !== undefined) task.de = parseTranslation(task, folder['task.de.md'])
  validateTask(task)
  return task
}

/** task.de.md: front matter (title, lesson, concepts), description, Steps and Hints like task.md. */
function parseTranslation(task: Task, md: string): TaskTexts {
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(md)
  const meta: Record<string, string> = {}
  for (const line of (fm?.[1] ?? '').split('\n')) {
    const m = /^(\w+)\s*:\s*(.*)$/.exec(line.trim())
    if (m) meta[m[1]] = m[2].trim()
  }
  const sec = splitSections(fm ? md.slice(fm[0].length) : md)
  const steps = parseSteps(sec.steps)
  const hints = parseHints(sec.hints)
  if (steps.length !== task.steps.length) throw new Error(`task ${task.id}: task.de.md has ${steps.length} steps, task.md has ${task.steps.length}`)
  if (hints.length !== task.hints.length) throw new Error(`task ${task.id}: task.de.md has ${hints.length} hints, task.md has ${task.hints.length}`)
  return {
    title: meta.title || task.title,
    lesson: meta.lesson || task.lesson,
    concepts: meta.concepts ? meta.concepts.split(',').map((x) => x.trim()).filter(Boolean) : task.concepts,
    description: sec.description.trim(),
    // the tests that prove a step come from task.md
    steps: steps.map((s, i) => ({ text: s.text, tests: task.steps[i].tests })),
    hints,
  }
}

function splitSections(body: string) {
  const out = { description: '', steps: '', hints: '' }
  let cur: keyof typeof out = 'description'
  for (const line of body.split('\n')) {
    const h = /^##\s+(.*)$/.exec(line)
    if (h && /^steps$/i.test(h[1].trim())) {
      cur = 'steps'
      continue
    }
    if (h && /^hints$/i.test(h[1].trim())) {
      cur = 'hints'
      continue
    }
    if (h && cur !== 'description' && !/^###/.test(line)) cur = 'description'
    out[cur] += line + '\n'
  }
  return out
}

/** "1. Read the number (tests: reads, prints)" -> step */
function parseSteps(s: string): TaskStep[] {
  const steps: TaskStep[] = []
  for (const line of s.split('\n')) {
    const m = /^\s*(?:\d+\.|[-*])\s+(.*)$/.exec(line)
    if (!m) {
      if (line.trim() && steps.length) steps[steps.length - 1].text += ' ' + line.trim()
      continue
    }
    const t = /^(.*?)\s*\(tests?:\s*([^)]*)\)\s*$/.exec(m[1])
    steps.push({ text: (t ? t[1] : m[1]).trim(), tests: t ? t[2].split(',').map((x) => x.trim()).filter(Boolean) : [] })
  }
  return steps
}

function parseHints(s: string): TaskHint[] {
  const hints: TaskHint[] = []
  for (const line of s.split('\n')) {
    const h = /^###\s+(.*)$/.exec(line)
    if (h) hints.push({ title: h[1].trim(), body: '' })
    else if (hints.length) hints[hints.length - 1].body += line + '\n'
  }
  return hints.map((x) => ({ ...x, body: x.body.trim() }))
}

function validateTask(t: Task) {
  const names = new Set<string>()
  for (const x of t.tests) {
    if (!x.name || names.has(x.name)) throw new Error(`task ${t.id}: test names must be unique and non-empty (${x.name})`)
    names.add(x.name)
    if (!['io', 'expr', 'code', 'source'].includes(x.type)) throw new Error(`task ${t.id}: unknown test type ${(x as { type: string }).type}`)
  }
  for (const s of t.steps) for (const n of s.tests) if (!names.has(n)) throw new Error(`task ${t.id}: step "${s.text}" refers to unknown test ${n}`)
  if (!Object.keys(t.files).length) throw new Error(`task ${t.id}: no starter files in src/`)
  if (!t.tests.length) throw new Error(`task ${t.id}: no tests`)
}

/** Order tasks by week, then by `requires` (prerequisites first), then by id. */
export function sortTasks(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const depth = new Map<string, number>()
  const d = (t: Task, seen = new Set<string>()): number => {
    if (depth.has(t.id)) return depth.get(t.id)!
    if (seen.has(t.id)) return 0
    seen.add(t.id)
    const v = Math.max(0, ...t.requires.map((r) => (byId.has(r) ? d(byId.get(r)!, seen) + 1 : 0)))
    depth.set(t.id, v)
    return v
  }
  return [...tasks].sort((a, b) => a.week - b.week || d(a) - d(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

// ------------------------------------------------------------------ harness

export const HARNESS_CLASS = 'EprogCheck'
export const HARNESS_PATH = `src/${HARNESS_CLASS}.java`

export function javaString(s: string) {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"'
}

/**
 * Java source of the check harness. It runs every non-source test in-process with a timeout,
 * redirecting System.in/System.out for io tests, and prints one marker line per test:
 *   ##EPROG-<nonce>|<name>|<base64 actual>|<base64 error>
 * Comparison with the expected values happens in TypeScript (evaluate()).
 */
export function buildHarness(task: Task, nonce: string): string {
  const calls = task.tests
    .filter((t) => t.type !== 'source')
    .map((t) => {
      const timeout = ('timeoutMs' in t && t.timeoutMs) || 2000
      if (t.type === 'io') return `        test(${javaString(t.name)}, ${timeout}, true, () -> runMain(${javaString(t.stdin ?? '')}));`
      if (t.type === 'expr') return `        test(${javaString(t.name)}, ${timeout}, false, () -> str(${t.expr}));`
      return `        test(${javaString(t.name)}, ${timeout}, false, () -> { ${t.code.replace(/return\s+([^;]+);/g, 'return str($1);')} });`
    })
    .join('\n')
  return `import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

// Generated by the EProg task checker. Not part of your solution.
public class ${HARNESS_CLASS} {
    private static final PrintStream OUT = System.out;
    private static final InputStream IN = System.in;
    private static volatile ByteArrayOutputStream partial;

    private static String b64(String s) {
        return Base64.getEncoder().encodeToString((s == null ? "" : s).getBytes(StandardCharsets.UTF_8));
    }

    static String str(Object o) {
        if (o == null) return "null";
        if (o instanceof int[] a) return Arrays.toString(a);
        if (o instanceof long[] a) return Arrays.toString(a);
        if (o instanceof double[] a) return Arrays.toString(a);
        if (o instanceof char[] a) return Arrays.toString(a);
        if (o instanceof boolean[] a) return Arrays.toString(a);
        if (o instanceof String[] a) return Arrays.toString(a);
        if (o instanceof Object[] a) return Arrays.deepToString(a);
        return String.valueOf(o);
    }

    static String runMain(String stdin) throws Exception {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        partial = buf;
        System.setIn(new ByteArrayInputStream(stdin.getBytes(StandardCharsets.UTF_8)));
        System.setOut(new PrintStream(buf, true, StandardCharsets.UTF_8));
        try {
            ${task.mainClass}.main(new String[0]);
        } finally {
            System.out.flush();
            System.setIn(IN);
            System.setOut(OUT);
        }
        return buf.toString(StandardCharsets.UTF_8);
    }

    private static String describe(Throwable t) {
        StringBuilder sb = new StringBuilder(t.toString());
        for (StackTraceElement e : t.getStackTrace()) {
            String c = e.getClassName();
            if (c.startsWith("java.") || c.startsWith("jdk.") || c.startsWith("sun.") || c.startsWith("${HARNESS_CLASS}")) continue;
            sb.append("\\n\\tat ").append(e);
        }
        return sb.toString();
    }

    private static void test(String name, long timeoutMs, boolean io, Callable<String> body) {
        String actual = "";
        String error = "";
        partial = null;
        ExecutorService ex = Executors.newSingleThreadExecutor(r -> {
            Thread th = new Thread(r);
            th.setDaemon(true);
            return th;
        });
        try {
            actual = ex.submit(body).get(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            error = "timeout";
            if (io && partial != null) actual = partial.toString(StandardCharsets.UTF_8);
        } catch (ExecutionException e) {
            error = describe(e.getCause());
            if (io && partial != null) actual = partial.toString(StandardCharsets.UTF_8);
        } catch (Throwable t) {
            error = describe(t);
        } finally {
            ex.shutdownNow();
            System.setIn(IN);
            System.setOut(OUT);
        }
        OUT.println("##EPROG-${nonce}|" + name + "|" + b64(actual) + "|" + b64(error));
        OUT.flush();
    }

    public static void main(String[] args) {
        Locale.setDefault(Locale.US); // printf("%.2f") must print 2.75 everywhere
${calls}
        OUT.println("##EPROG-${nonce}-DONE");
        OUT.flush();
        System.exit(0);
    }
}
`
}

// ------------------------------------------------------------------ evaluation

export interface TestResult {
  name: string
  passed: boolean
  /** what to show the student (never reveals hidden expectations) */
  message: string
  expected?: string
  actual?: string
  stdin?: string
  error?: string
}

export type CheckOutcome =
  | { kind: 'passed'; results: TestResult[] }
  | { kind: 'failed'; results: TestResult[] }
  | { kind: 'compile-error'; message: string; file?: string; line?: number }
  | { kind: 'error'; message: string }

function b64decode(s: string) {
  const bin = atob(s)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** Parse the harness' marker lines from the program's stdout. */
export function parseHarnessOutput(stdout: string, nonce: string): { results: Map<string, { actual: string; error: string }>; done: boolean } {
  const results = new Map<string, { actual: string; error: string }>()
  let done = false
  const prefix = `##EPROG-${nonce}`
  for (const line of stdout.split('\n')) {
    if (line.trim() === `${prefix}-DONE`) done = true
    if (!line.startsWith(prefix + '|')) continue
    const [, name, actual, error] = line.trim().split('|')
    results.set(name, { actual: b64decode(actual ?? ''), error: b64decode(error ?? '') })
  }
  return { results, done }
}

/** IntelliJ-ish output normalization: \r\n, trailing spaces per line, trailing blank lines. */
export function normalizeOutput(s: string) {
  return s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '')
}

function sameValue(expected: string, actual: string) {
  const e = expected.trim()
  const a = actual.trim()
  if (e === a) return true
  const ne = Number(e)
  const na = Number(a)
  return e !== '' && a !== '' && Number.isFinite(ne) && Number.isFinite(na) && /[.eE]/.test(e + a) && Math.abs(ne - na) <= 1e-9 * Math.max(1, Math.abs(ne))
}

/** Beginner-friendly explanation of why two outputs differ. */
export function explainDifference(expected: string, actual: string, lang: Lang = 'en'): string {
  const de = lang === 'de'
  const e = normalizeOutput(expected)
  const a = normalizeOutput(actual)
  if (!a) return de ? 'Dein Programm hat nichts ausgegeben.' : 'Your program printed nothing.'
  if (e.toLowerCase() === a.toLowerCase()) return de ? 'Der Text stimmt bis auf Gross-/Kleinschreibung überein.' : 'The text matches except for upper/lower case letters.'
  if (e.replace(/\s+/g, '') === a.replace(/\s+/g, '')) return de ? 'Der Text stimmt bis auf Leerzeichen oder Zeilenumbrüche überein. Prüfe, wo du print bzw. println verwendest und die Leerzeichen um Werte.' : 'The text matches except for spaces or line breaks. Check where you use print vs. println and the spaces around values.'
  const el = e.split('\n')
  const al = a.split('\n')
  for (let i = 0; i < Math.max(el.length, al.length); i++) {
    if (el[i] === al[i]) continue
    if (al[i] === undefined) return de ? `Deine Ausgabe endet nach Zeile ${i}; erwartet wurde noch die Zeile "${el[i]}".` : `Your output stops after line ${i}; expected another line: "${el[i]}".`
    if (el[i] === undefined) return de ? `Deine Ausgabe hat eine zusätzliche Zeile ${i + 1}: "${al[i]}".` : `Your output has extra line ${i + 1}: "${al[i]}".`
    return de ? `Zeile ${i + 1} unterscheidet sich: erwartet "${el[i]}", dein Programm gab "${al[i]}" aus.` : `Line ${i + 1} differs: expected "${el[i]}" but your program printed "${al[i]}".`
  }
  return de ? 'Die Ausgabe unterscheidet sich von der erwarteten Ausgabe.' : 'The output differs from the expected output.'
}

const ERROR_TIPS: Record<string, { en: string; de: string }> = {
  ArrayIndexOutOfBoundsException: { en: 'An array index was outside 0 … length - 1. Check your loop bounds (< vs <=).', de: 'Ein Array-Index lag ausserhalb von 0 … length - 1. Prüfe deine Schleifengrenzen (< vs. <=).' },
  StringIndexOutOfBoundsException: { en: 'A String index was outside 0 … length() - 1.', de: 'Ein String-Index lag ausserhalb von 0 … length() - 1.' },
  NullPointerException: { en: 'Something was null when it was used. Did you create the object with new?', de: 'Etwas war null, als es verwendet wurde. Hast du das Objekt mit new erzeugt?' },
  ArithmeticException: { en: 'Division by zero.', de: 'Division durch null.' },
  InputMismatchException: { en: 'Scanner read something of the wrong type (e.g. nextInt() on text).', de: 'Scanner hat etwas vom falschen Typ gelesen (z. B. nextInt() auf Text).' },
  NoSuchElementException: { en: 'Scanner tried to read more input than there is.', de: 'Scanner wollte mehr Eingabe lesen, als vorhanden ist.' },
  StackOverflowError: { en: 'The recursion never stops. Check your base case.', de: 'Die Rekursion hört nie auf. Prüfe deinen Basisfall.' },
  NumberFormatException: { en: 'A String could not be converted to a number.', de: 'Ein String konnte nicht in eine Zahl umgewandelt werden.' },
}

function explainError(error: string, lang: Lang = 'en') {
  const de = lang === 'de'
  if (error === 'timeout') return de ? 'Dein Programm ist nicht innerhalb der Zeitlimite fertig geworden. Gibt es eine Endlosschleife (eine Bedingung, die nie falsch wird)?' : 'Your program did not finish within the time limit. Is there an infinite loop (a loop condition that never becomes false)?'
  const first = error.split('\n')[0]
  const where = /\n\tat .*\((\w+\.java:\d+)\)/.exec(error)?.[1]
  const name = /^([\w.$]+)(?::|$)/.exec(first)?.[1]?.replace(/^.*\./, '') ?? (de ? 'Eine Exception' : 'An exception')
  const tip = ERROR_TIPS[name]?.[lang] ?? ''
  return (de ? `${name} wurde geworfen${where ? ` bei ${where}` : ''}. ${tip}` : `${name} was thrown${where ? ` at ${where}` : ''}. ${tip}`).trim()
}

/** Source checks run on the student's main file (comments and strings stripped). */
export function runSourceTests(task: Task, files: Record<string, string>, lang: Lang = 'en'): TestResult[] {
  return task.tests.flatMap((t) => {
    if (t.type !== 'source') return []
    const src = stripCommentsAndStrings(files[t.file ?? `src/${task.mainClass}.java`] ?? Object.values(files).join('\n'))
    const okReq = !t.require || new RegExp(t.require, 'm').test(src)
    const okForbid = !t.forbid || !new RegExp(t.forbid, 'm').test(src)
    return [{ name: t.name, passed: okReq && okForbid, message: okReq && okForbid ? '' : (testMessage(t, lang) ?? '') }]
  })
}

export function stripCommentsAndStrings(src: string) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
}

/** Combine harness output and source checks into per-test results, in task order. */
export function evaluate(task: Task, files: Record<string, string>, stdout: string, nonce: string, lang: Lang = 'en'): CheckOutcome {
  const de = lang === 'de'
  const { results: raw, done } = parseHarnessOutput(stdout, nonce)
  const source = new Map(runSourceTests(task, files, lang).map((r) => [r.name, r]))
  const results: TestResult[] = []
  for (const t of task.tests) {
    if (t.type === 'source') {
      results.push(source.get(t.name)!)
      continue
    }
    const r = raw.get(t.name)
    if (!r) {
      results.push({ name: t.name, passed: false, message: de ? (done ? 'Der Test wurde nicht ausgeführt.' : 'Die Prüfung brach ab, bevor dieser Test lief (das Programm wurde beendet oder ist abgestürzt).') : done ? 'The test did not run.' : 'The check stopped before this test ran (the program exited or crashed).' })
      continue
    }
    if (r.error) {
      results.push({ name: t.name, passed: false, message: testMessage(t, lang) ? `${explainError(r.error, lang)}\n${testMessage(t, lang)}` : explainError(r.error, lang), error: r.error, actual: t.type === 'io' && !t.hidden ? r.actual : undefined, stdin: t.type === 'io' && !t.hidden ? t.stdin : undefined, expected: t.hidden ? undefined : t.expected })
      continue
    }
    const passed = t.type === 'io' ? (t.match === 'contains' ? normalizeOutput(r.actual).includes(normalizeOutput(t.expected)) : normalizeOutput(r.actual) === normalizeOutput(t.expected)) : sameValue(t.expected, r.actual)
    const exp = t.hidden ? '' : de ? `, erwartet ${t.expected}` : `, expected ${t.expected}`
    const what =
      t.type === 'io'
        ? t.match === 'contains'
          ? de ? `Deine Ausgabe sollte "${normalizeOutput(t.expected)}" enthalten.` : `Expected your output to contain "${normalizeOutput(t.expected)}".`
          : explainDifference(t.expected, r.actual, lang)
        : t.type === 'expr'
          ? de ? `${t.expr} ergab ${r.actual}${exp}.` : `${t.expr} returned ${r.actual}${exp}.`
          : de ? `Ergebnis ${r.actual}${exp}.` : `Returned ${r.actual}${exp}.`
    results.push({
      name: t.name,
      passed,
      message: passed ? '' : [t.hidden ? '' : what, testMessage(t, lang) ?? ''].filter(Boolean).join('\n') || (de ? 'Ein versteckter Test ist fehlgeschlagen.' : 'A hidden test failed.'),
      expected: t.hidden ? undefined : t.expected,
      actual: t.hidden ? undefined : r.actual,
      stdin: t.type === 'io' && !t.hidden ? t.stdin : undefined,
    })
  }
  return { kind: results.every((r) => r.passed) ? 'passed' : 'failed', results }
}

/** Steps whose tests all passed. Steps without tests count as done when everything passed. */
export function completedSteps(task: Task, results: TestResult[]): boolean[] {
  const passed = new Set(results.filter((r) => r.passed).map((r) => r.name))
  const all = results.length > 0 && results.every((r) => r.passed)
  return task.steps.map((s) => (s.tests.length ? s.tests.every((n) => passed.has(n)) : all))
}
