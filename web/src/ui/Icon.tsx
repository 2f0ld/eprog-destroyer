import { useIde } from '../ide/store'
import { uiThemes } from '../theme/uiThemes'

// All IntelliJ icons, bundled as URLs. Keys look like "general/add" or "toolwindows/project@20x20".
const urls = import.meta.glob('../assets/icons/**/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const ICONS: Record<string, string> = {}
for (const [k, v] of Object.entries(urls)) ICONS[k.replace('../assets/icons/', '').replace(/\.svg$/, '')] = v

export function iconUrl(name: string, dark: boolean): string | undefined {
  return (dark && ICONS[`${name}_dark`]) || ICONS[name]
}

export function Icon({ name, size = 16, className, title }: { name: string; size?: number; className?: string; title?: string }) {
  const dark = useIde((s) => uiThemes[s.theme].dark)
  const src = iconUrl(name, dark)
  if (!src) return <span className={className} style={{ width: size, height: size, display: 'inline-block' }} />
  return <img src={src} width={size} height={size} className={className} alt="" title={title} draggable={false} />
}

/** Icon for a file in the project tree / editor tab, mirroring IntelliJ's choices. */
export function fileIconName(path: string, content?: string): string {
  if (path.endsWith('.java')) {
    if (content !== undefined) {
      if (/\binterface\s+\w/.test(content)) return 'nodes/interface'
      if (/\benum\s+\w/.test(content)) return 'nodes/enum'
      if (/\brecord\s+\w+\s*\(/.test(content)) return 'nodes/record'
      if (/\babstract\s+class\b/.test(content)) return 'nodes/classAbstract'
      if (/\b(Exception|Error)\s*\{/.test(content) && /extends\s+\w*(Exception|Error)\b/.test(content)) return 'nodes/exception'
    }
    return 'nodes/class'
  }
  if (path.endsWith('.iml')) return 'fileTypes/ideaModule'
  if (path.endsWith('.xml')) return 'fileTypes/xml'
  if (path.endsWith('.md')) return 'fileTypes/markdown'
  if (path.endsWith('.txt')) return 'fileTypes/text'
  if (path.endsWith('.gitignore')) return 'fileTypes/text'
  return 'fileTypes/text'
}
