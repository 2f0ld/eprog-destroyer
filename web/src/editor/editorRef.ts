import type * as Monaco from 'monaco-editor/editor/editor.api'

/** The single Monaco editor instance of the IDE window (null until mounted). */
let active: Monaco.editor.IStandaloneCodeEditor | null = null

export const setActiveEditor = (e: Monaco.editor.IStandaloneCodeEditor | null) => {
  active = e
}
export const getActiveEditor = () => active
