import { iconUrl } from '../ui/Icon'
import { useIde } from '../ide/store'
import { uiThemes } from '../theme/uiThemes'

/**
 * IntelliJ's completion popup ("lookup") shows node icons (class, method, field, variable, ...)
 * instead of VS Code's codicons. Monaco renders the icon as a codicon class on `.suggest-icon`,
 * so we inject CSS that replaces each glyph with the vendored IntelliJ SVG for the current theme.
 */
const ICON_FOR_CODICON: Record<string, string | null> = {
  'symbol-method': 'nodes/method',
  'symbol-function': 'nodes/method',
  'symbol-constructor': 'nodes/class',
  'symbol-field': 'nodes/field',
  'symbol-variable': 'nodes/variable',
  'symbol-property': 'nodes/parameter', // we report parameters as CompletionItemKind.Property
  'symbol-class': 'nodes/class',
  'symbol-struct': 'nodes/record',
  'symbol-interface': 'nodes/interface',
  'symbol-enum': 'nodes/enum',
  'symbol-enum-member': 'nodes/constant',
  'symbol-constant': 'nodes/constant',
  'symbol-snippet': 'nodes/template',
  'symbol-module': 'nodes/package',
  'symbol-type-parameter': 'nodes/class',
  'symbol-keyword': null, // keywords have no icon, just bold text
  'symbol-text': null,
}

function css(dark: boolean) {
  const sel = (c: string) => `.monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.codicon-${c}`
  return Object.entries(ICON_FOR_CODICON)
    .map(([c, icon]) => {
      const url = icon && iconUrl(icon, dark)
      return `${sel(c)}::before{content:''!important}${sel(c)}{width:16px;height:16px;background:${url ? `url("${url}") center/16px 16px no-repeat` : 'none'}!important}`
    })
    .join('\n')
}

export function installCompletionIcons() {
  const style = document.createElement('style')
  style.dataset.ij = 'completion-icons'
  document.head.appendChild(style)
  const update = () => (style.textContent = css(uiThemes[useIde.getState().theme].dark))
  update()
  return useIde.subscribe((s, prev) => {
    if (s.theme !== prev.theme) update()
  })
}
