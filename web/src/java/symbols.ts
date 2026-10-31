/**
 * Scope-aware symbol resolution on top of the tokenizer.
 *
 * Like analyzer.ts this is heuristic and must never throw on broken code. It answers
 * "what does this identifier refer to?" well enough for student-sized programs, which is
 * what Rename (Shift+F6), unused-symbol greying, Optimize Imports and Go to Declaration need:
 *  - locals, parameters, lambda / catch / for / pattern variables with their block scopes
 *  - fields, methods and constructors of classes (incl. nested, local and anonymous classes)
 *  - qualified member access (`obj.field`, `obj.method()`) resolved through declared types
 *  - class references and import statements
 */
import { tokenize, type Tok } from './analyzer.ts'

export type SymKind = 'local' | 'param' | 'field' | 'method' | 'ctor' | 'class'

export interface Sym {
  name: string
  kind: SymKind
  /** token index of the declaring identifier */
  decl: number
  /** declared type (variables, fields), return type (methods), '' otherwise */
  type: string
  /** name of the class that declares this member / encloses this local ('' for anonymous) */
  owner: string
  isPrivate: boolean
  isStatic: boolean
  /** methods / constructors: parameter count (-1 for varargs) */
  arity?: number
  /** methods: parameter types, for messages like "foo(int)" */
  paramTypes?: string[]
  /** locals / params: last token index where the variable is visible */
  scopeEnd?: number
  /** token indices of usages (not including the declaration) */
  refs: number[]
  /** subset of refs that are plain writes (`x = ...`), for "assigned but never accessed" */
  writes: number[]
}

export interface ImportDecl {
  /** token index of `import` and of the terminating `;` */
  start: number
  end: number
  path: string // e.g. "java.util.Scanner" or "java.util.*"
  isStatic: boolean
  /** simple name for single-type imports ("Scanner"), '*' for wildcards */
  simple: string
}

export interface MemberAccess {
  tok: number
  name: string
  isCall: boolean
  argc: number
  /** declared type of the receiver if known (simple class name), else null */
  recvType: string | null
  /** receiver is a class name (static access) */
  isStaticRecv: boolean
}

export interface SymbolTable {
  tokens: Tok[]
  symbols: Sym[]
  /** token index -> symbol it declares or references */
  refOf: Map<number, Sym>
  /** `x.name` accesses that could not be resolved within the file */
  members: MemberAccess[]
  /** token index -> referenced class name, for uppercase identifiers used as types */
  classRefs: Map<number, string>
  imports: ImportDecl[]
  packageName: string | null
}

const PRIMITIVES = new Set(['boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void'])
const MODIFIERS = new Set(['public', 'protected', 'private', 'static', 'final', 'abstract', 'native', 'synchronized', 'transient', 'volatile', 'strictfp', 'default', 'sealed', 'non-sealed'])
const NOT_A_TYPE = new Set(['return', 'new', 'throw', 'case', 'else', 'yield', 'assert'])

interface Scope {
  kind: 'class' | 'block'
  names: Map<string, Sym>
  methods?: Map<string, Sym[]>
  cls?: Sym
  parent: Scope | null
}

