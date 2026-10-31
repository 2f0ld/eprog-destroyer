/**
 * A small, fault-tolerant Java analyzer.
 *
 * This is NOT a full parser. It tokenizes Java source and runs a single pass
 * with heuristics that are good enough to reproduce IntelliJ's highlighting
 * (method declarations, fields, static members, type parameters) and to
 * extract an outline (classes, methods, fields, main methods) for the gutter
 * run icons and the Structure tool window. It must never throw on broken code,
 * since students type incomplete programs all the time.
 *
 * Milestone 3+ may replace this with real compiler diagnostics from javac.
 */

export type TokKind = 'ident' | 'keyword' | 'punct' | 'number' | 'string' | 'char'

export interface Tok {
  kind: TokKind
  text: string
  line: number // 0-based
  col: number // 0-based, in UTF-16 code units
  offset: number
}

const KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'true', 'false', 'null',
])
// contextual keywords that may also be identifiers
const PRIMITIVES = new Set(['boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void'])
const MODIFIERS = new Set([
  'public', 'protected', 'private', 'static', 'final', 'abstract', 'native', 'synchronized',
  'transient', 'volatile', 'strictfp', 'default', 'sealed', 'non-sealed',
])
const TYPE_DECL = new Set(['class', 'interface', 'enum', 'record'])

const PUNCT3 = ['>>>=', '<<=', '>>=', '>>>', '...', '->', '::', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<']

export function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  let line = 0
  let lineStart = 0
  const n = src.length
  const push = (kind: TokKind, start: number, end: number, l = line, ls = lineStart) =>
    toks.push({ kind, text: src.slice(start, end), line: l, col: start - ls, offset: start })

  while (i < n) {
    const c = src[i]
    if (c === '\n') {
      i++
      line++
      lineStart = i
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f') {
      i++
      continue
    }
    // comments
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') {
          line++
          lineStart = i + 1
        }
        i++
      }
      i += 2
      continue
    }
    // text block
    if (c === '"' && src.startsWith('"""', i)) {
      const start = i
      const l = line
      const ls = lineStart
      i += 3
      while (i < n && !src.startsWith('"""', i)) {
        if (src[i] === '\\') i++
        else if (src[i] === '\n') {
          line++
          lineStart = i + 1
        }
        i++
      }
      i = Math.min(n, i + 3)
      push('string', start, i, l, ls)
      continue
    }
    if (c === '"' || c === "'") {
      const start = i
      i++
      while (i < n && src[i] !== c && src[i] !== '\n') {
        if (src[i] === '\\') i++
        i++
      }
      if (src[i] === c) i++
      push(c === '"' ? 'string' : 'char', start, i)
      continue
    }
    if (/[A-Za-z_$]/.test(c) || c.charCodeAt(0) > 127) {
      const start = i
      while (i < n && (/[\w$]/.test(src[i]) || src.charCodeAt(i) > 127)) i++
      const text = src.slice(start, i)
      if (text === 'non' && src.startsWith('-sealed', i)) {
        i += 7
        push('keyword', start, i)
      } else push(KEYWORDS.has(text) ? 'keyword' : 'ident', start, i)
      continue
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const start = i
      while (i < n && /[\w.]/.test(src[i])) {
        if ((src[i] === 'e' || src[i] === 'E') && (src[i + 1] === '+' || src[i + 1] === '-')) i++
        i++
      }
      push('number', start, i)
      continue
    }
    const p = PUNCT3.find((s) => src.startsWith(s, i))
    if (p) {
      push('punct', i, i + p.length)
      i += p.length
      continue
    }
    push('punct', i, i + 1)
    i++
  }
  return toks
}

export type SemKind =
  | 'method.declaration'
  | 'method.static'
  | 'property'
  | 'property.static'
  | 'property.static.readonly'
  | 'typeParameter'

export interface SemToken {
  line: number
  col: number
  length: number
  kind: SemKind
}

