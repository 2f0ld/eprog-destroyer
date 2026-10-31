import type * as Monaco from 'monaco-editor/editor/editor.api'
import { JAVA_KEYWORDS } from './language'
import { JDK, importFor, parseMember } from './jdk'
import { analysisFor, symbolsFor } from './semantic'
import { tokenAt } from './symbols'
import type { OutlineClass } from './analyzer'

/**
 * Code completion that behaves like IntelliJ's basic completion:
 *  - live templates (sout, psvm, fori, ...) — expanded with Tab or Enter
 *  - postfix templates (expr.sout, expr.for, expr.var, ...)
 *  - member completion after "." for JDK classes and classes in the project
 *  - class name completion with automatic import insertion
 */

interface LiveTemplate {
  key: string
  description: string
  body: string
  /** only offered inside a class body / method body */
  where?: 'class' | 'statement' | 'any'
}

// Bodies use Monaco snippet syntax. $0 marks IntelliJ's $END$.
export const LIVE_TEMPLATES: LiveTemplate[] = [
  { key: 'psvm', description: 'main() method declaration', body: 'public static void main(String[] args) {\n\t$0\n}', where: 'class' },
  { key: 'main', description: 'main() method declaration', body: 'public static void main(String[] args) {\n\t$0\n}', where: 'class' },
  { key: 'sout', description: 'Prints a string to System.out', body: 'System.out.println($0);', where: 'statement' },
  { key: 'serr', description: 'Prints a string to System.err', body: 'System.err.println($0);', where: 'statement' },
  { key: 'souf', description: 'Prints a formatted string to System.out', body: 'System.out.printf("$1"$0);', where: 'statement' },
  { key: 'soutv', description: 'Prints a value to System.out', body: 'System.out.println("${1:value} = " + ${1:value});$0', where: 'statement' },
  { key: 'soutm', description: 'Prints current class and method names to System.out', body: 'System.out.println("$TM_FILENAME_BASE.${1:method}");$0', where: 'statement' },
  { key: 'fori', description: 'Create iteration loop', body: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', where: 'statement' },
  { key: 'forr', description: 'Iterate elements of array in reverse order', body: 'for (int ${1:i} = ${2:array}.length - 1; ${1:i} >= 0; ${1:i}--) {\n\t$0\n}', where: 'statement' },
  { key: 'itar', description: 'Iterate elements of array', body: 'for (int ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3:int} ${4:x} = ${2:array}[${1:i}];\n\t$0\n}', where: 'statement' },
  { key: 'iter', description: 'Iterate Iterable | Array in J2SDK 5.0 syntax', body: 'for (${1:Object} ${2:item} : ${3:collection}) {\n\t$0\n}', where: 'statement' },
  { key: 'ifn', description: 'Inserts "if null" statement', body: 'if (${1:var} == null) {\n\t$0\n}', where: 'statement' },
  { key: 'inn', description: 'Inserts "if not null" statement', body: 'if (${1:var} != null) {\n\t$0\n}', where: 'statement' },
  { key: 'thr', description: 'throw new', body: 'throw new $0', where: 'statement' },
  { key: 'psf', description: 'public static final', body: 'public static final $0', where: 'class' },
  { key: 'psfi', description: 'public static final int', body: 'public static final int $0', where: 'class' },
  { key: 'psfs', description: 'public static final String', body: 'public static final String $0', where: 'class' },
  { key: 'prsf', description: 'private static final', body: 'private static final $0', where: 'class' },
  { key: 'St', description: 'String', body: 'String $0', where: 'any' },
  { key: 'lst', description: 'Fetches last element of an array', body: '${1:array}[${1:array}.length - 1]$0', where: 'any' },
]

interface PostfixTemplate {
  key: string
  description: string
  expand: (expr: string) => string
}

const POSTFIX: PostfixTemplate[] = [
  { key: 'sout', description: 'System.out.println(expr)', expand: (e) => `System.out.println(${e});$0` },
  { key: 'serr', description: 'System.err.println(expr)', expand: (e) => `System.err.println(${e});$0` },
  { key: 'var', description: 'T name = expr', expand: (e) => `\${1:var} \${2:name} = ${e};$0` },
  { key: 'if', description: 'if (expr)', expand: (e) => `if (${e}) {\n\t$0\n}` },
  { key: 'else', description: 'if (!expr)', expand: (e) => `if (!(${e})) {\n\t$0\n}` },
  { key: 'not', description: '!expr', expand: (e) => `!${e}$0` },
  { key: 'null', description: 'if (expr == null)', expand: (e) => `if (${e} == null) {\n\t$0\n}` },
  { key: 'nn', description: 'if (expr != null)', expand: (e) => `if (${e} != null) {\n\t$0\n}` },
  { key: 'for', description: 'for (T item : expr)', expand: (e) => `for (\${1:var} \${2:item} : ${e}) {\n\t$0\n}` },
  { key: 'fori', description: 'for (int i = 0; i < expr; i++)', expand: (e) => `for (int \${1:i} = 0; \${1:i} < ${/^\d+$/.test(e) || !/[A-Za-z]/.test(e) ? e : `${e}${/\)$/.test(e) ? '' : '.length'}`}; \${1:i}++) {\n\t$0\n}` },
  { key: 'forr', description: 'for (int i = expr; i >= 0; i--)', expand: (e) => `for (int \${1:i} = ${e} - 1; \${1:i} >= 0; \${1:i}--) {\n\t$0\n}` },
  { key: 'while', description: 'while (expr)', expand: (e) => `while (${e}) {\n\t$0\n}` },
  { key: 'return', description: 'return expr', expand: (e) => `return ${e};$0` },
  { key: 'par', description: '(expr)', expand: (e) => `(${e})$0` },
  { key: 'cast', description: '((SomeType) expr)', expand: (e) => `((\${1:Type}) ${e})$0` },
  { key: 'throw', description: 'throw expr', expand: (e) => `throw ${e};$0` },
  { key: 'new', description: 'new T()', expand: (e) => `new ${e}($0)` },
]

