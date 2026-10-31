import type * as Monaco from 'monaco-editor/editor/editor.api'

/**
 * Java language definition for Monaco.
 *
 * The Monarch tokenizer does the lexical part (keywords, literals, comments).
 * IntelliJ-specific colouring that needs context — method declarations,
 * fields, static members — is added on top by the semantic token provider in
 * ./semantic.ts.
 */

export const JAVA_KEYWORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
  'volatile', 'while', 'true', 'false', 'null', 'var', 'record', 'yield', 'sealed', 'permits',
  'non-sealed',
]

export const javaLanguageConfiguration: Monaco.languages.LanguageConfiguration = {
  wordPattern: /(-?\d*\.\d\w*)|([^`~!#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string', 'comment'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '/**', close: ' */', notIn: ['string'] },
  ],
  colorizedBracketPairs: [],
  indentationRules: {
    increaseIndentPattern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/,
    decreaseIndentPattern: /^\s*[}\])]/,
  }, // IntelliJ does not colour bracket pairs
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: { start: /^\s*\/\/\s*(?:(?:#?region\b)|(?:<editor-fold\b))/, end: /^\s*\/\/\s*(?:(?:#?endregion\b)|(?:<\/editor-fold>))/ },
  },
  onEnterRules: [
    // Javadoc: "/** |" + Enter  →  " * |" and closing " */"
    {
      beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/,
      afterText: /^\s*\*\/$/,
      action: { indentAction: 2 /* IndentOutdent */, appendText: ' * ' },
    },
    { beforeText: /^\s*\/\*\*(?!\/)([^*]|\*(?!\/))*$/, action: { indentAction: 0, appendText: ' * ' } },
    { beforeText: /^(\t|( {2}))* \*( ([^*]|\*(?!\/))*)?$/, action: { indentAction: 0, appendText: '* ' } },
    { beforeText: /^(\t|( {2}))* \*\/\s*$/, action: { indentAction: 0, removeText: 1 } },
  ],
}

export const javaMonarch: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '',
  keywords: JAVA_KEYWORDS,
  operators: [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-',
    '*', '/', '&', '|', '^', '%', '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
    '%=', '<<=', '>>=', '>>>=', '->', '::',
  ],
  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes: /\\(?:[btnfrs"'\\]|[0-7]{1,3}|u+[0-9A-Fa-f]{4})/,
  digits: /\d+(_+\d+)*/,
  hexdigits: /[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  binarydigits: /[01]+(_+[01]+)*/,
  tokenizer: {
    root: [
      ['non-sealed', 'keyword'],
      [/[a-zA-Z_$][\w$]*/, { cases: { '@keywords': 'keyword', '[A-Z][\\w$]*': 'type', '@default': 'identifier' } }],
      { include: '@whitespace' },
      [/@\s*[a-zA-Z_$][\w$.]*/, 'annotation'],
      [/[{}()[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      [/(@digits)[eE]([-+]?(@digits))?[fFdD]?/, 'number'],
      [/(@digits)\.(@digits)?([eE][-+]?(@digits))?[fFdD]?/, 'number'],
      [/\.(@digits)([eE][-+]?(@digits))?[fFdD]?/, 'number'],
      [/0[xX](@hexdigits)[Ll]?/, 'number'],
      [/0[bB](@binarydigits)[Ll]?/, 'number'],
      [/(@digits)[fFdDlL]?/, 'number'],
      [/[;,.]/, 'delimiter'],
      [/"""/, 'string', '@textblock'],
      [/"([^"\\]|\\.)*$/, 'string'], // unterminated
      [/"/, 'string', '@string'],
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
      [/'/, 'string.escape.invalid'],
    ],
    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*\*(?!\/)/, 'comment.doc', '@javadoc'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],
    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
    javadoc: [
      [/@[a-zA-Z]+/, 'comment.doc.tag'],
      [/[^/*@]+/, 'comment.doc'],
      [/\*\//, 'comment.doc', '@pop'],
      [/[/*@]/, 'comment.doc'],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],
    textblock: [
      [/\\"""/, 'string.escape'],
      [/"""/, 'string', '@pop'],
      [/@escapes/, 'string.escape'],
      [/[^"\\]+/, 'string'],
      [/./, 'string'],
    ],
  },
}

export function registerJava(monaco: typeof Monaco) {
  if (!monaco.languages.getLanguages().some((l) => l.id === 'java')) {
    monaco.languages.register({ id: 'java', extensions: ['.java'], aliases: ['Java', 'java'] })
  }
  monaco.languages.setLanguageConfiguration('java', javaLanguageConfiguration)
  monaco.languages.setMonarchTokensProvider('java', javaMonarch)
}
