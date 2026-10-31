/**
 * "Reformat Code" (Ctrl+Alt+L) for Java, approximating IntelliJ's default code style:
 *  - 4-space indentation, continuation indent 8
 *  - switch: case labels indented one level, statements one more
 *  - spaces: `if (`, `) {`, `} else {`, after commas, around assignment/comparison operators
 * Strings, chars, text blocks and comments are never touched.
 */

const INDENT = '    '

interface Seg {
  code: boolean
  text: string
}

/** Split a line into code / non-code (string, char, comment) segments. */
function segments(line: string, state: { block: boolean; textBlock: boolean }): Seg[] {
  const segs: Seg[] = []
  let i = 0
  let cur = ''
  const flush = (code: boolean) => {
    if (cur) segs.push({ code, text: cur })
    cur = ''
  }
  while (i < line.length) {
    if (state.block || state.textBlock) {
      const end = state.block ? line.indexOf('*/', i) : line.indexOf('"""', i)
      if (end < 0) {
        cur += line.slice(i)
        i = line.length
        break
      }
      const len = state.block ? 2 : 3
      cur += line.slice(i, end + len)
      i = end + len
      state.block = false
      state.textBlock = false
      flush(false)
      continue
    }
    const c = line[i]
    if (c === '/' && line[i + 1] === '/') {
      flush(true)
      cur = line.slice(i)
      i = line.length
      flush(false)
      break
    }
    if (c === '/' && line[i + 1] === '*') {
      flush(true)
      state.block = true
      cur = '/*'
      i += 2
      continue
    }
    if (line.startsWith('"""', i)) {
      flush(true)
      state.textBlock = true
      cur = '"""'
      i += 3
      continue
    }
    if (c === '"' || c === "'") {
      flush(true)
      let j = i + 1
      while (j < line.length && line[j] !== c) j += line[j] === '\\' ? 2 : 1
      cur = line.slice(i, j + 1)
      i = j + 1
      flush(false)
      continue
    }
    cur += c
    i++
  }
  flush(!(state.block || state.textBlock))
  return segs
}

function fixSpacing(code: string): string {
  return code
    .replace(/\b(if|for|while|switch|catch|synchronized|try)\(/g, '$1 (')
    .replace(/\)\{/g, ') {')
    .replace(/\b(else|try|finally|do)\{/g, '$1 {')
    .replace(/\}(else|catch|finally|while)\b/g, '} $1')
    .replace(/([\w\]>)"'])\{/g, '$1 {')
    .replace(/,(?=[^\s)\]])/g, ', ')
    .replace(/;(?=[^\s;)])/g, '; ')
    .replace(/\s*(==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|%=)\s*/g, ' $1 ')
    .replace(/([\w)\]"'])\s*=(?!=)\s*/g, '$1 = ')
    .replace(/ {2,}/g, ' ')
}

export function formatJava(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  const state = { block: false, textBlock: false }
  // brace stack: each entry knows whether it's a switch body and whether we're inside a case
  const stack: { switchBody: boolean; inCase: boolean }[] = []
  let paren = 0
  let pendingSwitch = false
  let prevCode = ''
  let blank = 0

  for (const raw of lines) {
    const startsInComment = state.block || state.textBlock
    const segs = segments(raw.trimStart(), state)
    if (startsInComment) {
      // keep block comment / text block content, but align javadoc "*" lines
      const t = raw.trim()
      const depth = stack.reduce((n, f) => n + 1 + (f.inCase ? 1 : 0), 0)
      out.push(t.startsWith('*') ? INDENT.repeat(depth) + ' ' + t : raw.trimEnd())
      continue
    }
    let line = segs.map((s) => (s.code ? fixSpacing(s.text) : s.text)).join('').trim()
    if (line === '') {
      blank++
      if (blank <= 2) out.push('')
      continue
    }
    blank = 0
    const codeOnly = segs.filter((s) => s.code).map((s) => s.text).join('')

    // indentation for this line
    let depth = stack.reduce((n, f) => n + 1 + (f.inCase ? 1 : 0), 0)
    const top = stack[stack.length - 1]
    const isCaseLabel = /^(case\b.*:|default\s*:)/.test(line) && !/->/.test(codeOnly)
    if (/^[}\])]/.test(line)) {
      if (line[0] === '}' && top) depth -= 1 + (top.inCase ? 1 : 0)
    } else if (isCaseLabel && top?.switchBody) {
      if (top.inCase) depth -= 1
    }
    let continuation = paren > 0 && !/^\)/.test(line)
    if (/^\./.test(line) || (prevCode && /([+\-*/%&|^?:]|&&|\|\||=)$/.test(prevCode) && !/^(case|default)\b/.test(prevCode.trimStart()))) continuation = true
    const indent = INDENT.repeat(Math.max(0, depth)) + (continuation ? INDENT + INDENT : '')
    line = line.replace(/\s+$/, '')
    out.push(indent + line)

    // update state with this line's code
    if (/\bswitch\b/.test(codeOnly)) pendingSwitch = true
    if (isCaseLabel && top?.switchBody) top.inCase = true
    for (const ch of codeOnly) {
      if (ch === '(') paren++
      else if (ch === ')') paren = Math.max(0, paren - 1)
      else if (ch === '{') {
        stack.push({ switchBody: pendingSwitch, inCase: false })
        pendingSwitch = false
      } else if (ch === '}') stack.pop()
    }
    prevCode = codeOnly.trim()
  }
  // trim trailing blank lines, end with a single newline
  while (out.length && out[out.length - 1] === '') out.pop()
  return out.join('\n') + '\n'
}
