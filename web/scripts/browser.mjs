// Launches a headless browser for smoke/inspect: system Firefox (Linux) or, if absent, Chrome (macOS etc.).
// The profile always lives in web/.e2e-profile so nothing is written outside the repo.
import puppeteer from 'puppeteer-core'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const FIREFOX = ['/usr/lib64/firefox/firefox', '/usr/lib/firefox/firefox']
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']

export async function launch() {
  const profile = path.join(root, '.e2e-profile')
  mkdirSync(profile, { recursive: true })
  const firefox = process.env.FIREFOX ?? FIREFOX.find(existsSync)
  const common = { headless: true, userDataDir: profile, defaultViewport: { width: 1600, height: 960 } }
  if (firefox && !process.env.CHROME) {
    // the real binary, not Fedora's /usr/bin/firefox wrapper (which writes to ~/.config/mozilla)
    return puppeteer.launch({ ...common, browser: 'firefox', executablePath: firefox,
      env: { ...process.env, MOZ_CRASHREPORTER_DISABLE: '1', HOME: profile } })
  }
  const chrome = process.env.CHROME ?? CHROME.find(existsSync)
  if (!chrome) throw new Error('No Firefox or Chrome found; set FIREFOX or CHROME to a browser binary')
  // Puppeteer's default Chrome flags make current Chrome builds exit ~2s after launch, so pass a minimal set.
  const browser = await puppeteer.launch({ ...common, browser: 'chrome', executablePath: chrome, ignoreDefaultArgs: true,
    args: ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
      '--no-default-browser-check', '--window-size=1600,960', 'about:blank'] })
  return browser
}
