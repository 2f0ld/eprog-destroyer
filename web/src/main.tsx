import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/400-italic.css'
import '@fontsource/jetbrains-mono/700.css'
import './editor/monacoSetup'
import './styles/ide.css'
import App from './App'
import { applyUiTheme, uiThemes } from './theme/uiThemes'
import { useIde } from './ide/store'
import { getActiveEditor } from './editor/editorRef'

if (import.meta.env.DEV) {
  // handles for scripts/smoke.mjs and debugging in the console
  Object.assign(window, { __ide_store: useIde, __ide_editor_ref: getActiveEditor })
  Object.defineProperty(window, '__ide_editor', { get: getActiveEditor })
}

// apply the theme before first paint to avoid a flash
applyUiTheme(uiThemes[useIde.getState().theme])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