export function buildSymbols(src: string): SymbolTable {
  const toks = tokenize(src)
  const n = toks.length
  const symbols: Sym[] = []
  const refOf = new Map<number, Sym>()
  const members: MemberAccess[] = []
  const classRefs = new Map<number, string>()
  const imports: ImportDecl[] = []
  const declTok = new Set<number>()
  let packageName: string | null = null

  // ---- bracket matching ----
  const match = new Int32Array(n).fill(-1)
  {
    const st: number[] = []
    for (let i = 0; i < n; i++) {
      const x = toks[i].text
      if (x === '(' || x === '{' || x === '[') st.push(i)
      else if (x === ')' || x === '}' || x === ']') {
        const want = x === ')' ? '(' : x === '}' ? '{' : '['
        // tolerate broken nesting: pop until the matching opener
        let k = st.length - 1
        while (k >= 0 && toks[st[k]].text !== want) k--
        if (k >= 0) {
          match[st[k]] = i
          match[i] = st[k]
          st.length = k
        }
      }
    }
  }
  const close = (i: number) => (match[i] >= 0 ? match[i] : n - 1)
  const text = (i: number) => toks[i]?.text
  const isIdent = (i: number) => toks[i]?.kind === 'ident'

  /** closing `>` of a generic argument list starting at `<` (index), or -1 */
  const angleEnd = (i: number) => {
    let d = 0
    for (let k = i; k < n; k++) {
      const x = text(k)
      if (x === '<') d++
      else if (x === '>') d--
      else if (x === '>>') d -= 2
      else if (x === '>>>') d -= 3
      else if (!(isIdent(k) || x === ',' || x === '.' || x === '?' || x === '[' || x === ']' || x === '&' || x === '@' || (toks[k].kind === 'keyword' && (PRIMITIVES.has(x) || x === 'extends' || x === 'super')))) return -1
      if (d <= 0) return k
    }
    return -1
  }
  /** Does the token before `i` end a type ("int", "String", "List<X>", "int[]", "T...")? */
  const endsType = (i: number) => {
    const p = toks[i - 1]
    if (!p) return false
    if (p.kind === 'ident') return !NOT_A_TYPE.has(p.text)
    if (p.kind === 'keyword') return PRIMITIVES.has(p.text) && p.text !== 'void'
    if (p.text === ']') return text(i - 2) === '['
    if (p.text === '...') return true
    if (p.text === '>' || p.text === '>>' || p.text === '>>>') {
      // walk back to the matching '<' and require "Ident<...>"
      let d = 0
      for (let k = i - 1; k >= 0; k--) {
        const x = text(k)
        if (x === '>') d++
        else if (x === '>>') d += 2
        else if (x === '>>>') d += 3
        else if (x === '<') d--
        else if (!(isIdent(k) || x === ',' || x === '.' || x === '?' || x === '[' || x === ']' || x === '&' || (toks[k].kind === 'keyword' && (PRIMITIVES.has(x) || x === 'extends' || x === 'super')))) return false
        if (d === 0) return isIdent(k - 1)
      }
    }
    return false
  }
  /** Text of the type that ends right before token `i`. */
  const typeBefore = (i: number) => {
    let k = i - 1
    let d = 0
    const parts: string[] = []
    while (k >= 0) {
      const x = text(k)
      if (x === '>' || x === '>>' || x === '>>>') d += x.length
      else if (x === '<') d--
      if (d > 0 || x === '<' || x === ']' || x === '[' || x === '...' || x === '>' || x === '>>' || x === '>>>' || x === ',' && d > 0) {
        parts.unshift(x)
        k--
        continue
      }
      if (isIdent(k) || (toks[k].kind === 'keyword' && PRIMITIVES.has(x))) {
        parts.unshift(x)
        if (text(k - 1) === '.' && isIdent(k - 2)) {
          parts.unshift('.')
          k -= 2
          continue
        }
      }
      break
    }
    return parts.join('').replace(/,/g, ', ')
  }
  const simpleType = (t: string) => t.replace(/<.*$/s, '').replace(/(\[\]|\.\.\.)+$/, '').replace(/^.*\./, '')

  const newSym = (name: string, kind: SymKind, decl: number, extra: Partial<Sym> = {}): Sym => {
    const s: Sym = { name, kind, decl, type: '', owner: '', isPrivate: false, isStatic: false, refs: [], writes: [], ...extra }
    symbols.push(s)
    if (decl >= 0) {
      refOf.set(decl, s)
      declTok.add(decl)
    }
    return s
  }
  const lookupVar = (scope: Scope | null, name: string, at: number): Sym | undefined => {
    for (let s = scope; s; s = s.parent) {
      const v = s.names.get(name)
      if (v && (s.kind === 'class' || v.decl < at)) return v
    }
    return undefined
  }
  const lookupMethod = (scope: Scope | null, name: string, argc: number): Sym | undefined => {
    for (let s = scope; s; s = s.parent) {
      const list = s.methods?.get(name)
      if (list?.length) return list.find((m) => m.arity === argc || m.arity === -1) ?? list[0]
    }
    return undefined
  }
  const enclosingClass = (scope: Scope | null) => {
    for (let s = scope; s; s = s.parent) if (s.kind === 'class') return s
    return null
  }
  const argCount = (open: number) => {
    const end = close(open)
    if (end === open + 1) return 0
    let c = 1
    let d = 0
    for (let k = open + 1; k < end; k++) {
      const x = text(k)
      if (x === '(' || x === '[' || x === '{') d++
      else if (x === ')' || x === ']' || x === '}') d--
      else if (x === '<') {
        const e = angleEnd(k)
        if (e > 0 && isIdent(k - 1) && /^[A-Z]/.test(text(k - 1))) k = e
      } else if (x === ',' && d === 0) c++
    }
    return c
  }

  // classes declared anywhere in this file (for type resolution of `obj.member`)
  const classByName = new Map<string, Scope>()

  /** Parse "(Type a, final Type b)" parameter lists into [nameTok, type] pairs. */
  const parseParams = (open: number) => {
    const end = close(open)
    const out: { tok: number; type: string }[] = []
    let part: number[] = []
    let angle = 0
    const flush = () => {
      const idx = part.filter((k) => !(text(k) === 'final' || text(k) === '@' || text(k - 1) === '@'))
      const last = idx[idx.length - 1]
      if (idx.length >= 2 && isIdent(last)) out.push({ tok: last, type: typeBefore(last) })
      part = []
    }
    for (let k = open + 1; k < end; k++) {
      const x = text(k)
      if (x === '<') angle++
      else if (x === '>') angle--
      else if (x === '>>') angle -= 2
      if (x === ',' && angle <= 0) flush()
      else part.push(k)
    }
    flush()
    return out
  }

  /** Index of the `{` that starts a type body after its name (skips generics, extends, implements, record header). */
  const findBody = (from: number) => {
    for (let k = from; k < n; k++) {
      const x = text(k)
      if (x === '{') return k
      if (x === '(') k = close(k)
      else if (x === ';' || x === '}') return -1
    }
    return -1
  }

  const regions: { start: number; end: number; scope: Scope; params?: { tok: number; type: string }[]; owner: string }[] = []

  /** Declare the members of a class body and queue its code regions. */
  const scanClassBody = (open: number, cls: Sym, parent: Scope | null, recordParams?: { tok: number; type: string }[]) => {
    const end = close(open)
    const scope: Scope = { kind: 'class', names: new Map(), methods: new Map(), cls, parent }
    if (cls.name) classByName.set(cls.name, scope)
    for (const p of recordParams ?? []) {
      const f = newSym(text(p.tok), 'field', p.tok, { type: p.type, owner: cls.name, isPrivate: true })
      scope.names.set(f.name, f)
    }
    let stmt = open + 1
    let i = open + 1
    const isEnum = cls.type === 'enum'
    if (isEnum) {
      // enum constants up to the first ';'
      for (; i < end; i++) {
        const x = text(i)
        if (x === ';') {
          i++
          break
        }
        if (isIdent(i) && (text(i - 1) === '{' || text(i - 1) === ',')) {
          const c = newSym(text(i), 'field', i, { type: cls.name, owner: cls.name, isStatic: true })
          scope.names.set(c.name, c)
        }
        if (x === '(') {
          regions.push({ start: i, end: close(i), scope, owner: cls.name })
          i = close(i)
        } else if (x === '{') {
          const anon = newSym('', 'class', -1, { owner: cls.name })
          scanClassBody(i, anon, scope)
          i = close(i)
        }
      }
      stmt = i
    }
    for (; i < end; i++) {
      const t = toks[i]
      const x = t.text
      if (x === ';') {
        stmt = i + 1
        continue
      }
      if (x === '@' && isIdent(i + 1)) {
        i++
        if (text(i + 1) === '(') i = close(i + 1)
        if (stmt === i - 1 || stmt <= i) stmt = i + 1
        continue
      }
      if (x === '{') {
        // initializer block
        const scopeB: Scope = { kind: 'block', names: new Map(), parent: scope }
        regions.push({ start: i, end: close(i), scope: scopeB, owner: cls.name })
        i = close(i)
        stmt = i + 1
        continue
      }
      if (x === '}') {
        stmt = i + 1
        continue
      }
      const typeKw = (t.kind === 'keyword' && (x === 'class' || x === 'interface' || x === 'enum')) || (x === 'record' && isIdent(i + 1) && text(i + 2) !== '=' && text(i + 2) !== ';')
      if (typeKw && isIdent(i + 1)) {
        i = declareType(i, scope, stmt)
        stmt = i + 1
        continue
      }
      if (t.kind !== 'ident') continue
      const mods = toks.slice(stmt, i).map((k) => k.text)
      if (text(i + 1) === '(' && (i === stmt || endsType(i) || text(i - 1) === 'void' || MODIFIERS.has(text(i - 1)) || text(i - 1) === '>' && text(stmt) === '<' || mods.every((m) => MODIFIERS.has(m)))) {
        // method or constructor
        const isCtor = x === cls.name && !endsType(i)
        const params = parseParams(i + 1)
        const varargs = params.some((p) => p.type.endsWith('...'))
        const m = newSym(x, isCtor ? 'ctor' : 'method', i, {
          type: isCtor ? '' : typeBefore(i),
          owner: cls.name,
          isPrivate: mods.includes('private'),
          isStatic: mods.includes('static'),
          arity: varargs ? -1 : params.length,
          paramTypes: params.map((p) => p.type),
        })
        const list = scope.methods!.get(x) ?? []
        list.push(m)
        scope.methods!.set(x, list)
        let k = close(i + 1) + 1
        while (k < end && text(k) !== '{' && text(k) !== ';') k++
        if (text(k) === '{') {
          regions.push({ start: k, end: close(k), scope: { kind: 'block', names: new Map(), parent: scope }, params, owner: cls.name })
          i = close(k)
        } else i = k
        for (const p of params) declTok.add(p.tok)
        stmt = i + 1
        continue
      }
      const nx = text(i + 1)
      if ((nx === '=' || nx === ';' || nx === ',' || nx === '[') && (endsType(i) || text(i - 1) === ',' && fieldStmt(stmt, i))) {
        const k0 = text(i - 1) === ',' ? fieldTypeEnd(stmt) : i
        const f = newSym(x, 'field', i, {
          type: typeBefore(k0),
          owner: cls.name,
          isPrivate: mods.includes('private'),
          isStatic: mods.includes('static') || cls.type === 'interface',
        })
        scope.names.set(x, f)
        if (nx === '=') {
          // initializer expression up to ',' or ';' at depth 0
          let k = i + 2
          for (; k < end; k++) {
            const y = text(k)
            if (y === '(' || y === '{' || y === '[') k = close(k)
            else if (y === ',' || y === ';') break
          }
          regions.push({ start: i + 2, end: k - 1, scope: { kind: 'block', names: new Map(), parent: scope }, owner: cls.name })
          i = k - 1
        }
      }
    }
    return scope
  }
  const fieldStmt = (stmt: number, i: number) => {
    for (let k = stmt; k < i; k++) if (text(k) === '(' || text(k) === '{') return false
    return fieldTypeEnd(stmt) > 0
  }
  const fieldTypeEnd = (stmt: number) => {
    let k = stmt
    while (MODIFIERS.has(text(k)) || text(k) === '@') k += text(k) === '@' ? 2 : 1
    // k is the start of the type; the first declared name follows it
    for (let j = k + 1; j < n; j++) if (isIdent(j) && endsType(j) && (text(j + 1) === '=' || text(j + 1) === ',' || text(j + 1) === ';' || text(j + 1) === '[')) return j
    return -1
  }

  /** Handle "class Foo ... {" at token `kw`; returns the index of the closing brace. */
  function declareType(kw: number, scope: Scope | null, stmt: number): number {
    const name = text(kw + 1)
    const mods = toks.slice(stmt, kw).map((k) => k.text)
    const kind = text(kw)
    const owner = scope?.cls?.name ?? ''
    const cls = newSym(name, 'class', kw + 1, { type: kind, owner, isPrivate: mods.includes('private'), isStatic: mods.includes('static') })
    if (scope) scope.names.set('class:' + name, cls)
    let recordParams: { tok: number; type: string }[] | undefined
    let from = kw + 2
    if (text(from) === '<') {
      const e = angleEnd(from)
      if (e > 0) from = e + 1
    }
    if (kind === 'record' && text(from) === '(') {
      recordParams = parseParams(from)
      for (const p of recordParams) declTok.add(p.tok)
      from = close(from) + 1
    }
    const body = findBody(from)
    if (body < 0) return kw + 1
    // record the header (extends/implements) as a region for class references
    regions.push({ start: kw + 2, end: body - 1, scope: scope ?? { kind: 'block', names: new Map(), parent: null }, owner })
    scanClassBody(body, cls, scope, recordParams)
    return close(body)
  }

  // ---- top level: package, imports, types ----
  const fileScope: Scope = { kind: 'block', names: new Map(), parent: null }
  let stmt = 0
  for (let i = 0; i < n; i++) {
    const x = text(i)
    if (x === 'package' && toks[i].kind === 'keyword') {
      let k = i + 1
      const parts: string[] = []
      while (k < n && text(k) !== ';') parts.push(text(k++))
      packageName = parts.join('')
      i = k
      stmt = i + 1
      continue
    }
    if (x === 'import' && toks[i].kind === 'keyword') {
      let k = i + 1
      const isStatic = text(k) === 'static'
      if (isStatic) k++
      const parts: string[] = []
      while (k < n && text(k) !== ';' && !(toks[k].kind === 'keyword' && text(k) !== 'static')) parts.push(text(k++))
      const p = parts.join('')
      imports.push({ start: i, end: text(k) === ';' ? k : k - 1, path: p, isStatic, simple: p.endsWith('*') ? '*' : p.slice(p.lastIndexOf('.') + 1) })
      i = text(k) === ';' ? k : k - 1
      stmt = i + 1
      continue
    }
    if (x === ';' || x === '}') {
      stmt = i + 1
      continue
    }
    const typeKw = (toks[i].kind === 'keyword' && (x === 'class' || x === 'interface' || x === 'enum')) || (x === 'record' && isIdent(i + 1))
    if (typeKw && isIdent(i + 1)) {
      i = declareType(i, fileScope, stmt)
      stmt = i + 1
    }
  }

  // ---- lambdas: params and body extent, keyed by the first token of the parameter list ----
  const lambdas = new Map<number, { params: number[]; end: number }>()
  for (let k = 0; k < n; k++) {
    if (text(k) !== '->') continue
    let first: number
    const params: number[] = []
    if (isIdent(k - 1)) {
      first = k - 1
      params.push(k - 1)
    } else if (text(k - 1) === ')' && match[k - 1] >= 0) {
      first = match[k - 1]
      // "(a, b)" or "(int a, String b)": the last identifier of each comma part
      let last = -1
      for (let j = first + 1; j < k - 1; j++) {
        if (isIdent(j)) last = j
        if (text(j) === ',') {
          if (last >= 0) params.push(last)
          last = -1
        }
      }
      if (last >= 0) params.push(last)
    } else continue
    let end: number
    if (text(k + 1) === '{') end = close(k + 1)
    else {
      end = k + 1
      for (let d = 0; end < n; end++) {
        const y = text(end)
        if (y === '(' || y === '[' || y === '{') d++
        else if (y === ')' || y === ']' || y === '}') {
          if (d === 0) break
          d--
        } else if ((y === ',' || y === ';') && d === 0) break
      }
      end--
    }
    lambdas.set(first, { params, end })
    for (const p of params) declTok.add(p)
  }

  // ---- walk code regions: locals and references ----
  const walk = (start: number, end: number, base: Scope, owner: string, params?: { tok: number; type: string }[]) => {
    const stack: { scope: Scope; end: number }[] = [{ scope: base, end }]
    for (const p of params ?? []) {
      const s = newSym(text(p.tok), 'param', p.tok, { type: p.type, owner, scopeEnd: end })
      base.names.set(s.name, s)
    }
    let declType: { type: string; depth: number } | null = null
    let depth = 0
    const cur = () => stack[stack.length - 1].scope
    const push = (endTok: number) => stack.push({ scope: { kind: 'block', names: new Map(), parent: cur() }, end: endTok })

    for (let i = start; i <= end && i < n; i++) {
      while (stack.length > 1 && i > stack[stack.length - 1].end) stack.pop()
      const t = toks[i]
      const x = t.text

      const lam = lambdas.get(i)
      if (lam) {
        push(lam.end)
        for (const p of lam.params) {
          const s = newSym(text(p), 'param', p, { type: isIdent(p - 1) || toks[p - 1]?.kind === 'keyword' ? typeBefore(p) : '', owner, scopeEnd: lam.end })
          cur().names.set(s.name, s)
        }
      }

      if (x === '(' || x === '[') depth++
      else if (x === ')' || x === ']') {
        depth--
        if (declType && depth < declType.depth) declType = null
      } else if (x === ';') declType = null

      if (x === '{' && i !== start) {
        if (text(i - 1) === ')' && isAnonymous(i)) {
          const anon = newSym('', 'class', -1, { owner })
          scanClassBody(i, anon, cur())
          i = close(i)
          continue
        }
        declType = null
        push(close(i))
        continue
      }
      if ((x === 'for' || x === 'catch' || x === 'try' || x === 'while' || x === 'if' || x === 'switch') && text(i + 1) === '(') {
        // variables declared in the header live until the end of the statement
        const hdrEnd = close(i + 1)
        let stEnd: number
        if (text(hdrEnd + 1) === '{') stEnd = close(hdrEnd + 1)
        else {
          stEnd = hdrEnd + 1
          for (let d = 0; stEnd < n; stEnd++) {
            const y = text(stEnd)
            if (y === '(' || y === '{' || y === '[') d++
            else if (y === ')' || y === '}' || y === ']') d--
            else if (y === ';' && d <= 0) break
          }
        }
        if (x === 'if' || x === 'while') stEnd = Math.max(stEnd, hdrEnd) // pattern variables
        push(stEnd)
        continue
      }
      const typeKw = (t.kind === 'keyword' && (x === 'class' || x === 'interface' || x === 'enum')) || (x === 'record' && isIdent(i + 1) && (text(i + 2) === '(' || text(i + 2) === '<'))
      if (typeKw && isIdent(i + 1) && text(i - 1) !== '.') {
        i = declareType(i, cur(), i)
        continue
      }
      if (t.kind !== 'ident') continue
      if (declTok.has(i)) continue
      const prev = text(i - 1)
      const nx = text(i + 1)

      // local variable declaration
      const isDecl =
        (nx === '=' || nx === ';' || nx === ',' || nx === ':' || nx === ')' || nx === '[' && text(i + 2) === ']' || nx === '&&' || nx === '||') &&
        endsType(i) &&
        !(nx === ')' && !(text(match[i + 1] - 1) === 'catch' || prevIs(i, 'instanceof'))) &&
        !(nx === ':' && text(i - 2) === 'case') &&
        (nx !== '&&' && nx !== '||' || prevIs(i, 'instanceof'))
      if (isDecl || (declType && prev === ',' && depth === declType.depth && (nx === '=' || nx === ',' || nx === ';'))) {
        const type: string = isDecl ? typeBefore(i) : declType!.type
        const s = newSym(x, 'local', i, { type, owner, scopeEnd: stack[stack.length - 1].end })
        cur().names.set(x, s)
        if (isDecl && !prevIs(i, 'instanceof')) declType = { type, depth }
        continue
      }

      if (prev === '.' ) {
        resolveMember(i, cur())
        continue
      }
      if (prev === '::') continue
      if (nx === '(') {
        const m = lookupMethod(cur(), x, argCount(i + 1))
        if (m && prev !== 'new') {
          m.refs.push(i)
          refOf.set(i, m)
        } else if (/^[A-Z]/.test(x)) classRefs.set(i, x)
        continue
      }
      const v = lookupVar(cur(), x, i)
      if (v) {
        v.refs.push(i)
        refOf.set(i, v)
        if (nx === '=' && text(i + 2) !== '=') v.writes.push(i)
        continue
      }
      if (/^[A-Z]/.test(x)) classRefs.set(i, x)
    }
  }
  const prevIs = (i: number, kw: string) => {
    // "x instanceof Type name": the type sits between instanceof and the name
    for (let k = i - 1; k >= Math.max(0, i - 8); k--) {
      if (text(k) === kw) return true
      if (!(isIdent(k) || text(k) === '.' || text(k) === '<' || text(k) === '>' || text(k) === ',' || text(k) === '[' || text(k) === ']')) return false
    }
    return false
  }
  const isAnonymous = (brace: number) => {
    const open = match[brace - 1]
    if (open < 0) return false
    let k = open - 1
    if (text(k) === '>') {
      while (k > 0 && text(k) !== '<') k--
      k--
    }
    while (k >= 0 && (isIdent(k) || text(k) === '.')) k--
    return text(k) === 'new'
  }

  /** Static type (simple class name) of the expression ending at token `k`, if we can tell. */
  const typeOfExprEnding = (k: number, scope: Scope): { type: string | null; isStatic: boolean } => {
    const x = text(k)
    if (x === 'this') return { type: enclosingClass(scope)?.cls?.name ?? null, isStatic: false }
    if (toks[k]?.kind === 'string') return { type: 'String', isStatic: false }
    if (x === ')' && match[k] >= 0) {
      const open = match[k]
      const callee = open - 1
      if (isIdent(callee)) {
        if (text(callee - 1) === 'new') return { type: callee >= 0 ? text(callee) : null, isStatic: false }
        const s = refOf.get(callee)
        if (s && (s.kind === 'method')) return { type: simpleType(s.type), isStatic: false }
      }
      return { type: null, isStatic: false }
    }
    if (!isIdent(k)) return { type: null, isStatic: false }
    const s = refOf.get(k)
    if (s) {
      if (s.kind === 'class') return { type: s.name, isStatic: true }
      if (s.type.endsWith(']')) return { type: null, isStatic: false }
      return { type: simpleType(s.type), isStatic: false }
    }
    if (classRefs.has(k)) return { type: text(k), isStatic: true }
    return { type: null, isStatic: false }
  }

  const resolveMember = (i: number, scope: Scope) => {
    const isCall = text(i + 1) === '('
    const argc = isCall ? argCount(i + 1) : 0
    const recv = typeOfExprEnding(i - 2, scope)
    const x = text(i)
    if (recv.type) {
      const cs = classByName.get(recv.type)
      if (cs) {
        const target = isCall ? lookupMethodIn(cs, x, argc) : cs.names.get(x)
        if (target) {
          target.refs.push(i)
          refOf.set(i, target)
          if (!isCall && text(i + 1) === '=' && text(i + 2) !== '=') target.writes.push(i)
          return
        }
      }
    }
    members.push({ tok: i, name: x, isCall, argc, recvType: recv.type, isStaticRecv: recv.isStatic })
  }
  const lookupMethodIn = (cs: Scope, name: string, argc: number) => {
    const list = cs.methods?.get(name)
    return list?.find((m) => m.arity === argc || m.arity === -1) ?? list?.[0]
  }

  // walk in source order so locals are declared before their uses are resolved
  regions.sort((a, b) => a.start - b.start)
  for (let r = 0; r < regions.length; r++) {
    const reg = regions[r]
    walk(reg.start, reg.end, reg.scope, reg.owner, reg.params)
  }

  // class references to classes declared in this file
  const classSyms = new Map(symbols.filter((s) => s.kind === 'class' && s.name).map((s) => [s.name, s]))
  for (const [k, name] of classRefs) {
    const c = classSyms.get(name)
    if (c && !refOf.has(k)) {
      c.refs.push(k)
      refOf.set(k, c)
    }
  }
  // types used in declarations (`Point p`, `List<Point>`) are not visited by walk(); pick them up here
  for (let k = 0; k < n; k++) {
    if (!isIdent(k) || refOf.has(k) || declTok.has(k) || classRefs.has(k)) continue
    if (text(k - 1) === '.' || text(k - 1) === 'package') continue
    if (/^[A-Z]/.test(text(k)) && !lookupAnyVar(text(k))) {
      classRefs.set(k, text(k))
      const c = classSyms.get(text(k))
      if (c) {
        c.refs.push(k)
        refOf.set(k, c)
      }
    }
  }
  function lookupAnyVar(name: string) {
    return symbols.some((s) => s.name === name && (s.kind === 'field' || s.kind === 'local' || s.kind === 'param'))
  }
  for (const s of symbols) s.refs.sort((a, b) => a - b)
  return { tokens: toks, symbols, refOf, members, classRefs, imports, packageName }
}

