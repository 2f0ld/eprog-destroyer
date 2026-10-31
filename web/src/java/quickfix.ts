/**
 * Alt+Enter quick fixes for the problems produced by diagnostics.ts, as plain text edits.
 * Texts follow IntelliJ's intention names ("Import class", "Add exception to method signature", ...).
 */
import type { Problem } from './diagnostics.ts'
import { JDK } from './jdk.ts'

export interface TextEdit {
  offset: number
  length: number
  text: string
}

export interface QuickFix {
  title: string
  edits: TextEdit[]
  /** run an editor command instead of / after the edits */
  command?: string
  isPreferred?: boolean
}

const lineStart = (src: string, line: number) => {
  let off = 0
  for (let l = 1; l < line; l++) {
    const nl = src.indexOf('\n', off)
    if (nl < 0) return src.length
    off = nl + 1
  }
  return off
}

/** Edit that adds `import fqn;` in IntelliJ's position (after package / with the other imports). */
export function importEditFor(src: string, fqn: string): TextEdit | null {
  const pkg = fqn.slice(0, fqn.lastIndexOf('.'))
  const esc = (s: string) => s.replace(/\./g, '\\.')
  if (new RegExp(`^\\s*import\\s+(${esc(fqn)}|${esc(pkg)}\\.\\*)\\s*;`, 'm').test(src)) return null
  const lines = src.split('\n')
  let lastImport = -1
  let pkgLine = -1
  lines.forEach((l, i) => {
    if (/^\s*import\s/.test(l)) lastImport = i
    if (/^\s*package\s/.test(l)) pkgLine = i
  })
  if (lastImport >= 0) {
    // keep the java.* group sorted: insert before the first import that sorts after it
    let at = lastImport + 1
    for (let i = 0; i <= lastImport; i++) {
      const m = /^\s*import\s+(?!static)([\w.]+)\s*;/.exec(lines[i])
      if (m && m[1].startsWith('java') === fqn.startsWith('java') && m[1] > fqn) {
        at = i
        break
      }
    }
    return { offset: lineStart(src, at + 1), length: 0, text: `import ${fqn};\n` }
  }
  if (pkgLine >= 0) return { offset: lineStart(src, pkgLine + 2), length: 0, text: `\nimport ${fqn};\n` }
  return { offset: 0, length: 0, text: `import ${fqn};\n\n` }
}

export function quickFixesFor(src: string, p: Problem): QuickFix[] {
  const fixes: QuickFix[] = []
  const lines = src.split('\n')
  if (p.highlight === 'wrongRef' && p.name && /^[A-Z]/.test(p.name)) {
    const cls = JDK[p.name]
    if (cls && cls.pkg !== 'java.lang') {
      const e = importEditFor(src, `${cls.pkg}.${p.name}`)
      if (e) fixes.push({ title: 'Import class', edits: [e], isPreferred: true })
    }
  }
  if (p.code === 'compiler.err.unreported.exception.need.to.catch.or.throw') {
    const exc = /Unhandled exception: ([\w.$]+)/.exec(p.message)?.[1]
    const sig = exc && findEnclosingMethodBrace(lines, p.line)
    if (exc && sig) {
      const simple = exc.slice(exc.lastIndexOf('.') + 1)
      const head = lines[sig.line - 1].slice(0, sig.col).trimEnd()
      const edits: TextEdit[] = /\bthrows\s+[\w.,\s]+$/.test(head)
        ? [{ offset: lineStart(src, sig.line) + head.length, length: 0, text: `, ${simple}` }]
        : [{ offset: lineStart(src, sig.line) + sig.col, length: 0, text: `throws ${simple} ` }]
      if (!exc.startsWith('java.lang.')) {
        const imp = importEditFor(src, exc)
        if (imp) edits.push(imp)
      }
      fixes.push({ title: 'Add exception to method signature', edits, isPreferred: true })
    }
  }
  if (p.code === 'UNUSED_IMPORT') fixes.push({ title: 'Optimize imports', edits: [], command: 'ij.optimizeImports', isPreferred: true })
  if (p.code === 'UNUSED_SYMBOL' && p.name && /^Variable '/.test(p.message)) {
    const text = lines[p.line - 1] ?? ''
    // only whole-line declarations without side effects in the initializer
    const m = new RegExp(`^\\s*(final\\s+)?[\\w<>\\[\\], .?]+\\s+${p.name}\\s*(=\\s*([^;()]*|new [\\w<>\\[\\]]+\\([^()]*\\)))?;\\s*$`).exec(text)
    if (m) fixes.push({ title: `Remove local variable '${p.name}'`, edits: [{ offset: lineStart(src, p.line), length: text.length + 1, text: '' }] })
  }
  if (p.code === 'compiler.err.expected' && /^';' expected/.test(p.message)) {
    fixes.push({ title: "Insert ';'", edits: [{ offset: lineStart(src, p.line) + p.endColumn - 1, length: 0, text: ';' }] })
  }
  return fixes
}

/** Position of the `{` that opens the method containing `line` (1-based), scanning backwards. */
function findEnclosingMethodBrace(lines: string[], line: number): { line: number; col: number } | null {
  let depth = 0
  for (let l = line - 1; l >= 0; l--) {
    const text = lines[l]
    for (let c = text.length - 1; c >= 0; c--) {
      if (text[c] === '}') depth++
      else if (text[c] === '{') {
        if (depth > 0) depth--
        else {
          const head = text.slice(0, c)
          if (/\)\s*(throws\s+[\w.,\s]+)?\s*$/.test(head) && !/^\s*(if|for|while|switch|catch|synchronized|else)\b/.test(head.trim()) && !/\b(if|for|while|switch|catch)\s*\(/.test(head)) return { line: l + 1, col: c }
        }
      }
    }
  }
  return null
}
