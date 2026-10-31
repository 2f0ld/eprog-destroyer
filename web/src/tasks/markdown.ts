/**
 * Minimal Markdown -> HTML for task descriptions (headings, paragraphs, lists, fenced code,
 * inline code, bold/italic, links, block quotes, simple tables). Everything is escaped first,
 * so task text cannot inject HTML. Fenced code blocks get `data-lang` so the UI can colorize them.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(s: string): string {
  const codes: string[] = []
  let out = esc(s).replace(/`([^`]+)`/g, (_, c: string) => {
    codes.push(`<code>${c}</code>`)
    return `\u0000${codes.length - 1}\u0000`
  })
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)])
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let i = 0
  const para: string[] = []
  const flush = () => {
    if (para.length) html.push(`<p>${inline(para.join(' '))}</p>`)
    para.length = 0
  }
  while (i < lines.length) {
    const line = lines[i]
    const fence = /^```\s*(\w*)\s*$/.exec(line)
    if (fence) {
      flush()
      const code: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++])
      i++
      html.push(`<pre data-lang="${esc(fence[1] || 'text')}"><code>${esc(code.join('\n'))}</code></pre>`)
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      flush()
      html.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`)
      i++
      continue
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flush()
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && (/^\s*([-*]|\d+\.)\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const m = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(lines[i])
        if (m) items.push(m[1])
        else items[items.length - 1] += ' ' + lines[i].trim()
        i++
      }
      html.push(`<${ordered ? 'ol' : 'ul'}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`)
      continue
    }
    if (/^>\s?/.test(line)) {
      flush()
      const q: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''))
      html.push(`<blockquote>${renderMarkdown(q.join('\n'))}</blockquote>`)
      continue
    }
    if (/^\|.*\|\s*$/.test(line) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flush()
      const row = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = row(line)
      i += 2
      const body: string[][] = []
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]))
      html.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
      continue
    }
    if (!line.trim()) {
      flush()
      i++
      continue
    }
    para.push(line.trim())
    i++
  }
  flush()
  return html.join('\n')
}
