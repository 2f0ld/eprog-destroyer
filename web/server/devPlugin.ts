/**
 * Accounts in `npm run dev`: the same handler as production, mounted into Vite before the dev runner, so
 * the runner, compile and debug endpoints are behind the login wall too. Data lives in web/.data/ (gitignored),
 * mails go to the outbox page /dev/mail and the terminal.
 */
import path from 'node:path'
import type { Plugin } from 'vite'
import { AccountDb } from './db.ts'
import { DevMailer } from './mailer.ts'
import { createAccounts } from './api.ts'

export function accountsDev(): Plugin {
  let root = ''
  return {
    name: 'eprog-accounts-dev',
    apply: 'serve',
    configResolved(cfg) {
      root = cfg.root
    },
    configureServer(server) {
      const db = new AccountDb(process.env.EPROG_DB ?? path.join(root, '.data', 'eprog.sqlite'))
      const mailer = new DevMailer((msg) => server.config.logger.info(msg))
      const accounts = createAccounts({ db, mailer, secureCookies: false, dev: true })
      db.purge()
      const timer = setInterval(() => db.purge(), 3600_000)
      server.httpServer?.on('close', () => clearInterval(timer))

      server.middlewares.use(async (req, res, next) => {
        const p = accounts.page(req)
        if (p && 'redirect' in p) {
          res.writeHead(302, { Location: p.redirect, 'Cache-Control': 'no-store' })
          return res.end()
        }
        if (p?.serve === 'auth') req.url = '/auth.html' // Vite's HTML middleware serves the auth app
        if (await accounts.handle(req, res)) return
        next()
      })
    },
  }
}
