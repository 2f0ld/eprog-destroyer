import { launch, root } from './browser.mjs'
const browser = await launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', String(e), e.stack))
page.on('console', (m) => m.type() !== 'timeStamp' && console.log('CONSOLE', m.type(), m.text()))
await page.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'load' })
await new Promise(r => setTimeout(r, 6000))
await page.screenshot({ path: root + '/.e2e-shots/dbg.png' })
await browser.close()