/** Token index at an offset (identifier touching the offset), or -1. */
export function tokenAt(tokens: Tok[], offset: number): number {
  let lo = 0
  let hi = tokens.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const t = tokens[mid]
    if (offset < t.offset) hi = mid - 1
    else if (offset > t.offset + t.text.length) lo = mid + 1
    else {
      // prefer an identifier when the caret sits between two tokens ("a|.b")
      if (t.kind !== 'ident' && mid > 0 && tokens[mid - 1].kind === 'ident' && tokens[mid - 1].offset + tokens[mid - 1].text.length === offset) return mid - 1
      if (offset === t.offset + t.text.length && tokens[mid + 1]?.offset === offset && tokens[mid + 1].kind === 'ident') return mid + 1
      return mid
    }
  }
  return -1
}

export interface Occurrence {
  path: string
  offset: number
  length: number
}

export interface RenameTarget {
  name: string
  kind: SymKind
  /** e.g. "local variable", "field", "method", "class" (IntelliJ's wording in the Rename dialog) */
  description: string
  occurrences: Occurrence[]
  /** for public top-level classes whose file is named after them */
  renameFile?: { from: string; toDir: string }
}

const DESCRIPTION: Record<SymKind, string> = { local: 'variable', param: 'parameter', field: 'field', method: 'method', ctor: 'class', class: 'class' }

