import { useEffect } from 'react'
import { IdeWindow } from './ide/IdeWindow'
import { useIde } from './ide/store'
import { applyUiTheme, uiThemes } from './theme/uiThemes'

export default function App() {
  const theme = useIde((s) => s.theme)
  useEffect(() => applyUiTheme(uiThemes[theme]), [theme])
  return <IdeWindow />
}
