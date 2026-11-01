// Smoke test / screenshot tool. Drives the system Firefox (or Chrome if there is no Firefox).
//   node scripts/smoke.mjs [url]        (dev server must be running)
// Screenshots land in web/.e2e-shots/. The browser profile lives in web/.e2e-profile/.
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { launch, root } from './browser.mjs'

const url = process.argv[2] ?? 'http://localhost:5173/'
const shots = path.join(root, '.e2e-shots')
mkdirSync(shots, { recursive: true })

const browser = await launch()
const page = await browser.newPage()
const errors = []
let step = 'load'
page.on('pageerror', (e) => errors.push(`[${step}] ${e} ${e?.stack ?? ''}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`[${step}] ${m.text()}`))

const shot = (name) => (step = name) && page.screenshot({ path: path.join(shots, `${name}.png`) })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const origin = new URL(url).origin
const fill = async (selector, text) => {
  await page.click(selector, { count: 3 })
  await page.keyboard.type(text)
}

// accounts: the IDE is behind the login wall; sign up with a fresh ETH address, confirm it via the dev
// mail outbox and log in (DECISIONS D20)
await page.goto(`${origin}/login`, { waitUntil: 'load' })
await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }))
await page.evaluate(() => localStorage.clear())
await page.goto(url, { waitUntil: 'load' })
if (new URL(page.url()).pathname !== '/login') throw new Error(`login wall: expected /login, got ${page.url()}`)
const email = `smoke.${Date.now()}@student.ethz.ch`
const password = 'smoke test passphrase'
await page.goto(`${origin}/signup`, { waitUntil: 'load' })
await page.waitForSelector('input[type=email]')
await fill('input[type=email]', 'smoke@fooethz.ch')
await fill('input[type=password]', password)
await page.click('button.auth-primary')
await page.waitForSelector('.auth-notice.error')
await fill('input[type=email]', email)
await page.click('button.auth-primary')
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Check your inbox')
await shot('00-signup')
const link = await page.evaluate(async (to) => (await (await fetch('/api/dev/outbox')).json()).mails.find((m) => m.to === to)?.link, email)
if (!link) throw new Error('no verification mail in the dev outbox')
await page.goto(link, { waitUntil: 'load' })
await page.waitForSelector('a.auth-primary')
await page.click('a.auth-primary')
await page.waitForSelector('input[type=password]')
await fill('input[type=password]', password)
await page.click('button.auth-primary')
await page.waitForSelector('.monaco-editor .view-lines')
await sleep(800)
await shot('01-dark')

// run the program: Shift+F10, answer the Scanner prompt
await page.keyboard.down('Shift')
await page.keyboard.press('F10')
await page.keyboard.up('Shift')
await page.waitForSelector('.ij-console-system', { timeout: 20000 })
await sleep(800)
await page.keyboard.type('ETH')
await page.keyboard.press('Enter')
await page.waitForFunction(() => document.querySelector('.ij-console')?.textContent?.includes('Process finished'), { timeout: 20000 })
await sleep(300)
await shot('02-run')

// debugger: breakpoint by clicking the line number, Debug (Shift+F9), step over/into, resume
const bpLine = await page.evaluate(() => window.__ide_editor.getModel().getLinesContent().findIndex((l) => l.includes('int[] fib = fibonacci(LIMIT);')) + 1)
const lineNumber = async (n) => {
  await page.evaluate((n) => window.__ide_editor.revealLineInCenter(n), n)
  await sleep(100)
  return page.evaluateHandle((n) => [...document.querySelectorAll('.monaco-editor .line-numbers')].find((e) => e.textContent.trim() === String(n)), n)
}
await (await lineNumber(bpLine)).click()
await page.waitForSelector('.monaco-editor .line-numbers.ij-bp')
await page.keyboard.down('Shift')
await page.keyboard.press('F9')
await page.keyboard.up('Shift')
await page.waitForFunction(() => document.querySelector('.ij-debug .ij-console')?.textContent?.includes('Connected to the target VM'), { timeout: 20000 })
await sleep(500)
await page.keyboard.type('ETH')
await page.keyboard.press('Enter')
const pausedAt = (line) => page.waitForFunction((line) => {
  const s = window.__debugger_store.getState().session
  return s?.state === 'paused' && s.frames[s.selectedFrame]?.line === line
}, { timeout: 20000 }, line)
await pausedAt(bpLine)
await page.waitForSelector('.ij-debug-var')
const vars = await page.$$eval('.ij-debug-var .ij-tree-label', (els) => els.map((e) => e.textContent))
if (!vars.includes('name = "ETH"')) throw new Error(`debugger variables: ${vars.join(' | ')}`)
await page.waitForSelector('.monaco-editor .ij-exec-line')
await page.waitForSelector('.monaco-editor .ij-inline-value')
await shot('02a-debug-paused')
await page.keyboard.press('F8') // step over -> for loop
await pausedAt(bpLine + 1)
await page.keyboard.press('F8') // -> loop body
await pausedAt(bpLine + 2)
await page.click('.ij-debug-var .ij-tree-chevron img') // expand the first expandable node
await sleep(300)
await shot('02b-debug-stepped')
await (await lineNumber(bpLine)).click() // remove the breakpoint
await page.keyboard.press('F9')
await page.waitForFunction(() => document.querySelector('.ij-debug .ij-console')?.textContent?.includes('Process finished with exit code 0'), { timeout: 20000 })

// completion: type "sout" in main and expand with Tab
await page.click('.monaco-editor .view-lines')
await page.evaluate(() => {
  const ed = window.__ide_editor
  ed?.setPosition({ lineNumber: 13, column: 1 })
})
await page.keyboard.press('End')
await page.keyboard.press('Enter')
await page.keyboard.type('sout')
await sleep(600)
await shot('03-completion')
await page.keyboard.press('Tab')
await page.keyboard.type('"hi"')
await sleep(200)

// light theme
await page.evaluate(() => window.__ide_store?.getState().setTheme('islands-light'))
await sleep(500)
await shot('04-light')

// context menu in project view + main menu
await page.evaluate(() => window.__ide_store?.getState().setTheme('islands-dark'))
await page.click('.ij-main-toolbar .ij-tb-icon')
await sleep(200)
await page.hover('.ij-menu-item:nth-child(1)')
await sleep(300)
await shot('05-menu')
await page.keyboard.press('Escape')

// compile error: remove a semicolon and run
await page.evaluate(() => {
  const ed = window.__ide_editor
  const m = ed.getModel()
  m.setValue(m.getValue().replace('String name = scanner.nextLine();', 'String name = scanner.nextLine()\n        int x = undefinedVar;'))
})
await sleep(400)
await page.keyboard.down('Shift')
await page.keyboard.press('F10')
await page.keyboard.up('Shift')
await page.waitForFunction(() => document.querySelector('.ij-console')?.textContent?.includes('Compilation failed'), { timeout: 20000 })
await sleep(500)
await shot('06-compile-error')

// runtime exception with clickable stack trace
await page.evaluate(() => {
  window.__ide_store.getState().resetProject()
})
await sleep(300)
await page.evaluate(() => {
  const s = window.__ide_store.getState()
  s.createFile('src/Crash.java', 'public class Crash {\n    public static void main(String[] args) {\n        int[] a = new int[3];\n        System.out.println(a[5]);\n    }\n}\n')
  s.openFile('src/Crash.java')
})
await sleep(500)
await page.keyboard.down('Control')
await page.keyboard.down('Shift')
await page.keyboard.press('F10')
await page.keyboard.up('Shift')
await page.keyboard.up('Control')
await page.waitForFunction(() => document.querySelector('.ij-console')?.textContent?.includes('exit code 1'), { timeout: 20000 })
await sleep(300)
await shot('07-exception')

// new class popup
await page.evaluate(() => window.__ide_store && document.querySelector('.ij-tree')?.focus())
await page.evaluate(() => {
  /* open via action registry exposed through the main menu */
})
await page.click('.ij-main-toolbar .ij-tb-icon')
await page.hover('.ij-menu-item:nth-child(1)')
await sleep(200)
await page.hover('.ij-menu .ij-menu + .ij-menu .ij-menu-item:nth-child(1)').catch(() => {})
await sleep(200)
await page.keyboard.press('Escape')
await page.keyboard.down('Shift')
await page.keyboard.up('Shift')
await page.keyboard.down('Shift')
await page.keyboard.up('Shift')
await sleep(300)
await page.keyboard.type('fib')
await sleep(300)
await shot('08-search-everywhere')
await page.keyboard.press('Escape')

// live diagnostics: an unresolved symbol turns red without running
await page.evaluate(() => {
  const s = window.__ide_store.getState()
  s.resetProject()
  s.openFile('src/Main.java')
})
await sleep(300)
await page.evaluate(() => {
  const m = window.__ide_editor.getModel()
  m.setValue(m.getValue().replace('String name = scanner.nextLine();', 'String name = scanner.nextLine();\n        int z = undefinedVar;'))
})
await page.waitForSelector('.monaco-editor .ij-wrong-ref', { timeout: 15000 })
await sleep(200)
await shot('09-live-diagnostics')

// practice task: open the first task, solve it, check it
await page.evaluate(() => window.__ide_store.setState({ rightTool: 'task' }))
await page.waitForSelector('.ij-course-continue')
await page.click('.ij-course-continue')
await page.waitForFunction(() => window.__ide_store.getState().projectId === 'task:w03-hello')
await sleep(500)
await page.evaluate(() => {
  const m = window.__ide_editor.getModel()
  m.setValue(m.getValue().replace('// TODO: print the two lines from the task description', 'System.out.println("Hello, ETH!");\n        System.out.println("Welcome to EProg.");'))
})
await sleep(400)
await page.click('.ij-check-buttons .ij-button.default')
await page.waitForSelector('.ij-check-result.correct', { timeout: 30000 })
await sleep(500)
await shot('10-task-solved')

// everything above was saved to the account: a reload restores the solved task project from the server
await sleep(1500)
await page.reload({ waitUntil: 'load' })
await page.waitForSelector('.monaco-editor .view-lines')
if ((await page.evaluate(() => window.__ide_store.getState().projectId)) !== 'task:w03-hello') throw new Error('workspace was not restored from the server')
if (await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('eprog-ide')))) throw new Error('IDE state must not stay in localStorage')

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
