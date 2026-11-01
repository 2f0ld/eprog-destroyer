import type { MenuItem } from '../ui/Menu'
import { useIde } from './store'

const a = (id: string, text?: string): MenuItem => ({ type: 'action', id, text })
const sep: MenuItem = { type: 'separator' }
const disabled = (text: string, shortcut?: string): MenuItem => ({ type: 'item', text, shortcut, disabled: true, run: () => {} })

/** The main menu (hamburger button in the New UI on Windows/Linux). Mirrors IntelliJ's structure. */
export function mainMenu(): MenuItem[] {
  const theme = useIde.getState().theme
  return [
    {
      type: 'submenu',
      text: 'File',
      items: [
        { type: 'submenu', text: 'New', items: [a('NewClass'), a('NewFile'), a('NewDir')] },
        { type: 'submenu', text: 'Learn and Teach', items: [a('BrowsePracticeTasks'), a('Educational.Check'), a('Educational.RefreshTask')] },
        a('OpenPlayground'),
        disabled('Open...'),
        disabled('Recent Projects'),
        disabled('Close Project'),
        sep,
        a('ShowSettings'),
        disabled('Project Structure...', 'Ctrl+Alt+Shift+S'),
        sep,
        a('SaveAll'),
        disabled('Reload All from Disk', 'Ctrl+Alt+Y'),
        sep,
        a('ResetProject'),
      ],
    },
    {
      type: 'submenu',
      text: 'Edit',
      items: [
        a('Undo'),
        a('Redo'),
        sep,
        a('Cut'),
        a('Copy'),
        a('Paste'),
        sep,
        { type: 'submenu', text: 'Find', items: [a('Find'), a('Replace')] },
        sep,
        a('SelectAll'),
        a('Duplicate'),
        a('DeleteLine'),
      ],
    },
    {
      type: 'submenu',
      text: 'View',
      items: [
        {
          type: 'submenu',
          text: 'Tool Windows',
          items: [a('ActivateProjectToolWindow'), a('ActivateCommitToolWindow'), a('ActivateStructureToolWindow'), a('ActivateRunToolWindow'), a('ActivateProblemsViewToolWindow'), a('ActivateTerminalToolWindow'), a('ActivateNotificationsToolWindow')],
        },
        {
          type: 'submenu',
          text: 'Appearance',
          items: [
            { type: 'item', text: 'Islands Dark', checked: theme === 'islands-dark', run: () => useIde.getState().setTheme('islands-dark') },
            { type: 'item', text: 'Islands Light', checked: theme === 'islands-light', run: () => useIde.getState().setTheme('islands-light') },
            sep,
            a('HideAllWindows'),
          ],
        },
        sep,
        a('RecentFiles'),
      ],
    },
    {
      type: 'submenu',
      text: 'Navigate',
      items: [a('GotoClass'), a('GotoFile'), a('SearchEverywhere'), sep, a('GotoLine'), a('GotoDeclaration'), sep, a('SelectInProjectView'), a('NextTab'), a('PreviousTab')],
    },
    {
      type: 'submenu',
      text: 'Code',
      items: [
        a('CodeCompletion', 'Code Completion'),
        a('ShowIntentionActions'),
        a('Generate'),
        sep,
        a('CommentByLineComment'),
        a('CommentByBlockComment'),
        a('ReformatCode'),
        a('OptimizeImports'),
        sep,
        { type: 'submenu', text: 'Folding', items: [a('CollapseAll'), a('ExpandAll')] },
        a('MoveLineUp'),
        a('MoveLineDown'),
      ],
    },
    { type: 'submenu', text: 'Refactor', items: [a('RenameElement'), disabled('Extract Method...', 'Ctrl+Alt+M'), disabled('Introduce Variable...', 'Ctrl+Alt+V')] },
    { type: 'submenu', text: 'Build', items: [a('BuildProject')] },
    {
      type: 'submenu',
      text: 'Run',
      items: [a('Run'), a('Debug'), a('RunClass'), sep, a('Stop'), sep, a('StepOver'), a('StepInto'), a('StepOut'), sep, a('Pause'), a('Resume'), sep, a('ToggleLineBreakpoint'), a('MuteBreakpoints')],
    },
    { type: 'submenu', text: 'Tools', items: [disabled('Generate JavaDoc...')] },
    { type: 'submenu', text: 'Git', items: [disabled('Commit...', 'Ctrl+K'), disabled('Push...', 'Ctrl+Shift+K')] },
    { type: 'submenu', text: 'Window', items: [a('CloseContent'), a('CloseAllEditors')] },
    { type: 'submenu', text: 'Help', items: [a('IntroTour'), a('GotoAction'), a('Keymap'), sep, a('About')] },
  ]
}