/**
 * Everything that has to change when the symbol at `offset` in `path` is renamed.
 * Returns null if the caret is not on a renameable symbol (keywords, JDK names, ...).
 */
export function findRenameTarget(files: Record<string, string>, path: string, offset: number, tables?: Map<string, SymbolTable>): RenameTarget | null {
  const tabs = tables ?? new Map<string, SymbolTable>()
  const table = (p: string) => {
    let t = tabs.get(p)
    if (!t) {
      t = buildSymbols(files[p] ?? '')
      tabs.set(p, t)
    }
    return t
  }
  const javaFiles = Object.keys(files).filter((p) => p.endsWith('.java'))
  const here = table(path)
  const ti = tokenAt(here.tokens, offset)
  if (ti < 0 || here.tokens[ti].kind !== 'ident') return null
  const tok = here.tokens[ti]
  let sym = here.refOf.get(ti)
  const occ = (p: string, k: number): Occurrence => ({ path: p, offset: table(p).tokens[k].offset, length: table(p).tokens[k].text.length })

  // a member access we could not resolve locally: maybe a member of a class in another file
  if (!sym) {
    const ma = here.members.find((m) => m.tok === ti)
    const className = ma?.recvType ?? (here.classRefs.get(ti) ? tok.text : null)
    if (ma && ma.recvType) {
      for (const p of javaFiles) {
        const s = table(p).symbols.find((x) => x.owner === ma.recvType && x.name === ma.name && (ma.isCall ? x.kind === 'method' : x.kind === 'field'))
        if (s) {
          sym = s
          return memberTarget(s, p)
        }
      }
      return null
    }
    if (className) {
      for (const p of javaFiles) {
        const s = table(p).symbols.find((x) => x.kind === 'class' && x.name === className)
        if (s) return classTarget(s.name)
      }
    }
    return null
  }
  if (sym.kind === 'local' || sym.kind === 'param') {
    return { name: sym.name, kind: sym.kind, description: DESCRIPTION[sym.kind], occurrences: [sym.decl, ...sym.refs].map((k) => occ(path, k)) }
  }
  if (sym.kind === 'class' || sym.kind === 'ctor') return sym.name ? classTarget(sym.name) : null
  return memberTarget(sym, path)

  function memberTarget(s: Sym, declPath: string): RenameTarget {
    const out: Occurrence[] = [occ(declPath, s.decl), ...s.refs.map((k) => occ(declPath, k))]
    for (const p of javaFiles) {
      const t = table(p)
      for (const m of t.members) {
        if (m.name !== s.name || m.recvType !== s.owner) continue
        if (s.kind === 'method' ? !m.isCall : m.isCall) continue
        out.push(occ(p, m.tok))
      }
      if (p === declPath) continue
      // same symbol resolved inside another file (e.g. subclass accessing an inherited field) is out of scope
    }
    return { name: s.name, kind: s.kind, description: DESCRIPTION[s.kind], occurrences: dedupe(out) }
  }

  function classTarget(name: string): RenameTarget {
    const out: Occurrence[] = []
    let renameFile: RenameTarget['renameFile']
    for (const p of javaFiles) {
      const t = table(p)
      t.tokens.forEach((x, k) => {
        if (x.kind !== 'ident' || x.text !== name) return
        const s = t.refOf.get(k)
        if (s && s.kind !== 'class' && s.kind !== 'ctor') return
        if (!s && !t.classRefs.has(k) && !(t.tokens[k - 1]?.text === 'new')) return
        out.push(occ(p, k))
      })
      // ctor declarations
      for (const s of t.symbols) if (s.kind === 'ctor' && s.name === name) out.push(occ(p, s.decl))
      // imports of a class in a named package: "import pkg.Name;"
      for (const im of t.imports) {
        if (im.simple === name) {
          const last = t.tokens[im.end - 1]
          if (last?.text === name) out.push({ path: p, offset: last.offset, length: name.length })
        }
      }
      const base = p.slice(p.lastIndexOf('/') + 1)
      if (base === `${name}.java` && t.symbols.some((s) => s.kind === 'class' && s.name === name && s.owner === '')) {
        renameFile = { from: p, toDir: p.slice(0, p.lastIndexOf('/') + 1) }
      }
    }
    return { name, kind: 'class', description: 'class', occurrences: dedupe(out), renameFile }
  }
}