const PRIMITIVE_TYPES = new Set(['int', 'long', 'short', 'byte', 'char', 'boolean', 'double', 'float'])

export interface ProjectInfo {
  /** classes declared in all project files, used for completion of user types */
  classes(): OutlineClass[]
}

export function registerJavaCompletion(monaco: typeof Monaco, project: ProjectInfo) {
  const K = monaco.languages.CompletionItemKind
  const Rule = monaco.languages.CompletionItemInsertTextRule

  monaco.languages.registerCompletionItemProvider('java', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber)
      const before = line.slice(0, position.column - 1)
      const word = model.getWordUntilPosition(position)
      const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
      const suggestions: Monaco.languages.CompletionItem[] = []

      // inside a string or comment? -> nothing (IntelliJ also stays quiet)
      if (inStringOrComment(before)) return { suggestions }

      const analysis = analysisFor(model)
      const text = model.getValue()
      const offset = model.getOffsetAt(position)

      // ---------- member access:  receiver.prefix ----------
      const m = /((?:[A-Za-z_$][\w$]*|"(?:[^"\\]|\\.)*"|\)|\])(?:\s*\.\s*[A-Za-z_$][\w$]*(?:\([^()]*\))?)*)\s*\.\s*([\w$]*)$/.exec(before)
      if (m) {
        const receiver = m[1]
        const exprStartCol = before.length - m[0].length + 1
        const allClasses = [...analysis.classes, ...project.classes()]
        const recvType = resolveExprType(receiver, text.slice(0, offset), allClasses)
        addMembers(monaco, suggestions, recvType, range, allClasses)
        // postfix templates
        const fullRange = new monaco.Range(position.lineNumber, exprStartCol, position.lineNumber, word.endColumn)
        const exprText = receiver.trim()
        for (const p of POSTFIX) {
          suggestions.push({
            label: { label: p.key, description: p.description },
            kind: K.Snippet,
            insertText: p.expand(exprText),
            insertTextRules: Rule.InsertAsSnippet,
            range: fullRange,
            filterText: `${exprText}.${p.key}`,
            sortText: `~${p.key}`, // after real members
            detail: 'Postfix template',
          })
        }
        return { suggestions }
      }

      // ---------- plain identifier position ----------
      const ctx = contextAt(analysis.tokens, offset)

      for (const t of LIVE_TEMPLATES) {
        if (t.where === 'class' && ctx !== 'class') continue
        if (t.where === 'statement' && ctx !== 'method') continue
        suggestions.push({
          label: { label: t.key, description: t.description },
          kind: K.Snippet,
          insertText: t.body,
          insertTextRules: Rule.InsertAsSnippet,
          range,
          sortText: `0${t.key}`,
          detail: 'Live template',
        })
      }

      for (const kw of JAVA_KEYWORDS) {
        suggestions.push({ label: kw, kind: K.Keyword, insertText: kw, range, sortText: `2${kw}` })
      }

      // variables visible at the caret, then members of the enclosing classes (IntelliJ ranks locals first)
      const table = symbolsFor(model)
      let at = tokenAt(table.tokens, offset)
      if (at < 0) at = table.tokens.findIndex((t) => t.offset >= offset)
      if (at < 0) at = table.tokens.length
      const seen = new Set<string>()
      for (const s of table.symbols) {
        if ((s.kind === 'local' || s.kind === 'param') && s.decl < at && (s.scopeEnd ?? -1) >= at && !seen.has(s.name)) {
          seen.add(s.name)
          suggestions.push({ label: { label: s.name, description: s.type }, kind: s.kind === 'param' ? K.Property : K.Variable, insertText: s.name, range, sortText: `05${s.name}` })
        }
      }
      for (const c of analysis.classes) {
        for (const mem of c.members) {
          if (seen.has(mem.name + mem.kind)) continue
          seen.add(mem.name + mem.kind)
          if (mem.kind === 'field') {
            suggestions.push({ label: { label: mem.name, description: mem.detail }, kind: mem.isStatic && mem.isFinal ? K.Constant : K.Field, insertText: mem.name, range, sortText: `1${mem.name}` })
          } else if (mem.kind === 'method') {
            suggestions.push({
              label: { label: mem.name, detail: mem.detail.replace(/:.*$/, ''), description: mem.detail.replace(/^.*:\s*/, '') },
              kind: K.Method,
              insertText: mem.detail.startsWith('()') ? `${mem.name}()` : `${mem.name}($0)`,
              insertTextRules: Rule.InsertAsSnippet,
              range,
              sortText: `1${mem.name}`,
              command: { id: 'editor.action.triggerParameterHints', title: '' },
            })
          }
        }
      }

      // classes: project + JDK (with auto-import)
      const userClasses = new Set<string>()
      for (const c of project.classes()) {
        if (!c.name || userClasses.has(c.name)) continue
        userClasses.add(c.name)
        suggestions.push({ label: { label: c.name, description: '(default package)' }, kind: kindForClass(K, c.kind), insertText: c.name, range, sortText: `3${c.name}` })
      }
      for (const [name, cls] of Object.entries(JDK)) {
        if (userClasses.has(name)) continue
        const fqn = importFor(name)
        const edits = fqn ? importEdit(monaco, model, fqn) : []
        suggestions.push({
          label: { label: name, description: cls.pkg },
          kind: kindForClass(K, cls.kind ?? 'class'),
          insertText: name,
          range,
          sortText: `4${name}`,
          additionalTextEdits: edits,
        })
      }
      return { suggestions }
    },
  })
}

