/**
 * Turns javac diagnostics into what IntelliJ shows in the editor, and adds the
 * "unused" inspections that IntelliJ runs on the fly.
 *
 * - Messages use IntelliJ's wording (JavaErrorBundle / InspectionsBundle), e.g.
 *   "Cannot resolve symbol 'x'" instead of javac's "cannot find symbol".
 * - Ranges cover what IntelliJ underlines (the identifier, the whole initializer,
 *   the call expression, ...), not just javac's caret column.
 * - `highlight` decides the look: unresolved references are red text
 *   (WRONG_REFERENCES_ATTRIBUTES), other errors get the red wave (ERRORS_ATTRIBUTES),
 *   unused code is greyed (NOT_USED_ELEMENT_ATTRIBUTES).
 */
import { buildSymbols, type SymbolTable } from './symbols.ts'

export interface JavacDiagnostic {
  file: string
  line: number
  column: number
  severity: 'error' | 'warning'
  message: string
  code?: string
  args?: string[]
}

export type Highlight = 'error' | 'wrongRef' | 'warning' | 'unused'

export interface Problem {
  path: string
  /** 1-based, like Monaco */
  line: number
  column: number
  endLine: number
  endColumn: number
  severity: 'error' | 'warning'
  message: string
  highlight: Highlight
  /** javac key or inspection id, used by quick fixes */
  code?: string
  /** the unresolved / unused name, if any */
  name?: string
}

