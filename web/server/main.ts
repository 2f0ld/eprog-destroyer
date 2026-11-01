/**
 * Production server: serves the built app (dist/) behind the login wall plus the accounts API.
 *   npm run build && npm start      (PORT, PUBLIC_URL, DATA_DIR; see docs/DECISIONS.md D24)
 * Java execution is not included: /api/run, /api/compile and /api/debug answer 503 until the M3 sandbox exists
 * (the DEV-ONLY runner must never be deployed).
 */
import http from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AccountDb } from './db.ts'
import { DevMailer } from './mailer.ts'
import { createAccounts } from './api.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const port = Number(process.env.PORT ?? 8080)
const publicUrl = process.env.PUBLIC_URL
if (!publicUrl) {
  console.error('PUBLIC_URL must be set (e.g. https://eprog.example.ch); it is used for links in e-mails.')
  process.exit(1)
}

const db = new AccountDb(path.join(process.env.DATA_DIR ?? path.join(root, '.data'), 'eprog.sqlite'))
// TODO(M6): real SMTP provider. Until then mails are only logged, which is fine for a closed test only.
const mailer = new DevMailer()
console.warn('No mail provider configured: verification and reset links are written to this log.')
const accounts = createAccounts({ db, mailer, publicUrl, secureCookies: publicUrl.startsWith('https:'), dev: false })
setInterval(() => db.purge(), 3600_000).unref()

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' }

async function sendFile(res: http.ServerResponse, file: string, cache: string) {
  const s = await stat(file).catch(() => null)
  if (!s?.isFile()) {
    res.writeHead(404).end('Not found')
    return
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Content-Length': s.size,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  })
  createReadStream(file).pipe(res)
}

http
  .createServer(async (req, res) => {
    try {
      const p = accounts.page(req)
      if (p && 'redirect' in p) return void res.writeHead(302, { Location: p.redirect, 'Cache-Control': 'no-store' }).end()
      if (p) return sendFile(res, path.join(dist, p.serve === 'auth' ? 'auth.html' : 'index.html'), 'no-store')
      if (await accounts.handle(req, res)) return
      const url = decodeURIComponent((req.url ?? '/').split('?')[0])
      if (url.startsWith('/api/')) return void res.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'runner-unavailable' }))
      const file = path.join(dist, url)
      if (!file.startsWith(dist + path.sep)) return void res.writeHead(400).end()
      return sendFile(res, file, url.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
    } catch (e) {
      console.error(e)
      if (!res.headersSent) res.writeHead(500).end()
    }
  })
  .listen(port, () => console.log(`EProg Practice on ${publicUrl} (port ${port})`))