/** Ctrl+P / typing "(": parameter info for JDK and project methods and constructors. */
export function registerJavaSignatureHelp(monaco: typeof Monaco, project: ProjectInfo) {
  monaco.languages.registerSignatureHelpProvider('java', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    provideSignatureHelp(model, position) {
      const text = model.getValue()
      const offset = model.getOffsetAt(position)
      // find the unmatched "(" before the caret and count top-level commas
      let depth = 0
      let commas = 0
      let open = -1
      for (let i = offset - 1; i >= 0 && i > offset - 2000; i--) {
        const c = text[i]
        if (c === ')' || c === ']' || c === '}') depth++
        else if (c === '(' || c === '[' || c === '{') {
          if (depth === 0) {
            if (c === '(') open = i
            break
          }
          depth--
        } else if (c === ',' && depth === 0) commas++
        else if (c === ';') break
      }
      if (open < 0) return null
      const before = text.slice(Math.max(0, open - 300), open)
      const m = /(?:(new)\s+([A-Z][\w$]*)(?:<[^()]*>)?|((?:[A-Za-z_$][\w$]*|"(?:[^"\\]|\\.)*"|\))(?:\s*\.\s*[A-Za-z_$][\w$]*(?:\([^()]*\))?)*)\s*\.\s*([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))\s*$/.exec(before)
      if (!m) return null
      const analysis = analysisFor(model)
      const allClasses = [...analysis.classes, ...project.classes()]
      let sigs: { label: string; params: string[] }[] = []
      const fmt = (name: string, params: string, ret?: string) => {
        const ps = params ? splitParams(params) : []
        return { label: `${name}(${ps.join(', ')})${ret ? `: ${ret}` : ''}`, params: ps }
      }
      if (m[1]) {
        const cls = m[2]
        const jdk = JDK[cls]
        if (jdk?.ctors) sigs = jdk.ctors.map((c) => fmt(cls, c.slice(1, -1)))
        const user = allClasses.find((c) => c.name === cls)
        if (user) {
          const ctors = user.members.filter((x) => x.kind === 'constructor')
          sigs = ctors.length ? ctors.map((x) => fmt(cls, x.detail.replace(/^\((.*)\).*$/, '$1'))) : [fmt(cls, '')]
        }
      } else if (m[4]) {
        const recv = resolveExprType(m[3], text.slice(0, open), allClasses)
        if (recv) sigs = membersOf(recv, allClasses).filter((x) => x.isMethod && x.name === m[4]).map((x) => fmt(x.name, x.params, x.type))
      } else if (m[5]) {
        const name = m[5]
        for (const c of analysis.classes) for (const x of c.members) if (x.kind === 'method' && x.name === name) sigs.push(fmt(name, x.detail.replace(/^\((.*)\).*$/, '$1'), x.detail.replace(/^.*\):\s*/, '')))
      }
      if (!sigs.length) return null
      const active = Math.max(0, sigs.findIndex((s) => s.params.length > commas || (s.params.length === commas + 1)))
      return {
        value: {
          signatures: sigs.map((s) => ({ label: s.label, parameters: s.params.map((p) => ({ label: p })) })),
          activeSignature: active,
          activeParameter: commas,
        },
        dispose() {},
      }
    },
  })
}

