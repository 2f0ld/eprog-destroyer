/**
 * Optimize Imports (Ctrl+Alt+O) with IntelliJ's default Java code style:
 *  - remove unused, duplicate and redundant (java.lang, same package) imports
 *  - wildcard imports are replaced by the single-type imports actually used (from our JDK table),
 *    and 5+ single-type imports from one package collapse into `pkg.*`
 *    ("Class count to use import with '*'" = 5, "Names count to use static import with '*'" = 3)
 *  - layout: all other imports, blank line, javax.* and java.*, blank line, static imports;
 *    alphabetical within each group
 */
import { buildSymbols } from './symbols.ts'
import { JDK } from './jdk.ts'

const CLASS_COUNT_TO_USE_STAR = 5
const NAMES_COUNT_TO_USE_STATIC_STAR = 3

export interface OptimizeResult {
  text: string
  removed: number
  added: number
}

export function optimizeImports(src: string, projectClasses: string[] = []): OptimizeResult {
  const table = buildSymbols(src)
  const { tokens, imports } = table
  if (!imports.length) return { text: src, removed: 0, added: 0 }
  const importToks = new Set<number>()
  for (const im of imports) for (let k = im.start; k <= im.end; k++) importToks.add(k)
  const used = new Set<string>()
  tokens.forEach((t, k) => {
    if (t.kind === 'ident' && !importToks.has(k)) used.add(t.text)
  })
  for (const m of src.matchAll(/\{@link(?:plain)?\s+([A-Za-z_$][\w$]*)/g)) used.add(m[1])
  const local = new Set([...projectClasses, ...table.symbols.filter((s) => s.kind === 'class').map((s) => s.name)])

  const single = new Map<string, Set<string>>() // pkg -> simple names (non-static)
  const statics = new Map<string, Set<string>>() // class -> member names
  const keepStarStatic = new Set<string>()
  const add = (m: Map<string, Set<string>>, k: string, v: string) => m.set(k, (m.get(k) ?? new Set()).add(v))
  for (const im of imports) {
    const pkg = im.path.slice(0, im.path.lastIndexOf('.'))
    if (im.isStatic) {
      if (im.simple === '*') {
        // keep `import static X.*` if anything could come from it (we cannot list the members)
        keepStarStatic.add(pkg)
      } else if (used.has(im.simple)) add(statics, pkg, im.simple)
      continue
    }
    if (pkg === 'java.lang' || pkg === table.packageName) continue
    if (im.simple === '*') {
      // expand to the classes of this package that are used (known from the JDK table)
      const names = Object.entries(JDK).filter(([n, c]) => c.pkg === pkg && used.has(n) && !local.has(n)).map(([n]) => n)
      const unknownPkg = !Object.values(JDK).some((c) => c.pkg === pkg)
      if (unknownPkg) add(single, pkg, '*')
      for (const n of names) add(single, pkg, n)
      continue
    }
    if (used.has(im.simple)) add(single, pkg, im.simple)
  }

  const lines: string[] = []
  for (const [pkg, names] of single) {
    if (names.has('*') || [...names].length >= CLASS_COUNT_TO_USE_STAR) lines.push(`import ${pkg}.*;`)
    else for (const n of names) lines.push(`import ${pkg}.${n};`)
  }
  const staticLines: string[] = [...keepStarStatic].map((c) => `import static ${c}.*;`)
  for (const [cls, names] of statics) {
    if (keepStarStatic.has(cls)) continue
    if (names.size >= NAMES_COUNT_TO_USE_STATIC_STAR) staticLines.push(`import static ${cls}.*;`)
    else for (const n of names) staticLines.push(`import static ${cls}.${n};`)
  }
  const isJava = (l: string) => /^import (javax?)\./.test(l)
  const sortKey = (l: string) => l.replace(/^import (static )?/, '').replace(/;$/, '')
  const byName = (a: string, b: string) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0)
  const other = [...new Set(lines.filter((l) => !isJava(l)))].sort(byName)
  const javax = [...new Set(lines.filter((l) => l.startsWith('import javax.')))].sort(byName)
  const java = [...new Set(lines.filter((l) => l.startsWith('import java.')))].sort(byName)
  const stat = [...new Set(staticLines)].sort(byName)
  const groups = [other, [...javax, ...java], stat].filter((g) => g.length)
  const block = groups.map((g) => g.join('\n')).join('\n\n')

  // replace from the start of the first import line to the end of the last import line
  const first = tokens[imports[0].start]
  const last = tokens[imports[imports.length - 1].end]
  const startOff = first.offset - first.col
  let endOff = last.offset + last.text.length
  const nl = src.indexOf('\n', endOff)
  endOff = nl < 0 ? src.length : nl
  let text: string
  if (block) text = src.slice(0, startOff) + block + src.slice(endOff)
  else {
    // no imports left: drop the block and the blank line(s) after it
    let after = endOff
    while (src[after] === '\n') after++
    text = src.slice(0, startOff) + src.slice(after)
  }
  const before = imports.length
  const now = block ? block.split('\n').filter((l) => l.startsWith('import')).length : 0
  const oldSet = new Set(imports.map((im) => `import ${im.isStatic ? 'static ' : ''}${im.path};`))
  const newSet = new Set(block.split('\n').filter((l) => l.startsWith('import')))
  const added = [...newSet].filter((l) => !oldSet.has(l)).length
  return { text, removed: Math.max(0, before - (now - added)), added }
}
