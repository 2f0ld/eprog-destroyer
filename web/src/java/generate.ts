/**
 * Code > Generate (Alt+Insert) with IntelliJ's default templates:
 * constructor, getters/setters, toString() ("String concat (+)") and equals()/hashCode()
 * ("java.util.Objects.equals and hashCode (java 7+)").
 */
import { buildSymbols } from './symbols.ts'
import type { TextEdit } from './quickfix.ts'
import { importEditFor } from './quickfix.ts'

export type GenerateKind = 'constructor' | 'getter' | 'setter' | 'getterAndSetter' | 'toString' | 'equalsHashCode'

export interface FieldInfo {
  name: string
  type: string
  isStatic: boolean
  isFinal: boolean
}

export interface ClassAt {
  name: string
  fields: FieldInfo[]
  /** offset of the class body's closing brace */
  closeOffset: number
  /** existing method names, to skip getters/setters that already exist */
  methods: string[]
}

/** The innermost named class whose body contains `offset`. */
export function classAt(src: string, offset: number): ClassAt | null {
  const t = buildSymbols(src)
  const toks = t.tokens
  let best: ClassAt | null = null
  let bestSize = Infinity
  for (const s of t.symbols) {
    if (s.kind !== 'class' || !s.name || s.decl < 0) continue
    // find the body brace after the name
    let k = s.decl + 1
    let depth = 0
    for (; k < toks.length; k++) {
      const x = toks[k].text
      if (x === '(') depth++
      else if (x === ')') depth--
      else if (x === '{' && depth === 0) break
    }
    if (k >= toks.length) continue
    let d = 0
    let end = k
    for (; end < toks.length; end++) {
      if (toks[end].text === '{') d++
      else if (toks[end].text === '}' && --d === 0) break
    }
    const open = toks[k].offset
    const close = end < toks.length ? toks[end].offset : src.length
    if (offset <= open || offset > close || close - open >= bestSize) continue
    bestSize = close - open
    const fields = t.symbols
      .filter((f) => f.kind === 'field' && f.owner === s.name && f.decl > k && f.decl < end)
      .map((f) => ({ name: f.name, type: f.type || 'Object', isStatic: f.isStatic, isFinal: isFinal(toks, f.decl) }))
    const methods = t.symbols.filter((m) => m.kind === 'method' && m.owner === s.name).map((m) => m.name)
    best = { name: s.name, fields, closeOffset: close, methods }
  }
  return best
}

function isFinal(toks: { text: string }[], decl: number) {
  for (let k = decl - 1; k >= 0 && k > decl - 12; k--) {
    const x = toks[k].text
    if (x === ';' || x === '{' || x === '}') return false
    if (x === 'final') return true
  }
  return false
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const getterName = (f: FieldInfo) => (f.type === 'boolean' ? 'is' : 'get') + cap(f.name)
const PRIMITIVE = new Set(['int', 'long', 'short', 'byte', 'char', 'boolean'])

/** Source text of the generated members (unindented, 4-space body indent). */
export function generateMembers(cls: ClassAt, kind: GenerateKind, fields: FieldInfo[]): { code: string; needsObjects: boolean } {
  const out: string[] = []
  let needsObjects = false
  if (kind === 'constructor') {
    out.push(`public ${cls.name}(${fields.map((f) => `${f.type} ${f.name}`).join(', ')}) {\n${fields.map((f) => `    this.${f.name} = ${f.name};\n`).join('')}}`)
  }
  if (kind === 'getter' || kind === 'getterAndSetter') {
    for (const f of fields) if (!cls.methods.includes(getterName(f))) out.push(`public ${f.isStatic ? 'static ' : ''}${f.type} ${getterName(f)}() {\n    return ${f.name};\n}`)
  }
  if (kind === 'setter' || kind === 'getterAndSetter') {
    for (const f of fields) {
      if (f.isFinal || cls.methods.includes('set' + cap(f.name))) continue
      out.push(`public ${f.isStatic ? 'static ' : ''}void set${cap(f.name)}(${f.type} ${f.name}) {\n    ${f.isStatic ? cls.name : 'this'}.${f.name} = ${f.name};\n}`)
    }
  }
  if (kind === 'toString') {
    const parts = fields.map((f, i) => {
      const sep = i === 0 ? '' : ', '
      if (f.type === 'String') return `"${sep}${f.name}='" + ${f.name} + '\\'' +`
      if (f.type.endsWith('[]')) return `"${sep}${f.name}=" + java.util.Arrays.toString(${f.name}) +`
      return `"${sep}${f.name}=" + ${f.name} +`
    })
    out.push(`@Override\npublic String toString() {\n    return "${cls.name}{" +\n${parts.map((p) => `            ${p}\n`).join('')}            '}';\n}`)
  }
  if (kind === 'equalsHashCode') {
    const other = cls.name[0].toLowerCase() + cls.name.slice(1)
    const v = other === 'o' ? 'that' : other
    const cmp = fields.map((f) => {
      if (f.type === 'float') return `Float.compare(${f.name}, ${v}.${f.name}) == 0`
      if (f.type === 'double') return `Double.compare(${f.name}, ${v}.${f.name}) == 0`
      if (PRIMITIVE.has(f.type)) return `${f.name} == ${v}.${f.name}`
      if (f.type.endsWith('[]')) return `java.util.Arrays.equals(${f.name}, ${v}.${f.name})`
      needsObjects = true
      return `Objects.equals(${f.name}, ${v}.${f.name})`
    })
    needsObjects = true
    out.push(
      `@Override\npublic boolean equals(Object o) {\n    if (o == null || getClass() != o.getClass()) return false;\n` +
        (fields.length ? `\n    ${cls.name} ${v} = (${cls.name}) o;\n    return ${cmp.join(' && ')};\n` : '    return true;\n') +
        '}',
    )
    out.push(`@Override\npublic int hashCode() {\n    return Objects.hash(${fields.map((f) => f.name).join(', ')});\n}`)
  }
  return { code: out.join('\n\n'), needsObjects }
}

/** Edits that insert the generated members before the class's closing brace, indented one level deeper. */
export function generateEdits(src: string, cls: ClassAt, kind: GenerateKind, fields: FieldInfo[]): TextEdit[] {
  const { code, needsObjects } = generateMembers(cls, kind, fields)
  if (!code) return []
  const lineStartOff = src.lastIndexOf('\n', cls.closeOffset - 1) + 1
  const closeIndent = /^\s*/.exec(src.slice(lineStartOff, cls.closeOffset))![0]
  const indent = closeIndent + '    '
  const body = code
    .split('\n')
    .map((l) => (l ? indent + l : l))
    .join('\n')
  // put the members on their own lines before "}" with one blank line in between
  const before = src.slice(0, cls.closeOffset)
  const onOwnLine = /\n\s*$/.test(before)
  const prevNonBlank = before.replace(/\s+$/, '')
  const needsBlank = !prevNonBlank.endsWith('{')
  const text = onOwnLine ? `${needsBlank ? '\n' : ''}${body}\n${closeIndent}` : `\n${needsBlank ? '\n' : ''}${body}\n${closeIndent}`
  const offset = onOwnLine ? lineStartOff : cls.closeOffset
  const edits: TextEdit[] = [{ offset, length: onOwnLine ? cls.closeOffset - lineStartOff : 0, text }]
  if (needsObjects) {
    const imp = importEditFor(src, 'java.util.Objects')
    if (imp) edits.push(imp)
  }
  return edits
}