function dedupe(list: Occurrence[]) {
  const seen = new Set<string>()
  return list.filter((o) => {
    const k = `${o.path}:${o.offset}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Java identifier check used by Rename. */
export function isValidIdentifier(name: string) {
  return /^[A-Za-z_$][\w$]*$/.test(name) && !RESERVED.has(name)
}
const RESERVED = new Set(['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null', '_'])

/** New file contents after renaming `target` to `newName` (occurrences replaced back to front). */
export function applyRename(files: Record<string, string>, target: RenameTarget, newName: string): { files: Record<string, string>; moved?: { from: string; to: string } } {
  const out = { ...files }
  const byPath = new Map<string, Occurrence[]>()
  for (const o of target.occurrences) byPath.set(o.path, [...(byPath.get(o.path) ?? []), o])
  for (const [p, list] of byPath) {
    let src = out[p]
    if (src === undefined) continue
    for (const o of [...list].sort((a, b) => b.offset - a.offset)) {
      if (src.slice(o.offset, o.offset + o.length) !== target.name) continue // stale occurrence: leave it alone
      src = src.slice(0, o.offset) + newName + src.slice(o.offset + o.length)
    }
    out[p] = src
  }
  const moved = target.renameFile ? { from: target.renameFile.from, to: `${target.renameFile.toDir}${newName}.java` } : undefined
  return { files: out, moved }
}
