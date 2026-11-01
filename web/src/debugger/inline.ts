/**
 * Pure helpers for the debugger's editor integration (unit-tested, so erasable TS only).
 */

/** Add or remove a breakpoint line, keeping the list sorted. */
export function toggleLine(lines: number[], line: number): number[] {
  return lines.includes(line) ? lines.filter((l) => l !== line) : [...lines, line].sort((a, b) => a - b)
}

/** Blank out string/char literals and comments so identifiers inside them are not matched. */
function codeOnly(lines: string[]): string[] {
  let inBlock = false
  return lines.map((line) => {
    let out = ''
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (inBlock) {
        if (c === '*' && line[i + 1] === '/') {
          inBlock = false
          i++
        }
        out += ' '
      } else if (c === '/' && line[i + 1] === '/') break
      else if (c === '/' && line[i + 1] === '*') {
        inBlock = true
        i++
        out += '  '
      } else if (c === '"' || c === "'") {
        let j = i + 1
        while (j < line.length && line[j] !== c) j += line[j] === '\\' ? 2 : 1
        out += ' '.repeat(Math.min(j, line.length - 1) - i + 1)
        i = j
      } else out += c
    }
    return out
  })
}

/**
 * IntelliJ's inline debugger values: after each line of the current method, from its first line up to the
 * paused line, show `name: value` for the visible variables mentioned on that line (in order of appearance).
 * Lines are 1-based. Returns line -> text.
 */
export function inlineValues(source: string, startLine: number, currentLine: number, vars: { name: string; inline: string }[]): Map<number, string> {
  const byName = new Map(vars.filter((v) => v.inline && v.name !== 'this' && v.name !== 'static').map((v) => [v.name, v.inline]))
  const res = new Map<number, string>()
  if (startLine < 1 || currentLine < startLine) return res
  const lines = codeOnly(source.split('\n').slice(0, currentLine))
  for (let l = startLine; l <= currentLine; l++) {
    const seen: string[] = []
    for (const m of (lines[l - 1] ?? '').matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*/g)) {
      if (byName.has(m[0]) && !seen.includes(m[0])) seen.push(m[0])
    }
    if (seen.length) res.set(l, seen.map((n) => `${n}: ${byName.get(n)}`).join('   '))
  }
  return res
}
