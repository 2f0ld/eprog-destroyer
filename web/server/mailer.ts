/**
 * Outgoing mail. Development keeps mails in an outbox (shown at /dev/mail) and prints them to the server
 * console; no SMTP. Production needs a real provider (M6) — until then main.ts uses the console mailer.
 */

export interface Mail {
  to: string
  subject: string
  text: string
  /** the action link in the mail (verification / reset), for the dev outbox */
  link?: string
  at: number
}

export interface Mailer {
  send(mail: Omit<Mail, 'at'>): Promise<void>
}

export class DevMailer implements Mailer {
  outbox: Mail[] = []
  log: (msg: string) => void
  constructor(log: (msg: string) => void = console.log) {
    this.log = log
  }
  async send(mail: Omit<Mail, 'at'>) {
    this.outbox.unshift({ ...mail, at: Date.now() })
    this.outbox.length = Math.min(this.outbox.length, 50)
    this.log(`\n[dev mail] to ${mail.to}: ${mail.subject}${mail.link ? `\n  ${mail.link}` : ''}\n`)
  }
}
