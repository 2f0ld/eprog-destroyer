// Verifies the task catalog: every reference solution must pass all tests and every starter project
// must fail at least one. Runs javac/java locally (like the dev runner), working in web/.runner-tmp.
//   npm run verify-tasks [task-id ...]
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTaskFolder, buildHarness, evaluate, HARNESS_PATH } from '../src/tasks/model.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tasksDir = path.join(root, 'tasks')
const tmp = path.join(root, '.runner-tmp', 'verify')

function readFolder(dir, base = dir, out = {}) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) readFolder(p, base, out)
    else out[path.relative(base, p).split(path.sep).join('/')] = readFileSync(p, 'utf8')
  }
  return out
}

function check(task, files, label) {
  const dir = path.join(tmp, `${task.id}-${label}`)
  rmSync(dir, { recursive: true, force: true })
  const nonce = Math.random().toString(36).slice(2, 10)
  const all = { ...files, [HARNESS_PATH]: buildHarness(task, nonce) }
  for (const [rel, content] of Object.entries(all)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    writeFileSync(path.join(dir, rel), content)
  }
  const sources = Object.keys(all).filter((p) => p.endsWith('.java')).map((p) => path.join(dir, p))
  const javac = spawnSync('javac', ['-encoding', 'UTF-8', '-proc:none', '-d', path.join(dir, 'out'), ...sources], { encoding: 'utf8' })
  if (javac.status !== 0) return { kind: 'compile-error', message: javac.stderr || javac.stdout }
  const java = spawnSync('java', ['-Xmx256m', '-cp', path.join(dir, 'out'), 'EprogCheck'], { encoding: 'utf8', timeout: 30000 })
  rmSync(dir, { recursive: true, force: true })
  return evaluate(task, files, java.stdout ?? '', nonce)
}

const only = process.argv.slice(2)
let failures = 0
for (const id of readdirSync(tasksDir).sort()) {
  if (only.length && !only.includes(id)) continue
  let task
  try {
    task = parseTaskFolder(id, readFolder(path.join(tasksDir, id)))
  } catch (e) {
    console.log(`✖ ${id}: ${e.message}`)
    failures++
    continue
  }
  const sol = check(task, { ...task.files, ...task.solution }, 'solution')
  const start = check(task, task.files, 'starter')
  const solOk = sol.kind === 'passed'
  const startOk = start.kind !== 'passed'
  if (solOk && startOk) console.log(`✔ ${id} (${task.tests.length} tests)`)
  else {
    failures++
    console.log(`✖ ${id}`)
    if (!solOk) console.log('  solution:', sol.kind, sol.message ?? sol.results?.filter((r) => !r.passed).map((r) => `${r.name}: ${r.message}`).join('; '))
    if (!startOk) console.log('  starter passes all tests — the task would be solved without doing anything')
  }
}
console.log(failures ? `${failures} task(s) failed` : 'all tasks verified')
process.exit(failures ? 1 : 0)