function splitParams(s: string) {
  const out: string[] = []
  let d = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '<') d++
    else if (ch === '>') d--
    if (ch === ',' && d === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function kindForClass(K: typeof Monaco.languages.CompletionItemKind, kind: string) {
  return kind === 'interface' ? K.Interface : kind === 'enum' ? K.Enum : K.Class
}

function inStringOrComment(before: string) {
  let inStr = false
  for (let i = 0; i < before.length; i++) {
    const c = before[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '/' && before[i + 1] === '/') return true
  }
  return inStr
}

/** Is the offset directly inside a class body or inside a method body? */
function contextAt(tokens: { text: string; offset: number }[], offset: number): 'top' | 'class' | 'method' {
  const stack: ('class' | 'method')[] = []
  let sawTypeDecl = false
  for (const t of tokens) {
    if (t.offset >= offset) break
    if (t.text === 'class' || t.text === 'interface' || t.text === 'enum' || t.text === 'record') sawTypeDecl = true
    if (t.text === '{') {
      stack.push(sawTypeDecl ? 'class' : stack.length === 0 ? 'class' : 'method')
      sawTypeDecl = false
    } else if (t.text === '}') stack.pop()
  }
  if (stack.length === 0) return 'top'
  return stack.includes('method') ? 'method' : 'class'
}

function stripGenerics(t: string) {
  return t.replace(/<.*>/, '').trim()
}

type ResolvedType = { kind: 'static' | 'instance'; name: string; array?: boolean } | null

/** Resolve the (approximate) static type of a receiver expression. */
function resolveExprType(expr: string, textBefore: string, classes: OutlineClass[]): ResolvedType {
  const parts = splitChain(expr)
  let cur: ResolvedType = null
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (i === 0) {
      if (p.startsWith('"')) cur = { kind: 'instance', name: 'String' }
      else if (p === 'this') cur = classes[0] ? { kind: 'instance', name: classes[0].name } : null
      else if (/^[A-Z]/.test(p) && (JDK[p] || classes.some((c) => c.name === p)) && !declaredType(p, textBefore)) cur = { kind: 'static', name: p }
      else {
        const t = declaredType(p, textBefore) ?? fieldType(p, classes)
        if (t) cur = { kind: 'instance', name: stripGenerics(t).replace(/(\[\])+$/, ''), array: /\[\]$/.test(t) }
      }
      continue
    }
    if (!cur) return null
    const name = p.replace(/\(.*$/, '')
    const isCall = p.includes('(')
    if (cur.array) {
      cur = name === 'length' ? { kind: 'instance', name: 'int' } : null
      continue
    }
    const members = membersOf(cur, classes)
    const mem = members.find((x) => x.name === name && x.isMethod === isCall)
    if (!mem) return null
    const t = stripGenerics(mem.type)
    cur = { kind: 'instance', name: t.replace(/(\[\])+$/, ''), array: /\[\]$/.test(mem.type) }
  }
  return cur
}

function splitChain(expr: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of expr) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === '.' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

function declaredType(name: string, textBefore: string): string | null {
  const re = new RegExp(`\\b([A-Z][\\w$]*(?:<[^;=()]*?>)?|int|long|short|byte|char|boolean|double|float|var)((?:\\s*\\[\\s*\\])*)\\s+${name.replace(/\$/g, '\\$')}\\s*(?:[=;,:)]|$)`, 'g')
  let last: RegExpExecArray | null = null
  let mm: RegExpExecArray | null
  while ((mm = re.exec(textBefore))) last = mm
  if (!last) return null
  let t = last[1] + (last[2] ?? '').replace(/\s/g, '')
  if (t === 'var') {
    const init = new RegExp(`var\\s+${name}\\s*=\\s*new\\s+([A-Z][\\w$]*)`).exec(textBefore)
    t = init ? init[1] : 'Object'
  }
  return t
}

function fieldType(name: string, classes: OutlineClass[]): string | null {
  for (const c of classes) for (const m of c.members) if (m.kind === 'field' && m.name === name) return m.detail
  return null
}

function membersOf(t: NonNullable<ResolvedType>, classes: OutlineClass[]) {
  if (PRIMITIVE_TYPES.has(t.name)) return []
  const jdk = JDK[t.name]
  if (jdk) {
    const list = t.kind === 'static' ? jdk.static ?? [] : [...(jdk.instance ?? []), ...(jdk.instance?.some((x) => x.startsWith('equals(')) ? [] : ['equals(Object obj): boolean', 'hashCode(): int', 'toString(): String'])]
    return list.map(parseMember)
  }
  const user = classes.find((c) => c.name === t.name)
  if (user) {
    return user.members
      .filter((m) => m.kind !== 'constructor' && (t.kind === 'static' ? m.isStatic : true))
      .map((m) => (m.kind === 'field' ? { name: m.name, isMethod: false, params: '', type: m.detail } : { name: m.name, isMethod: true, params: m.detail.replace(/^\((.*)\).*$/, '$1'), type: m.detail.replace(/^.*\):\s*/, '') }))
  }
  return []
}

