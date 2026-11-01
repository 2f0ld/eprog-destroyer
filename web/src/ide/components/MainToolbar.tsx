import { useIde } from '../store'
import { Icon } from '../../ui/Icon'
import { openMenuBelow, type MenuItem } from '../../ui/Menu'
import { mainMenu } from '../mainMenu'
import { runAction } from '../actions'
import { findMainClasses, runMain } from '../runner'
import { BranchIcon } from '../../ui/BranchIcon'
import { PLAYGROUND } from '../store'
import { taskById } from '../../tasks/catalog'
import { openPlayground, openTask } from '../../tasks/taskActions'
import { useTasks } from '../../tasks/progress'
import { useDebugger } from '../../debugger/store'
import { startDebug } from '../../debugger/debugClient'
import { AccountWidget } from '../../account/AccountWidget'

function projectInitials(name: string) {
  const parts = name.split(/[-_\s]+/).filter(Boolean)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase()
}

export function MainToolbar() {
  const projectName = useIde((s) => s.projectName)
  const runConfig = useIde((s) => s.runConfig)
  const runState = useIde((s) => s.runState)
  const files = useIde((s) => s.files)
  const debugging = useDebugger((s) => s.session !== null && s.session.state !== 'finished')
  const running = runState !== 'idle' || debugging

  // project widget: recent projects (the sample project and opened tasks), like IntelliJ's project switcher
  const projectMenu = (): MenuItem[] => {
    const s = useIde.getState()
    const ids = [s.projectId, ...Object.keys(s.workspaces)]
    const progress = useTasks.getState().progress
    const items = ids.map<MenuItem>((id) => {
      const task = id.startsWith('task:') ? taskById.get(id.slice(5)) : null
      const name = id === s.projectId ? s.projectName : (s.workspaces[id]?.projectName ?? id)
      return {
        type: 'item',
        text: task ? `${name} — ${task.title}` : name,
        icon: task ? (progress[task.id]?.status === 'solved' ? 'edu/eduTaskDone' : 'edu/eduTaskDefault') : 'nodes/ideaProject',
        checked: id === s.projectId,
        run: () => (id === PLAYGROUND ? openPlayground() : task ? openTask(task.id) : undefined),
      }
    })
    return [{ type: 'action', id: 'BrowsePracticeTasks' }, { type: 'separator' }, ...items]
  }

  const runConfigMenu = (): MenuItem[] => {
    const mains = findMainClasses(files)
    return [
      ...mains.map<MenuItem>((m) => ({
        type: 'submenu',
        text: m.fqn,
        icon: 'nodes/class',
        items: [
          { type: 'item', text: 'Run', icon: 'run/run', run: () => runMain(m.fqn) },
          { type: 'item', text: 'Debug', icon: 'run/debug', run: () => void startDebug(m.fqn) },
          { type: 'separator' },
          { type: 'item', text: 'Select', run: () => useIde.getState().setRunConfig(m.fqn) },
        ],
      })),
      ...(mains.length ? [{ type: 'separator' } as MenuItem] : []),
      { type: 'item', text: 'Edit Configurations...', disabled: true, run: () => {} },
    ]
  }

  return (
    <div className="ij-main-toolbar">
      <div className="ij-toolbar-gradient" />
      <div className="ij-toolbar-left">
        <button className="ij-tb-icon" title="Main Menu" onClick={(e) => openMenuBelow(e.currentTarget, mainMenu(), 200)}>
          <Icon name="general/menu" size={20} />
        </button>
        <button data-tour="project-widget" className="ij-tb-widget ij-project-widget" title={`~/IdeaProjects/${projectName}`} onClick={(e) => openMenuBelow(e.currentTarget, projectMenu(), 260)}>
          <span className="ij-project-avatar">{projectInitials(projectName)}</span>
          <span className="ij-project-name">{projectName}</span>
          <Icon name="general/chevronDown" />
        </button>
        <button className="ij-tb-widget" title="Git Branch: main">
          <BranchIcon />
          <span>main</span>
          <Icon name="general/chevronDown" />
        </button>
      </div>
      <div className="ij-toolbar-center" />
      <div className="ij-toolbar-right">
        <button className="ij-tb-widget ij-run-config" onClick={(e) => openMenuBelow(e.currentTarget, runConfigMenu(), 240)}>
          {runConfig ? <Icon name="nodes/class" /> : null}
          <span>{runConfig ?? 'Current File'}</span>
          <Icon name="general/chevronDown" />
        </button>
        {running ? (
          <>
            <button className="ij-tb-icon" title={`Rerun '${runConfig}'  Ctrl+F5`} onClick={() => runAction('Run')}>
              <Icon name="run/rerun" size={20} />
            </button>
            <button className="ij-tb-icon" title="Debug  Shift+F9" onClick={() => runAction('Debug')}>
              <Icon name="run/debug" size={20} />
            </button>
            <button className="ij-tb-icon ij-stop-btn" title="Stop  Ctrl+F2" onClick={() => runAction('Stop')}>
              <Icon name="run/stop" size={20} />
            </button>
          </>
        ) : (
          <>
            <button data-tour="run" className="ij-tb-icon" title={`Run '${runConfig ?? ''}'  Shift+F10`} onClick={() => runAction('Run')}>
              <Icon name="run/run" size={20} />
            </button>
            <button className="ij-tb-icon" title={`Debug '${runConfig ?? ''}'  Shift+F9`} onClick={() => runAction('Debug')}>
              <Icon name="run/debug" size={20} />
            </button>
          </>
        )}
        <button
          className="ij-tb-icon"
          title="More Actions"
          onClick={(e) =>
            openMenuBelow(e.currentTarget, [
              { type: 'action', id: 'RunClass' },
              { type: 'item', text: 'Run with Coverage', icon: 'run/runWithCoverage', disabled: true, run: () => {} },
              { type: 'item', text: 'Profile', icon: 'run/profile', disabled: true, run: () => {} },
            ])
          }
        >
          <Icon name="general/moreVertical" size={20} />
        </button>
        <div className="ij-tb-gap" />
        <button data-tour="search" className="ij-tb-icon" title="Search Everywhere  Double Shift" onClick={() => runAction('SearchEverywhere')}>
          <Icon name="general/search" size={20} />
        </button>
        <button className="ij-tb-icon" title="IDE and Project Settings" onClick={() => runAction('ShowSettings')}>
          <Icon name="general/settings" size={20} />
        </button>
        <AccountWidget />
      </div>
    </div>
  )
}
