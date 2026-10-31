// Smoke test / screenshot tool. Drives the system Firefox via WebDriver BiDi.
//   node scripts/smoke.mjs [url]        (dev server must be running)
// Screenshots land in web/.e2e-shots/. The browser profile lives in web/.e2e-profile/.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const url = process.argv[2] ?? 'http://localhost:5173/'
const shots = path.join(root, '.e2e-shots')
const profile = path.join(root, '.e2e-profile')
mkdirSync(shots, { recursive: true })
mkdirSync(profile, { recursive: true })

const browser = await puppeteer.launch({
  browser: 'firefox',
  // the real binary, not Fedora's /usr/bin/firefox wrapper (which writes to ~/.config/mozilla)
  executablePath: process.env.FIREFOX ?? '/usr/lib64/firefox/firefox',
  env: { ...process.env, MOZ_CRASHREPORTER_DISABLE: '1', HOME: profile },
  headless: true,
  userDataDir: profile,
  defaultViewport: { width: 1600, height: 960 },
})
const page = await browser.newPage()
const errors = []
let step = 'load'
page.on('pageerror', (e) => errors.push(`[${step}] ${e} ${e?.stack ?? ''}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`[${step}] ${m.text()}`))

const shot = (name) => (step = name) && page.screenshot({ path: path.join(shots, `${name}.png`) })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await page.goto(url, { waitUntil: 'load' })
await page.evaluate(() => localStorage.clear())
await page.goto(url, { waitUntil: 'load' })
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

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors')
await browser.close()
