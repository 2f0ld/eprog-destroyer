import type * as Monaco from 'monaco-editor/editor/editor.api'
import { analyze, type Analysis, type SemKind } from './analyzer'

const TOKEN_TYPES = ['method', 'property', 'typeParameter']
const TOKEN_MODIFIERS = ['declaration', 'static', 'readonly']

const ENCODING: Record<SemKind, [number, number]> = {
  'method.declaration': [0, 0b001],
  'method.static': [0, 0b010],
  property: [1, 0],
  'property.static': [1, 0b010],
  'property.static.readonly': [1, 0b110],
  typeParameter: [2, 0],
}

const cache = new WeakMap<Monaco.editor.ITextModel, { version: number; analysis: Analysis }>()

/** Analysis of a model, memoized per model version. */
export function analysisFor(model: Monaco.editor.ITextModel): Analysis {
  const v = model.getVersionId()
  const hit = cache.get(model)
  if (hit && hit.version === v) return hit.analysis
  const analysis = analyze(model.getValue())
  cache.set(model, { version: v, analysis })
  return analysis
}

export function registerJavaSemanticTokens(monaco: typeof Monaco) {
  monaco.languages.registerDocumentSemanticTokensProvider('java', {
    getLegend: () => ({ tokenTypes: TOKEN_TYPES, tokenModifiers: TOKEN_MODIFIERS }),
    provideDocumentSemanticTokens(model) {
      const { semantic } = analysisFor(model)
      const data = new Uint32Array(semantic.length * 5)
      let prevLine = 0
      let prevCol = 0
      semantic.forEach((s, k) => {
        const [type, mods] = ENCODING[s.kind]
        const dl = s.line - prevLine
        data[k * 5] = dl
        data[k * 5 + 1] = dl === 0 ? s.col - prevCol : s.col
        data[k * 5 + 2] = s.length
        data[k * 5 + 3] = type
        data[k * 5 + 4] = mods
        prevLine = s.line
        prevCol = s.col
      })
      return { data }
    },
    releaseDocumentSemanticTokens() {},
  })
}