function addMembers(monaco: typeof Monaco, out: Monaco.languages.CompletionItem[], t: ResolvedType, range: Monaco.IRange, classes: OutlineClass[]) {
  if (!t) return
  const K = monaco.languages.CompletionItemKind
  if (t.array) {
    out.push({ label: { label: 'length', description: 'int' }, kind: K.Field, insertText: 'length', range, sortText: '0length' })
    out.push({ label: { label: 'clone', detail: '()', description: `${t.name}[]` }, kind: K.Method, insertText: 'clone()', range, sortText: '1clone' })
    return
  }
  const seen = new Set<string>()
  for (const m of membersOf(t, classes)) {
    const key = m.name + (m.isMethod ? `(${m.params})` : '')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(
      m.isMethod
        ? {
            label: { label: m.name, detail: `(${m.params})`, description: m.type },
            kind: K.Method,
            insertText: m.params ? `${m.name}($0)` : `${m.name}()`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `0${m.name}${m.params.length.toString().padStart(3, '0')}`,
            command: m.params ? { id: 'editor.action.triggerParameterHints', title: '' } : undefined,
          }
        : { label: { label: m.name, description: m.type }, kind: /^[A-Z][A-Z0-9_]*$/.test(m.name) ? K.Constant : K.Field, insertText: m.name, range, sortText: `0${m.name}` },
    )
  }
}

function importEdit(monaco: typeof Monaco, model: Monaco.editor.ITextModel, fqn: string): Monaco.languages.TextEdit[] {
  const text = model.getValue()
  const pkg = fqn.slice(0, fqn.lastIndexOf('.'))
  if (new RegExp(`^\\s*import\\s+(${fqn.replace(/\./g, '\\.')}|${pkg.replace(/\./g, '\\.')}\\.\\*)\\s*;`, 'm').test(text)) return []
  const lines = text.split('\n')
  let insertLine = 0
  let lastImport = -1
  let pkgLine = -1
  lines.forEach((l, i) => {
    if (/^\s*import\s/.test(l)) lastImport = i
    if (/^\s*package\s/.test(l)) pkgLine = i
  })
  let prefix = ''
  let suffix = '\n'
  if (lastImport >= 0) insertLine = lastImport + 1
  else if (pkgLine >= 0) {
    insertLine = pkgLine + 1
    prefix = '\n'
  } else {
    insertLine = 0
    suffix = '\n\n'
  }
  return [{ range: new monaco.Range(insertLine + 1, 1, insertLine + 1, 1), text: `${prefix}import ${fqn};${suffix}` }]
}
