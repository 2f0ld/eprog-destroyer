import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { parseTaskFolder, buildHarness, evaluate, explainDifference, completedSteps, sortTasks, type Task } from '../src/tasks/model.ts'
import { renderMarkdown } from '../src/tasks/markdown.ts'

const tasksDir = path.join(import.meta.dirname, '..', 'tasks')
const readFolder = (dir: string, base = dir, out: Record<string, string> = {}) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) readFolder(p, base, out)
    else out[path.relative(base, p).split(path.sep).join('/')] = readFileSync(p, 'utf8')
  }
  return out
}
const all: Task[] = readdirSync(tasksDir).map((id) => parseTaskFolder(id, readFolder(path.join(tasksDir, id))))
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')

test('every task folder parses and prerequisites exist', () => {
  const ids = new Set(all.map((t) => t.id))
  assert.ok(all.length >= 15)
  for (const t of all) {
    assert.ok(t.title && t.week > 0 && t.lesson, t.id)
    assert.ok(t.hints.length >= 2, `${t.id} needs graded hints`)
    assert.ok(t.steps.length >= 2, `${t.id} needs steps`)
    assert.ok(t.files[t.openFile] !== undefined, `${t.id} open file`)
    for (const r of t.requires) assert.ok(ids.has(r), `${t.id} requires unknown ${r}`)
  }
  // prerequisites come first
  const order = sortTasks(all).map((t) => t.id)
  for (const t of all) for (const r of t.requires) assert.ok(order.indexOf(r) < order.indexOf(t.id), `${r} before ${t.id}`)
})

test('task.md sections become description, steps and hints', () => {
  const t = all.find((x) => x.id === 'w02-countdown')!
  assert.equal(t.title, 'Countdown')
  assert.equal(t.week, 2)
  assert.deepEqual(t.concepts, ['for loop', 'loop variable'])
  assert.deepEqual(t.steps.map((s) => s.tests), [['uses-for'], ['numbers'], ['full']])
  assert.deepEqual(t.hints.map((h) => h.title), ['Approach', 'Structure', 'Almost there'])
  assert.doesNotMatch(t.description, /## (Steps|Hints)/)
})

test('harness output is evaluated against the expectations', () => {
  const t = all.find((x) => x.id === 'w04-even-odd')!
  const harness = buildHarness(t, 'n1')
  assert.match(harness, /test\("even", 2000, true, \(\) -> runMain\("12\\n"\)\);/)
  const out = [`##EPROG-n1|even|${b64('12 is even\n')}|`, `##EPROG-n1|odd|${b64('7 is odd\n')}|`, `##EPROG-n1|negative|${b64('-3 is even\n')}|`, `##EPROG-n1|zero|${b64('')}|${b64('timeout')}`, '##EPROG-n1-DONE'].join('\n')
  const r = evaluate(t, t.files, out, 'n1')
  assert.equal(r.kind, 'failed')
  if (r.kind !== 'failed') return
  assert.deepEqual(r.results.map((x) => x.passed), [true, true, false, false])
  assert.match(r.results[2].message, /Line 1 differs: expected "-3 is odd" but your program printed "-3 is even"/)
  assert.match(r.results[3].message, /infinite loop/)
  assert.equal(r.results[3].expected, undefined, 'hidden tests do not reveal the expectation')
  assert.deepEqual(completedSteps(t, r.results), [true, true, false])
  // a marker with another nonce is ignored
  assert.equal(evaluate(t, t.files, out.replace(/n1/g, 'zz'), 'n1').kind, 'failed')
})

test('source tests and numeric comparison', () => {
  const t = all.find((x) => x.id === 'w11-power')!
  const loops = { 'src/Main.java': 'class Main { static long power(int b, int e) { long r = 1; for (int i = 0; i < e; i++) r *= b; return r; } }' }
  const out = `##EPROG-x|base-case|${b64('1')}|\n##EPROG-x|recursive|${b64('1024 3486784401 -8')}|\n##EPROG-x-DONE`
  const r = evaluate(t, loops, out, 'x')
  assert.equal(r.kind, 'failed')
  if (r.kind === 'failed') assert.deepEqual(r.results.map((x) => `${x.name}:${x.passed}`), ['base-case:true', 'recursive:true', 'no-loops:false', 'is-recursive:false'])
  const g = all.find((x) => x.id === 'w04-swiss-grade')!
  const ok = evaluate(g, g.files, `##EPROG-y|exact|${b64('6.0 3.5')}|\n##EPROG-y|rounding|${b64('4.5 4.75')}|\n##EPROG-y|clamp|${b64('6.0 1.0')}|`, 'y')
  assert.equal(ok.kind, 'passed')
})

test('explainDifference gives beginner-friendly reasons', () => {
  assert.equal(explainDifference('Hello, ETH!', ''), 'Your program printed nothing.')
  assert.match(explainDifference('Hello, ETH!', 'hello, eth!'), /upper\/lower case/)
  assert.match(explainDifference('Sum: 3\nAvg: 1', 'Sum:3\nAvg:1'), /spaces or line breaks/)
  assert.match(explainDifference('a\nb', 'a'), /stops after line 1/)
})

test('markdown rendering escapes HTML and supports code, lists and tables', () => {
  const html = renderMarkdown('Hi <b>x</b> and `a < b` **bold**\n\n```java\nint x = 1;\n```\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | 2 |')
  assert.match(html, /<p>Hi &lt;b&gt;x&lt;\/b&gt; and <code>a &lt; b<\/code> <strong>bold<\/strong><\/p>/)
  assert.match(html, /<pre data-lang="java"><code>int x = 1;<\/code><\/pre>/)
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/)
  assert.match(html, /<table><thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>2<\/td><\/tr><\/tbody><\/table>/)
})
