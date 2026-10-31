import type * as Monaco from 'monaco-editor/editor/editor.api'

/**
 * Editor color schemes, translated from IntelliJ's color scheme XML files:
 *   islands/IslandSchemeDark.xml  ("Islands Dark", parent Darcula)
 *   expUI/expUI_lightScheme.xml   ("Light", used by Islands Light)
 *
 * Token names on the left are emitted by our Java tokenizer (java/language.ts)
 * and semantic token provider (java/semantic.ts). The IntelliJ attribute key
 * they mirror is noted on the right.
 */

export const DARK_EDITOR_THEME = 'intellij-islands-dark'
export const LIGHT_EDITOR_THEME = 'intellij-islands-light'

export function defineEditorThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme(DARK_EDITOR_THEME, {
    base: 'vs-dark',
    inherit: false,
    rules: [
      { token: '', foreground: 'BCBEC4', background: '191A1C' }, // TEXT
      { token: 'keyword', foreground: 'CF8E6D' }, // DEFAULT_KEYWORD
      { token: 'string', foreground: '6AAB73' }, // DEFAULT_STRING
      { token: 'string.escape', foreground: 'CF8E6D' }, // DEFAULT_VALID_STRING_ESCAPE
      { token: 'string.escape.invalid', foreground: 'F75464' },
      { token: 'number', foreground: '2AACB8' }, // DEFAULT_NUMBER
      { token: 'comment', foreground: '7A7E85' }, // DEFAULT_LINE_COMMENT / BLOCK_COMMENT
      { token: 'comment.doc', foreground: '5F826B', fontStyle: 'italic' }, // DEFAULT_DOC_COMMENT
      { token: 'comment.doc.tag', foreground: '67A37C', fontStyle: 'italic underline' }, // DEFAULT_DOC_COMMENT_TAG
      { token: 'annotation', foreground: 'B3AE60' }, // DEFAULT_METADATA
      { token: 'identifier', foreground: 'BCBEC4' },
      { token: 'type', foreground: 'BCBEC4' }, // CLASS_NAME_ATTRIBUTES (default text in Islands Dark)
      { token: 'delimiter', foreground: 'BCBEC4' },
      { token: 'operator', foreground: 'BCBEC4' },
      // semantic tokens
      { token: 'method.declaration', foreground: '56A8F5' }, // DEFAULT_FUNCTION_DECLARATION
      { token: 'method.static', foreground: '57AAF7', fontStyle: 'italic' }, // DEFAULT_STATIC_METHOD (call)
      { token: 'method', foreground: 'BCBEC4' }, // DEFAULT_FUNCTION_CALL
      { token: 'property', foreground: 'C77DBB' }, // DEFAULT_INSTANCE_FIELD
      { token: 'property.static', foreground: 'C77DBB', fontStyle: 'italic' }, // DEFAULT_STATIC_FIELD
      { token: 'property.static.readonly', foreground: 'C77DBB', fontStyle: 'italic' }, // DEFAULT_CONSTANT
      { token: 'typeParameter', foreground: '16BAAC' }, // TYPE_PARAMETER_NAME_ATTRIBUTES
      { token: 'parameter', foreground: 'BCBEC4' },
      { token: 'variable', foreground: 'BCBEC4' },
      { token: 'unused', foreground: '6F737A' }, // NOT_USED_ELEMENT_ATTRIBUTES
    ],
    colors: {
      'editor.background': '#191A1C',
      'editor.foreground': '#BCBEC4',
      'editorCursor.foreground': '#CED0D6', // CARET_COLOR
      'editor.lineHighlightBackground': '#1F2024', // CARET_ROW_COLOR
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#4B5059', // LINE_NUMBERS_COLOR
      'editorLineNumber.activeForeground': '#A1A3AB', // LINE_NUMBER_ON_CARET_ROW_COLOR
      'editor.selectionBackground': '#214283', // SELECTION_BACKGROUND (Darcula)
      'editor.inactiveSelectionBackground': '#21428399',
      'editor.selectionHighlightBackground': '#373B39',
      'editor.wordHighlightBackground': '#373B39', // IDENTIFIER_UNDER_CARET_ATTRIBUTES
      'editor.wordHighlightStrongBackground': '#373B39',
      'editor.wordHighlightTextBackground': '#373B39',
      'editor.findMatchBackground': '#2D543F', // SEARCH_RESULT_ATTRIBUTES
      'editor.findMatchHighlightBackground': '#2D543F99',
      'editorBracketMatch.background': '#43454A', // MATCHED_BRACE_ATTRIBUTES
      'editorBracketMatch.border': '#00000000',
      'editorIndentGuide.background1': '#323438', // INDENT_GUIDE
      'editorIndentGuide.activeBackground1': '#4E5157', // SELECTED_INDENT_GUIDE
      'editorRuler.foreground': '#323438', // RIGHT_MARGIN_COLOR
      'editorWhitespace.foreground': '#6F737A',
      'editorGutter.background': '#191A1C',
      'editorGutter.addedBackground': '#549159',
      'editorGutter.modifiedBackground': '#375FAD',
      'editorGutter.deletedBackground': '#868A91',
      'editorError.foreground': '#FA6675', // ERRORS_ATTRIBUTES effect color
      'editorWarning.foreground': '#F2C55C', // WARNING_ATTRIBUTES effect color
      'editorInfo.foreground': '#857042',
      'editorOverviewRuler.border': '#00000000',
      'editorOverviewRuler.errorForeground': '#D64D5B',
      'editorOverviewRuler.warningForeground': '#C29E4A',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#FFFFFF26',
      'scrollbarSlider.hoverBackground': '#FFFFFF40',
      'scrollbarSlider.activeBackground': '#FFFFFF4D',
      'editorWidget.background': '#26282C',
      'editorWidget.border': '#33353B',
      'editorSuggestWidget.background': '#26282C', // LOOKUP (completion popup)
      'editorSuggestWidget.border': '#33353B',
      'editorSuggestWidget.foreground': '#D1D3D9',
      'editorSuggestWidget.selectedBackground': '#2E436E',
      'editorSuggestWidget.selectedForeground': '#D1D3D9',
      'editorSuggestWidget.highlightForeground': '#548AF7',
      'editorSuggestWidget.focusHighlightForeground': '#548AF7',
      'editorHoverWidget.background': '#26282C',
      'editorHoverWidget.border': '#33353B',
      'editorStickyScroll.background': '#191A1C',
      'editorStickyScrollHover.background': '#26282C',
      'editorStickyScroll.shadow': '#00000000',
      'editorStickyScroll.border': '#33353B',
      'input.background': '#191A1C',
      'input.border': '#40434A',
      'focusBorder': '#3871E1',
      'editorCodeLens.foreground': '#868A91',
      'editorInlayHint.foreground': '#858A94', // INLINE_PARAMETER_HINT
      'editorInlayHint.background': '#393B40',
    },
  })

  monaco.editor.defineTheme(LIGHT_EDITOR_THEME, {
    base: 'vs',
    inherit: false,
    rules: [
      { token: '', foreground: '080808', background: 'FFFFFF' },
      { token: 'keyword', foreground: '0033B3' },
      { token: 'string', foreground: '067D17' },
      { token: 'string.escape', foreground: '0037A6' },
      { token: 'string.escape.invalid', foreground: 'F50000' },
      { token: 'number', foreground: '1750EB' },
      { token: 'comment', foreground: '8C8C8C', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '8C8C8C', fontStyle: 'italic' },
      { token: 'comment.doc.tag', foreground: '8C8C8C', fontStyle: 'italic underline' },
      { token: 'annotation', foreground: '9E880D' },
      { token: 'identifier', foreground: '080808' },
      { token: 'type', foreground: '080808' },
      { token: 'delimiter', foreground: '080808' },
      { token: 'operator', foreground: '080808' },
      { token: 'method.declaration', foreground: '00627A' },
      { token: 'method.static', foreground: '080808', fontStyle: 'italic' },
      { token: 'method', foreground: '080808' },
      { token: 'property', foreground: '871094' },
      { token: 'property.static', foreground: '871094', fontStyle: 'italic' },
      { token: 'property.static.readonly', foreground: '871094', fontStyle: 'italic' },
      { token: 'typeParameter', foreground: '007E8A' },
      { token: 'parameter', foreground: '080808' },
      { token: 'variable', foreground: '080808' },
      { token: 'unused', foreground: '808080' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#080808',
      'editorCursor.foreground': '#000000',
      'editor.lineHighlightBackground': '#F5F8FE',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#AEB3C2',
      'editorLineNumber.activeForeground': '#767A8A',
      'editor.selectionBackground': '#A6D2FF',
      'editor.inactiveSelectionBackground': '#A6D2FF99',
      'editor.selectionHighlightBackground': '#EDEBFC',
      'editor.wordHighlightBackground': '#EDEBFC',
      'editor.wordHighlightStrongBackground': '#EDEBFC',
      'editor.wordHighlightTextBackground': '#EDEBFC',
      'editor.findMatchBackground': '#F2D99A',
      'editor.findMatchHighlightBackground': '#F6EAC0',
      'editorBracketMatch.background': '#93D9D9',
      'editorBracketMatch.border': '#00000000',
      'editorIndentGuide.background1': '#EBECF0',
      'editorIndentGuide.activeBackground1': '#C9CCD6',
      'editorRuler.foreground': '#EBECF0',
      'editorGutter.background': '#FFFFFF',
      'editorGutter.addedBackground': '#C9DEC1',
      'editorGutter.modifiedBackground': '#C3D6E8',
      'editorError.foreground': '#F50000',
      'editorWarning.foreground': '#F2BF57',
      'editorOverviewRuler.border': '#00000000',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#00000026',
      'scrollbarSlider.hoverBackground': '#00000040',
      'scrollbarSlider.activeBackground': '#0000004D',
      'editorWidget.background': '#FFFFFF',
      'editorWidget.border': '#D1D3D9',
      'editorSuggestWidget.background': '#FFFFFF',
      'editorSuggestWidget.border': '#D1D3D9',
      'editorSuggestWidget.foreground': '#000000',
      'editorSuggestWidget.selectedBackground': '#D0DFFE',
      'editorSuggestWidget.selectedForeground': '#000000',
      'editorSuggestWidget.highlightForeground': '#2A5FD6',
      'editorSuggestWidget.focusHighlightForeground': '#2A5FD6',
      'editorHoverWidget.background': '#FFFFFF',
      'editorHoverWidget.border': '#D1D3D9',
      'editorStickyScroll.background': '#FFFFFF',
      'editorStickyScrollHover.background': '#F5F8FE',
      'editorStickyScroll.shadow': '#00000000',
      'editorStickyScroll.border': '#EBECF0',
      'input.background': '#FFFFFF',
      'input.border': '#D1D3D9',
      'focusBorder': '#3871E1',
      'editorInlayHint.foreground': '#808080',
      'editorInlayHint.background': '#EDEFF3',
    },
  })
}