export interface OutlineMember {
  kind: 'method' | 'constructor' | 'field'
  name: string
  line: number
  col: number
  isStatic: boolean
  isFinal: boolean
  visibility: 'public' | 'protected' | 'private' | 'package'
  /** for methods: rough signature like "main(String[])" ; for fields: type */
  detail: string
  isMain?: boolean
}

export interface OutlineClass {
  kind: 'class' | 'interface' | 'enum' | 'record'
  name: string
  line: number
  col: number
  isAbstract: boolean
  members: OutlineMember[]
  hasMain: boolean
}

export interface Analysis {
  tokens: Tok[]
  semantic: SemToken[]
  classes: OutlineClass[]
  packageName: string | null
}

type Ctx = 'class' | 'enum-constants' | 'method' | 'block' | 'array'

interface FieldInfo {
  isStatic: boolean
  isFinal: boolean
}

const isTypeish = (t: Tok | undefined) =>
  !!t &&
  ((t.kind === 'ident' && t.text !== 'return') ||
    (t.kind === 'keyword' && PRIMITIVES.has(t.text)) ||
    t.text === '>' ||
    t.text === '>>' ||
    t.text === '>>>' ||
    t.text === ']' ||
    t.text === '...')

export function analyze(src: string): Analysis {
  const toks = tokenize(src)
  const sem: SemToken[] = []
  const classes: OutlineClass[] = []
  let packageName: string | null = null

  const mark = (t: Tok, kind: SemKind) => sem.push({ line: t.line, col: t.col, length: t.text.length, kind })

  // ---- pass 1: structure (classes, fields, methods, scopes) ----
  const stack: { ctx: Ctx; cls?: OutlineClass; fields?: Map<string, FieldInfo>; locals?: Set<string>; typeParams?: Set<string> }[] = []
  const fieldsOf = new Map<OutlineClass, Map<string, FieldInfo>>()
  const staticMethodsOf = new Map<OutlineClass, Set<string>>()
  let pendingTypeDecl: { cls: OutlineClass } | null = null
  let pendingMethodLocals: Set<string> | null = null
  let parenDepth = 0
  let stmtStart = 0 // index of first token of the current statement / member declaration
  const declaredAt = new Set<number>() // token indices that are declarations (skip in pass 2 for field usage)
  const fieldDeclTokens = new Map<number, SemKind>()

  const top = () => stack[stack.length - 1]
  const currentClass = () => {
    for (let k = stack.length - 1; k >= 0; k--) if (stack[k].cls) return stack[k].cls
    return undefined
  }
  const visibilityOf = (from: number, to: number): OutlineMember['visibility'] => {
    for (let k = from; k < to; k++) {
      const x = toks[k].text
      if (x === 'public' || x === 'protected' || x === 'private') return x
    }
    return 'package'
  }
  const hasMod = (from: number, to: number, m: string) => {
    for (let k = from; k < to; k++) if (toks[k].text === m) return true
    return false
  }

  // per-token scope snapshot for pass 2
  const scopeAt: { fields?: Map<string, FieldInfo>; locals?: Set<string>; typeParams: Set<string>; cls?: OutlineClass }[] = []
  const typeParamsGlobal = new Set<string>()

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    const prev = toks[i - 1]
    const next = toks[i + 1]
    const fr = top()
    const ctx = fr?.ctx

    // package / import statements
    if (t.text === 'package' && t.kind === 'keyword') {
      let j = i + 1
      const parts: string[] = []
      while (j < toks.length && toks[j].text !== ';') parts.push(toks[j++].text)
      packageName = parts.join('')
      i = j
      stmtStart = j + 1
      scopeAt.length = Math.max(scopeAt.length, j + 1)
      continue
    }
    if (t.text === 'import' && t.kind === 'keyword' && !fr) {
      let j = i + 1
      while (j < toks.length && toks[j].text !== ';') j++
      i = j
      stmtStart = j + 1
      continue
    }

    // locals live in the nearest method frame
    let localsFrame: Set<string> | undefined
    for (let k = stack.length - 1; k >= 0; k--) {
      if (stack[k].locals) {
        localsFrame = stack[k].locals
        break
      }
      if (stack[k].ctx === 'class') break
    }
    scopeAt[i] = { fields: currentClass() ? fieldsOf.get(currentClass()!) : undefined, locals: localsFrame, typeParams: typeParamsGlobal, cls: currentClass() }

    // type declarations
    if (t.kind === 'keyword' && TYPE_DECL.has(t.text) || (t.kind === 'ident' && t.text === 'record' && next?.kind === 'ident' && toks[i + 2]?.text === '(') || (t.kind === 'ident' && t.text === 'enum' && next?.kind === 'ident')) {
      if (next && next.kind === 'ident' && prev?.text !== '.') {
        const kind = t.text as OutlineClass['kind']
        const cls: OutlineClass = {
          kind,
          name: next.text,
          line: next.line,
          col: next.col,
          isAbstract: hasMod(stmtStart, i, 'abstract'),
          members: [],
          hasMain: false,
        }
        classes.push(cls)
        fieldsOf.set(cls, new Map())
        staticMethodsOf.set(cls, new Set())
        pendingTypeDecl = { cls }
        declaredAt.add(i + 1)
        // generic type params: class Foo<T, U extends X>
        if (toks[i + 2]?.text === '<') {
          let depth = 0
          for (let j = i + 2; j < toks.length; j++) {
            const x = toks[j]
            if (x.text === '<') depth++
            else if (x.text === '>') depth--
            else if (x.text === '>>') depth -= 2
            if (depth <= 0) break
            if (x.kind === 'ident' && (toks[j - 1].text === '<' || toks[j - 1].text === ',') && depth === 1) {
              typeParamsGlobal.add(x.text)
            }
          }
        }
        // record components become fields
        if (kind === 'record' && toks[i + 2]?.text === '(') {
          let depth = 0
          for (let j = i + 2; j < toks.length; j++) {
            const x = toks[j]
            if (x.text === '(') depth++
            else if (x.text === ')') {
              depth--
              if (depth === 0) break
            } else if (x.kind === 'ident' && depth === 1 && (toks[j + 1]?.text === ',' || toks[j + 1]?.text === ')') && isTypeish(toks[j - 1])) {
              fieldsOf.get(cls)!.set(x.text, { isStatic: false, isFinal: true })
              fieldDeclTokens.set(j, 'property')
              cls.members.push({ kind: 'field', name: x.text, line: x.line, col: x.col, isStatic: false, isFinal: true, visibility: 'private', detail: toks[j - 1].text })
            }
          }
        }
      }
      continue
    }

    if (t.text === '(') parenDepth++
    if (t.text === ')') parenDepth = Math.max(0, parenDepth - 1)

    if (t.text === '{') {
      if (pendingTypeDecl) {
        const cls = pendingTypeDecl.cls
        stack.push({ ctx: cls.kind === 'enum' ? 'enum-constants' : 'class', cls, fields: fieldsOf.get(cls) })
        pendingTypeDecl = null
      } else if (prev?.text === '=' || prev?.text === ']' || prev?.text === '{' && ctx === 'array' || (prev?.text === ',' && ctx === 'array')) {
        stack.push({ ctx: 'array' })
      } else if (ctx === 'class' || ctx === 'enum-constants') {
        // method body, constructor body or initializer
        stack.push({ ctx: 'method', locals: pendingMethodLocals ?? new Set() })
        pendingMethodLocals = null
      } else if (prev?.text === ')' && isAnonymousClassStart(toks, i)) {
        const outer = currentClass()
        const cls: OutlineClass = { kind: 'class', name: '', line: t.line, col: t.col, isAbstract: false, members: [], hasMain: false }
        fieldsOf.set(cls, new Map(outer ? fieldsOf.get(outer) : undefined))
        staticMethodsOf.set(cls, new Set())
        stack.push({ ctx: 'class', cls, fields: fieldsOf.get(cls) })
      } else {
        stack.push({ ctx: 'block', locals: localsFrame ? new Set(localsFrame) : undefined })
      }
      stmtStart = i + 1
      continue
    }
    if (t.text === '}') {
      stack.pop()
      stmtStart = i + 1
      continue
    }
    if (t.text === ';') {
      if (ctx === 'enum-constants') fr.ctx = 'class'
      stmtStart = i + 1
      if (ctx === 'class') pendingMethodLocals = null
      continue
    }

    const cls = currentClass()

    // enum constants
    if (ctx === 'enum-constants' && t.kind === 'ident' && parenDepth === 0 && (prev?.text === '{' || prev?.text === ',' || prev?.kind === 'punct' && prev.text === '}' ) && cls) {
      fieldsOf.get(cls)!.set(t.text, { isStatic: true, isFinal: true })
      fieldDeclTokens.set(i, 'property.static.readonly')
      declaredAt.add(i)
      cls.members.push({ kind: 'field', name: t.text, line: t.line, col: t.col, isStatic: true, isFinal: true, visibility: 'public', detail: cls.name })
      continue
    }

    // class-level member declarations
    if ((ctx === 'class' || ctx === 'enum-constants') && cls && parenDepth === 0 && t.kind === 'ident') {
      // method / constructor
      if (next?.text === '(' && (isTypeish(prev) || prev?.kind === 'keyword' && MODIFIERS.has(prev.text) || prev?.text === '}' || prev?.text === ';' || prev?.text === '{' || i === stmtStart)) {
        const isCtor = t.text === cls.name && !isTypeish(prev)
        const isStatic = hasMod(stmtStart, i, 'static')
        mark(t, 'method.declaration')
        declaredAt.add(i)
        // parameters
        const params = new Set<string>()
        const paramTypes: string[] = []
        // split the parameter list on top-level commas: each part is "[final] [@Ann] Type name"
        let depth = 0
        let angle = 0
        let part: number[] = []
        const flush = () => {
          const idx = part.filter((k) => !(toks[k].text === 'final' || toks[k].text === '@' || toks[k - 1]?.text === '@'))
          if (idx.length >= 2 && toks[idx[idx.length - 1]].kind === 'ident') {
            const nameIdx = idx[idx.length - 1]
            params.add(toks[nameIdx].text)
            declaredAt.add(nameIdx)
            paramTypes.push(idx.slice(0, -1).map((k) => toks[k].text).join(''))
          }
          part = []
        }
        for (let j = i + 1; j < toks.length; j++) {
          const x = toks[j].text
          if (x === '(') {
            if (++depth === 1) continue
          } else if (x === ')') {
            if (--depth === 0) {
              flush()
              break
            }
          } else if (x === '<') angle++
          else if (x === '>') angle--
          else if (x === '>>') angle -= 2
          else if (x === ',' && depth === 1 && angle <= 0) {
            flush()
            continue
          } else if (x === '{' || x === ';') break
          if (depth >= 1) part.push(j)
        }
        pendingMethodLocals = params
        // return type: tokens between modifiers / leading <T> type parameters and the name
        let rs = stmtStart
        while (rs < i && (toks[rs].kind === 'keyword' && MODIFIERS.has(toks[rs].text) || toks[rs].text === '@' || toks[rs - 1]?.text === '@')) rs++
        if (toks[rs]?.text === '<') {
          let depth = 0
          for (; rs < i; rs++) {
            if (toks[rs].text === '<') depth++
            else if (toks[rs].text === '>') depth--
            else if (toks[rs].text === '>>') depth -= 2
            if (depth <= 0) {
              rs++
              break
            }
          }
        }
        const retType = toks.slice(rs, i).map((x) => x.text).join('').replace(/,/g, ', ')
        const isMain =
          t.text === 'main' &&
          isStatic &&
          paramTypes.length === 1 &&
          /^String(\[\]|\.\.\.)$/.test(paramTypes[0]) &&
          /void$/.test(retType)
        const isMainNoArgs = t.text === 'main' && paramTypes.length === 0 && /void$/.test(retType) // Java 25 instance main
        if (isMain || (isMainNoArgs && !cls.members.some((m) => m.isMain))) cls.hasMain = true
        if (isStatic) staticMethodsOf.get(cls)!.add(t.text)
        cls.members.push({
          kind: isCtor ? 'constructor' : 'method',
          name: t.text,
          line: t.line,
          col: t.col,
          isStatic,
          isFinal: hasMod(stmtStart, i, 'final'),
          visibility: visibilityOf(stmtStart, i),
          detail: `(${paramTypes.join(', ')})${isCtor ? '' : ': ' + retType}`,
          isMain: isMain || isMainNoArgs,
        })
        // generic method type params: <T> void foo(...)
        for (let k = stmtStart; k < i; k++) {
          if (toks[k].text === '<' && (k === stmtStart || toks[k - 1].kind === 'keyword')) {
            for (let m = k + 1; m < i && toks[m].text !== '>'; m++) if (toks[m].kind === 'ident' && (toks[m - 1].text === '<' || toks[m - 1].text === ',')) typeParamsGlobal.add(toks[m].text)
          }
        }
        continue
      }
      // field
      if ((next?.text === '=' || next?.text === ';' || next?.text === ',' || next?.text === '[') && (isTypeish(prev) || prev?.text === ',')) {
        // for "int a, b;" make sure the statement actually started with a type
        const isStatic = hasMod(stmtStart, i, 'static')
        const isFinal = hasMod(stmtStart, i, 'final') || cls.kind === 'interface'
        const staticReal = isStatic || cls.kind === 'interface'
        if (prev?.text === ',' && !stmtLooksLikeFieldDecl(toks, stmtStart, i)) continue
        const kind: SemKind = staticReal && isFinal ? 'property.static.readonly' : staticReal ? 'property.static' : 'property'
        fieldsOf.get(cls)!.set(t.text, { isStatic: staticReal, isFinal })
        fieldDeclTokens.set(i, kind)
        declaredAt.add(i)
        const typeToks = toks.slice(stmtStart, i).filter((x) => !(x.kind === 'keyword' && MODIFIERS.has(x.text)))
        let typeStr = ''
        for (const x of typeToks) {
          if (x.text === ',' || x.text === '=') break
          typeStr += x.text
        }
        cls.members.push({ kind: 'field', name: t.text, line: t.line, col: t.col, isStatic: staticReal, isFinal, visibility: visibilityOf(stmtStart, i), detail: typeStr })
        continue
      }
    }

    // local variable declarations
    if ((ctx === 'method' || ctx === 'block') && t.kind === 'ident' && localsFrame) {
      const nx = next?.text
      if ((nx === '=' || nx === ';' || nx === ',' || nx === ':' || nx === ')' || nx === '[') && isTypeish(prev) && !(prev?.kind === 'ident' && nx === ')' && parenDepth === 0)) {
        // exclude things like "a < b)" or method calls "foo(x)" where prev is "(" (not typeish anyway)
        if (!(prev?.text === '>' && toks[i - 2]?.kind !== 'ident' && toks[i - 2]?.kind !== 'keyword')) {
          localsFrame.add(t.text)
          declaredAt.add(i)
        }
      } else if (nx === '->' && (prev?.text === '(' || prev?.text === ',' || prev?.text === '=' || prev?.text === 'return')) {
        localsFrame.add(t.text) // lambda parameter
      } else if (nx === ',' && toks[i - 1]?.text === '(' ) {
        // (a, b) -> lambda params
        let j = i
        while (j < toks.length && toks[j].text !== ')') j++
        if (toks[j + 1]?.text === '->') for (let k = i; k < j; k++) if (toks[k].kind === 'ident') localsFrame.add(toks[k].text)
      }
    }
  }

  // ---- pass 2: usages ----
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.kind !== 'ident') continue
    const fd = fieldDeclTokens.get(i)
    if (fd) {
      mark(t, fd)
      continue
    }
    const scope = scopeAt[i]
    if (!scope) continue
    const prev = toks[i - 1]
    const prev2 = toks[i - 2]
    const next = toks[i + 1]
    if (scope.typeParams.has(t.text) && !declaredAt.has(i) && /^[A-Z]\w{0,2}$/.test(t.text)) {
      mark(t, 'typeParameter')
      continue
    }
    if (declaredAt.has(i)) continue
    const isCall = next?.text === '('
    const qualifiedByType = prev?.text === '.' && prev2?.kind === 'ident' && /^[A-Z]/.test(prev2.text) && !(toks[i - 3]?.text === '.' && /^[a-z]/.test(prev2.text))
    if (isCall) {
      if (qualifiedByType && /^[a-z_$]/.test(t.text)) mark(t, 'method.static')
      else if (prev?.text !== '.' && prev?.text !== 'new' && scope.cls && staticMethodsOf.get(scope.cls)?.has(t.text)) mark(t, 'method.static')
      continue
    }
    if (prev?.text === '.') {
      if (qualifiedByType && !/^[A-Z][a-z]/.test(t.text) && next?.text !== '.' ) {
        mark(t, /^[A-Z][A-Z0-9_]*$/.test(t.text) ? 'property.static.readonly' : 'property.static')
      } else if (qualifiedByType && /^[a-z]/.test(t.text)) {
        mark(t, 'property.static') // e.g. System.out.println -> "out"
      } else if (prev2?.text === 'this' && scope.fields?.has(t.text)) {
        const f = scope.fields.get(t.text)!
        mark(t, f.isStatic ? (f.isFinal ? 'property.static.readonly' : 'property.static') : 'property')
      } else if (scope.fields?.has(t.text) && next?.text !== '(') {
        // obj.field where field is declared in this class (e.g. other.x in equals/distanceTo)
        const f = scope.fields.get(t.text)!
        mark(t, f.isStatic ? (f.isFinal ? 'property.static.readonly' : 'property.static') : 'property')
      } else if (t.text === 'length' && next?.text !== '(') {
        mark(t, 'property') // array.length
      }
      continue
    }
    if (scope.fields?.has(t.text) && !scope.locals?.has(t.text)) {
      const f = scope.fields.get(t.text)!
      mark(t, f.isStatic ? (f.isFinal ? 'property.static.readonly' : 'property.static') : 'property')
    }
  }

  sem.sort((a, b) => a.line - b.line || a.col - b.col)
  // dedupe identical positions
  const out: SemToken[] = []
  for (const s of sem) {
    const last = out[out.length - 1]
    if (last && last.line === s.line && last.col === s.col) continue
    out.push(s)
  }
  return { tokens: toks, semantic: out, classes, packageName }
}

function stmtLooksLikeFieldDecl(toks: Tok[], from: number, to: number) {
  // first non-modifier tokens should be "Type ident"
  let k = from
  while (k < to && (toks[k].kind === 'keyword' && MODIFIERS.has(toks[k].text) || toks[k].text === '@')) k++
  return k + 1 < to && isTypeish(toks[k]) && !toks.slice(from, to).some((x) => x.text === '(')
}

function isAnonymousClassStart(toks: Tok[], braceIdx: number) {
  // walk back over balanced parens to see "new Type(...) {"
  let depth = 0
  for (let k = braceIdx - 1; k >= 0; k--) {
    const x = toks[k].text
    if (x === ')') depth++
    else if (x === '(') {
      depth--
      if (depth === 0) {
        let m = k - 1
        while (m >= 0 && (toks[m].kind === 'ident' || toks[m].text === '.' || toks[m].text === '<' || toks[m].text === '>')) m--
        return toks[m]?.text === 'new'
      }
    }
  }
  return false
}