const kindWord = (k: string) => k.replace(/^kindname\./, '')
/** "(compiler.misc.inconvertible.types: int, java.lang.String)" -> ["int", "java.lang.String"] */
const miscArgs = (a: string | undefined) => {
  const m = /^\(?compiler\.misc\.[\w.]+:\s*(.*?)\)?$/.exec(a ?? '')
  return m ? splitTop(m[1]) : []
}
const miscKey = (a: string | undefined) => /compiler\.misc\.([\w.]+)/.exec(a ?? '')?.[1] ?? ''
function splitTop(s: string) {
  const out: string[] = []
  let d = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '<' || ch === '[') d++
    else if (ch === ')' || ch === '>' || ch === ']') d--
    if (ch === ',' && d === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
const countParams = (s: string) => (!s || s === 'compiler.misc.no.args' ? 0 : splitTop(s).length)
const argList = (s: string) => (!s || s === 'compiler.misc.no.args' ? '()' : `(${splitTop(s).join(', ')})`)
const simpleName = (fqn: string) => fqn.replace(/^(?:[a-z_$][\w$]*\.)+(?=[A-Z])/, '')
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

type RangeKind = 'ident' | 'expr' | 'call' | 'binary' | 'before' | 'statement' | 'char' | 'lineEnd' | 'args' | 'lastChar'

interface Translation {
  message: string
  range: RangeKind
  highlight?: Highlight
  name?: string
}

/** IntelliJ wording + highlighting for a javac diagnostic key. */
export function translate(code: string, args: string[], fallback: string): Translation {
  const a = args
  switch (code.replace(/^compiler\.(err|warn)\./, '')) {
    case 'cant.resolve':
    case 'cant.resolve.location': {
      const kind = kindWord(a[0])
      const name = a[1]
      if (kind === 'class' || kind === 'variable' || kind === 'package') return { message: `Cannot resolve symbol '${name}'`, range: 'ident', highlight: 'wrongRef', name }
      return { message: `Cannot resolve symbol '${name}'`, range: 'ident', highlight: 'wrongRef', name }
    }
    case 'cant.resolve.args':
    case 'cant.resolve.location.args': {
      const name = a[1]
      const loc = miscArgs(a[4])
      const where = loc[1] ? ` in '${simpleName(loc[1])}'` : ''
      return { message: `Cannot resolve method '${name}'${where}`, range: 'ident', highlight: 'wrongRef', name }
    }
    case 'cant.apply.symbol': {
      // kind, name, paramTypes, argTypes, kindOfOwner, owner, reason
      const [kind, name, params, found, , owner, reason] = a
      const isCtor = kindWord(kind) === 'constructor'
      if (miscKey(reason) === 'arg.length.mismatch') {
        const want = countParams(params)
        return { message: `Expected ${plural(want, 'argument')} but found ${countParams(found)}`, range: 'args' }
      }
      const sig = `${isCtor ? simpleName(owner) : name}(${splitTop(params === 'compiler.misc.no.args' ? '' : params).map(simpleName).join(', ')})`
      return { message: `'${sig}' in '${simpleName(owner)}' cannot be applied to '${argList(found)}'`, range: 'args' }
    }
    case 'cant.apply.symbols': {
      const name = a[1]
      return { message: `Cannot resolve method '${name}${argList(a[2])}'`, range: 'ident', highlight: 'wrongRef', name }
    }
    case 'prob.found.req': {
      const k = miscKey(a[0])
      const t = miscArgs(a[0])
      if ((k === 'inconvertible.types' || k === 'possible.loss.of.precision') && t.length === 2) {
        return { message: `Incompatible types. Found: '${t[0]}', required: '${t[1]}'`, range: 'expr' }
      }
      if (k === 'incompatible.ret.type.in.lambda') return { message: 'Bad return type in lambda expression', range: 'expr' }
      return { message: capitalize(fallback), range: 'expr' }
    }
    case 'incomparable.types':
      return { message: `Operator '==' cannot be applied to '${a[0]}', '${a[1]}'`, range: 'binary' }
    case 'operator.cant.be.applied':
      return { message: `Operator '${a[0]}' cannot be applied to '${a[1]}'`, range: 'expr' }
    case 'operator.cant.be.applied.1':
      return { message: `Operator '${a[0]}' cannot be applied to '${a[1]}', '${a[2]}'`, range: 'binary' }
    case 'cant.assign.val.to.var':
    case 'cant.assign.val.to.final.var':
      return { message: `Cannot assign a value to final variable '${a[a.length - 1]}'`, range: 'ident' }
    case 'already.defined': {
      const kind = kindWord(a[0])
      if (kind === 'variable') return { message: `Variable '${a[1]}' is already defined in the scope`, range: 'ident' }
      if (kind === 'method') return { message: `'${a[1]}' is already defined in '${simpleName(a[3] ?? '')}'`, range: 'ident' }
      return { message: `Duplicate class: '${a[1]}'`, range: 'ident' }
    }
    case 'non-static.cant.be.ref': {
      const kind = kindWord(a[0])
      return kind === 'method'
        ? { message: `Non-static method '${a[1]}' cannot be referenced from a static context`, range: 'ident' }
        : { message: `Non-static field '${a[1]}' cannot be referenced from a static context`, range: 'ident' }
    }
    case 'var.might.not.have.been.initialized':
      return { message: `Variable '${a[0]}' might not have been initialized`, range: 'ident' }
    case 'var.might.already.be.assigned':
      return { message: `Variable '${a[0]}' might already have been assigned to`, range: 'ident' }
    case 'missing.ret.stmt':
      return { message: 'Missing return statement', range: 'char' }
    case 'unreachable.stmt':
      return { message: 'Unreachable statement', range: 'statement' }
    case 'unreported.exception.need.to.catch.or.throw':
      return { message: `Unhandled exception: ${a[0]}`, range: 'call' }
    case 'unreported.exception.default.constructor':
      return { message: `Unhandled exception: ${a[0]}`, range: 'ident' }
    case 'array.req.but.found':
      return { message: `Array type expected; found: '${a[0]}'`, range: 'ident' }
    case 'cant.deref':
      return { message: `Cannot call methods on primitive type '${a[0]}'`, range: 'ident' }
    case 'expected':
      return { message: `${a[0]} expected`, range: 'before' }
    case 'expected2':
      return { message: `${a[0]} or ${a[1]} expected`, range: 'before' }
    case 'expected3':
      return { message: `${a[0]}, ${a[1]} or ${a[2]} expected`, range: 'before' }
    case 'expected4':
      return { message: `${a.slice(0, 3).join(', ')} or ${a[3]} expected`, range: 'before' }
    case 'premature.eof':
      return { message: "'}' expected", range: 'lastChar' }
    case 'not.stmt':
      return { message: 'Not a statement', range: 'statement' }
    case 'illegal.start.of.expr':
      return { message: 'Expression expected', range: 'char' }
    case 'illegal.start.of.type':
      return { message: 'Type expected', range: 'char' }
    case 'illegal.start.of.stmt':
      return { message: 'Statement expected', range: 'char' }
    case 'unclosed.str.lit':
      return { message: 'Illegal line end in string literal', range: 'lineEnd' }
    case 'unclosed.char.lit':
      return { message: 'Unclosed character literal', range: 'lineEnd' }
    case 'empty.char.lit':
      return { message: 'Empty character literal', range: 'char' }
    case 'unclosed.comment':
      return { message: 'Unclosed comment', range: 'lineEnd' }
    case 'else.without.if':
      return { message: "'else' without 'if'", range: 'ident' }
    case 'class.public.should.be.in.file':
      return { message: `Class '${a[1]}' is public, should be declared in a file named '${a[1]}.java'`, range: 'ident' }
    case 'missing.meth.body.or.decl.abstract':
      return { message: 'Missing method body, or declare abstract', range: 'ident' }
    case 'does.not.override.abstract':
      return { message: `Class '${simpleName(a[0])}' must either be declared abstract or implement abstract method '${a[1]}' in '${simpleName(a[2])}'`, range: 'ident' }
    case 'abstract.cant.be.instantiated':
      return { message: `'${simpleName(a[0])}' is abstract; cannot be instantiated`, range: 'call' }
    case 'ref.ambiguous':
      return { message: `Ambiguous method call: both '${a[1]}' and '${a[5] ?? ''}' match`, range: 'ident' }
    case 'call.must.be.first.stmt.in.ctor':
      return { message: `Call to '${a[0]}()' must be first statement in constructor body`, range: 'call' }
    case 'break.outside.switch.loop':
      return { message: 'Break outside switch or loop', range: 'statement' }
    case 'cont.outside.loop':
      return { message: 'Continue outside of loop', range: 'statement' }
    case 'ret.outside.meth':
      return { message: 'Return outside method', range: 'statement' }
    case 'void.not.allowed.here':
    case 'illegal.start.of.void':
      return { message: "'void' type not allowed here", range: 'call' }
    case 'report.access':
      return { message: `'${a[0]}' has ${a[1]} access in '${simpleName(a[2])}'`, range: 'ident' }
    case 'not.def.public.cant.access':
      return { message: `'${a[0]}' is not public in '${simpleName(a[1])}'. Cannot be accessed from outside package`, range: 'ident' }
    case 'duplicate.class':
      return { message: `Duplicate class: '${simpleName(a[0])}'`, range: 'ident' }
    case 'mod.not.allowed.here':
      return { message: `Modifier '${a[0]}' not allowed here`, range: 'ident' }
    case 'invalid.meth.decl.ret.type.req':
      return { message: 'Invalid method declaration; return type required', range: 'ident' }
    case 'int.number.too.large':
      return { message: 'Integer number too large', range: 'ident' }
    case 'div.zero':
      return { message: 'Division by zero', range: 'binary', highlight: 'warning' }
    default:
      return { message: capitalize(fallback.split('\n')[0]), range: 'ident' }
  }
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

/** Convert a javac diagnostic into an editor problem for `src`. */
export function toProblem(d: JavacDiagnostic, src: string): Problem {
  const tr = d.code ? translate(d.code, d.args ?? [], d.message) : { message: capitalize(d.message.split('\n')[0]), range: 'ident' as RangeKind }
  const lines = src.split('\n')
  const line = Math.max(1, Math.min(d.line, lines.length))
  const text = lines[line - 1] ?? ''
  const col = Math.max(1, Math.min(d.column, text.length + 1)) // 1-based
  const [start, end] = rangeFor(tr.range, text, col, lines, line)
  const highlight = tr.highlight ?? (d.severity === 'warning' ? 'warning' : 'error')
  let lineOut = line
  let s = start
  let e = end
  if (tr.range === 'lastChar') {
    // end of file: last non-empty line, last character
    let l = lines.length
    while (l > 1 && !lines[l - 1].trim()) l--
    lineOut = l
    e = lines[l - 1].length + 1
    s = Math.max(1, e - 1)
  }
  return { path: d.file, line: lineOut, column: s, endLine: lineOut, endColumn: Math.max(e, s + 1), severity: highlight === 'warning' ? 'warning' : 'error', message: tr.message, highlight, code: d.code, name: tr.name }
}

const isId = (c: string | undefined) => !!c && /[\w$]/.test(c)

/** [startCol, endCol) for a range kind, 1-based columns on `text`. */
function rangeFor(kind: RangeKind, text: string, col: number, _lines: string[], _line: number): [number, number] {
  const i = col - 1 // 0-based
  const identFrom = (k: number): [number, number] | null => {
    let s = k
    while (s < text.length && !isId(text[s]) && (text[s] === '.' || text[s] === ' ')) s++
    if (!isId(text[s])) return null
    while (s > 0 && isId(text[s - 1])) s--
    let e = s
    while (e < text.length && isId(text[e])) e++
    return [s + 1, e + 1]
  }
  /** end of an expression starting at k: stop at , ; ) } at depth 0 */
  const exprEnd = (k: number) => {
    let d = 0
    let inStr: string | null = null
    for (let j = k; j < text.length; j++) {
      const c = text[j]
      if (inStr) {
        if (c === '\\') j++
        else if (c === inStr) inStr = null
        continue
      }
      if (c === '"' || c === "'") inStr = c
      else if (c === '(' || c === '[' || c === '{') d++
      else if (c === ')' || c === ']' || c === '}') {
        if (d === 0) return j
        d--
      } else if ((c === ',' || c === ';') && d === 0) return j
    }
    return text.length
  }
  const trimEnd = (s: number, e: number) => {
    while (e > s && text[e - 1] === ' ') e--
    return e
  }
  const exprStart = (k: number) => {
    // walk left over an operand: identifiers, dots, balanced (...) / [...], string literals
    let j = k
    while (j > 0) {
      const c = text[j - 1]
      if (isId(c) || c === '.') j--
      else if (c === ')' || c === ']') {
        const open = c === ')' ? '(' : '['
        let d = 0
        let m = j - 1
        for (; m >= 0; m--) {
          if (text[m] === c) d++
          else if (text[m] === open && --d === 0) break
        }
        if (m < 0) break
        j = m
      } else if (c === '"') {
        let m = j - 2
        while (m >= 0 && text[m] !== '"') m--
        if (m < 0) break
        j = m
      } else break
    }
    return j
  }
  switch (kind) {
    case 'ident':
      return identFrom(i) ?? [col, col + 1]
    case 'expr': {
      let s = i
      while (s < text.length && text[s] === ' ') s++
      return [s + 1, trimEnd(s, exprEnd(s)) + 1]
    }
    case 'call': {
      // javac points at "(" (or the name); underline "receiver.name(args)"
      let k = i
      if (text[k] !== '(') {
        const id = identFrom(k)
        if (!id) return [col, col + 1]
        k = id[1] - 1
        while (text[k] === ' ') k++
      }
      const s = exprStart(k)
      let e = k
      if (text[k] === '(') {
        let d = 0
        for (; e < text.length; e++) {
          if (text[e] === '(') d++
          else if (text[e] === ')' && --d === 0) break
        }
        e++
      }
      return [s + 1, Math.min(e, text.length) + 1]
    }
    case 'args': {
      // javac points at the method name (or the "." before it): underline the argument list
      const id = identFrom(i)
      let k = id ? id[1] - 1 : i
      while (text[k] === ' ') k++
      if (text[k] !== '(') return id ?? [col, col + 1]
      let d = 0
      let e = k
      for (; e < text.length; e++) {
        if (text[e] === '(') d++
        else if (text[e] === ')' && --d === 0) break
      }
      return [k + 1, Math.min(e + 1, text.length) + 1]
    }
    case 'binary': {
      // javac points at the operator: underline "left op right"
      let s = i
      while (s > 0 && text[s - 1] === ' ') s--
      s = exprStart(s)
      let opEnd = i
      while (opEnd < text.length && /[=!<>&|+\-*/%^]/.test(text[opEnd])) opEnd++
      while (opEnd < text.length && text[opEnd] === ' ') opEnd++
      let e = opEnd
      // right operand: identifier chain, literal or parenthesized
      const rest = exprEnd(e)
      const m = /^(\s*[\w$."']+(?:\([^()]*\))?)/.exec(text.slice(e, rest))
      e = m ? e + m[1].length : rest
      return [s + 1, trimEnd(s, e) + 1]
    }
    case 'before': {
      // "';' expected" sits at the end of the previous token: highlight its last character
      let k = i
      while (k > 0 && (text[k - 1] === ' ' || k > text.length)) k--
      if (k === 0) return [1, Math.max(2, text.length + 1)]
      return [k, k + 1]
    }
    case 'statement': {
      let s = i
      while (s < text.length && text[s] === ' ') s++
      let e = exprEnd(s)
      if (text[e] === ';') e++
      return [s + 1, Math.max(s + 1, e) + 1]
    }
    case 'lineEnd':
      return [col, Math.max(col + 1, text.length + 1)]
    case 'char':
    case 'lastChar':
    default:
      return [col, col + 1]
  }
}

/**
 * IntelliJ's on-the-fly "unused" inspections that need no compiler:
 * unused imports, never-used locals, private fields and private methods.
 */
export function unusedProblems(path: string, src: string, table: SymbolTable = buildSymbols(src)): Problem[] {
  const out: Problem[] = []
  const { tokens } = table
  const pos = (k: number) => ({ line: tokens[k].line + 1, column: tokens[k].col + 1 })
  const used = new Set<string>()
  const importToks = new Set<number>()
  for (const im of table.imports) for (let k = im.start; k <= im.end; k++) importToks.add(k)
  tokens.forEach((t, k) => {
    if (t.kind === 'ident' && !importToks.has(k)) used.add(t.text)
  })
  // Javadoc {@link Foo} keeps imports alive in IntelliJ
  for (const m of src.matchAll(/\{@link(?:plain)?\s+([A-Za-z_$][\w$]*)/g)) used.add(m[1])

  const seenImports = new Set<string>()
  for (const im of table.imports) {
    const start = pos(im.start)
    const endTok = tokens[im.end]
    const unused =
      seenImports.has(im.path) ||
      (im.simple !== '*' && !used.has(im.simple)) ||
      (!im.isStatic && im.simple !== '*' && im.path === `java.lang.${im.simple}`) ||
      (!im.isStatic && im.path === 'java.lang.*') ||
      (table.packageName !== null && !im.isStatic && im.simple !== '*' && im.path === `${table.packageName}.${im.simple}`)
    seenImports.add(im.path)
    if (!unused) continue
    out.push({ path, line: start.line, column: start.column, endLine: endTok.line + 1, endColumn: endTok.col + 2, severity: 'warning', message: 'Unused import statement', highlight: 'unused', code: 'UNUSED_IMPORT' })
  }

  for (const s of table.symbols) {
    if (s.decl < 0 || !s.name) continue
    const reads = s.refs.length - s.writes.length
    let message: string | null = null
    if (s.kind === 'local') {
      if (s.refs.length === 0) message = `Variable '${s.name}' is never used`
      else if (reads === 0) message = `Variable '${s.name}' is assigned but never accessed`
    } else if (s.kind === 'field' && s.isPrivate) {
      if (s.refs.length === 0) message = `Private field '${s.name}' is never used`
      else if (reads === 0) message = `Private field '${s.name}' is assigned but never accessed`
    } else if (s.kind === 'method' && s.isPrivate && s.refs.length === 0 && !hasMemberUse(table, s.name)) {
      message = `Private method '${s.name}(${(s.paramTypes ?? []).join(', ')})' is never used`
    }
    if (!message) continue
    const p = pos(s.decl)
    out.push({ path, line: p.line, column: p.column, endLine: p.line, endColumn: p.column + s.name.length, severity: 'warning', message, highlight: 'unused', code: 'UNUSED_SYMBOL', name: s.name })
  }
  return out
}

function hasMemberUse(table: SymbolTable, name: string) {
  return table.members.some((m) => m.name === name)
}

/** Javac diagnostics for all files -> problems, plus unused inspections for the given files. */
export function collectProblems(diags: JavacDiagnostic[], files: Record<string, string>): Problem[] {
  const out: Problem[] = []
  for (const d of diags) {
    const src = files[d.file]
    if (src === undefined) continue
    out.push(toProblem(d, src))
  }
  for (const [p, src] of Object.entries(files)) {
    if (p.endsWith('.java')) out.push(...unusedProblems(p, src))
  }
  return out
}
