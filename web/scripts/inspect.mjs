import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: process.env.FIREFOX ?? '/usr/lib64/firefox/firefox', env: { ...process.env, MOZ_CRASHREPORTER_DISABLE: '1', HOME: new URL('../', import.meta.url).pathname + '.e2e-profile' }, headless: true, userDataDir: new URL('../', import.meta.url).pathname + '.e2e-profile', defaultViewport: { width: 1600, height: 960 } })
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e), e.stack))
page.on('console', (m) => m.type() !== 'timeStamp' && console.log('CONSOLE', m.type(), m.text()))
await page.goto('http://localhost:5173/', { waitUntil: 'load' })
await new Promise(r => setTimeout(r, 6000))
await page.screenshot({ path: new URL('../', import.meta.url).pathname + '.e2e-shots/dbg.png' })
await browser.close()
