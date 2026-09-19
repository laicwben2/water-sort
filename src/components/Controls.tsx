import { Moon, RotateCcw, Shuffle, Sun, Undo2 } from 'lucide-react'
import { strings } from '../i18n/strings'
import type { Difficulty } from '../game/types'
import type { ThemeMode } from '../hooks/useTheme'

interface ControlsProps {
  difficulty: Difficulty
  canUndo: boolean
  theme: ThemeMode
  onDifficulty: (difficulty: Difficulty) => void
  onUndo: () => void
  onRestart: () => void
  onNewGame: () => void
  onTheme: () => void
}

export function Controls(props: ControlsProps) {
  const themeLabel = props.theme === 'system' ? strings.themeSystem : props.theme === 'light' ? strings.themeLight : strings.themeDark
  return (
    <div className="control-panel">
      <label className="difficulty-control">
        <span>{strings.difficulty}</span>
        <select value={props.difficulty} onChange={(event) => props.onDifficulty(event.target.value as Difficulty)}>
          <option value="easy">{strings.easy}</option>
          <option value="medium">{strings.medium}</option>
          <option value="hard">{strings.hard}</option>
        </select>
      </label>
      <div className="action-row">
        <button type="button" className="icon-action" onClick={props.onUndo} disabled={!props.canUndo} aria-label={strings.undo} title={strings.undo}>
          <Undo2 aria-hidden="true" /> <span>{strings.undo}</span>
        </button>
        <button type="button" className="icon-action" onClick={props.onRestart} aria-label={strings.restart} title={strings.restart}>
          <RotateCcw aria-hidden="true" /> <span>{strings.restart}</span>
        </button>
        <button type="button" className="icon-action" onClick={props.onNewGame} aria-label={strings.newGame} title={strings.newGame}>
          <Shuffle aria-hidden="true" /> <span>{strings.newGame}</span>
        </button>
        <button type="button" className="icon-action theme-action" onClick={props.onTheme} aria-label={themeLabel} title={themeLabel}>
          {props.theme === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />} <span>{strings.theme}</span>
        </button>
      </div>
    </div>
  )
}
