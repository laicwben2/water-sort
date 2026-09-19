import { useEffect, useRef, useState } from 'react'
import { Droplets } from 'lucide-react'
import { CompleteDialog } from './components/CompleteDialog'
import { Controls } from './components/Controls'
import { GameBoard } from './components/GameBoard'
import { useGame } from './game/useGame'
import { strings } from './i18n/strings'
import { useTheme } from './hooks/useTheme'
import { formatTime } from './utils/formatTime'

const ANIMATION_MS = 430

export default function App() {
  const game = useGame()
  const { state } = game
  const { theme, cycleTheme } = useTheme()
  const [selected, setSelected] = useState<number | null>(null)
  const [invalidTube, setInvalidTube] = useState<number | null>(null)
  const [animation, setAnimation] = useState<{ from: number; to: number } | null>(null)
  const [message, setMessage] = useState<string>(strings.selectSource)
  const animationTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (animationTimer.current !== null) window.clearTimeout(animationTimer.current)
  }, [])

  function showInvalid(index: number) {
    setInvalidTube(index)
    setMessage(strings.invalidMove)
    window.setTimeout(() => setInvalidTube(null), 360)
  }

  function handleTubeClick(index: number) {
    if (animation || state.completed) return
    if (selected === null) {
      if (state.board[index].length === 0) {
        showInvalid(index)
        return
      }
      setSelected(index)
      setMessage(strings.selectTarget)
      return
    }
    if (selected === index) {
      setSelected(null)
      setMessage(strings.selectSource)
      return
    }
    const move = game.pour(selected, index)
    if (!move) {
      showInvalid(index)
      return
    }
    setAnimation({ from: selected, to: index })
    setSelected(null)
    setMessage(strings.selectSource)
    animationTimer.current = window.setTimeout(() => setAnimation(null), ANIMATION_MS)
  }

  const title = state.mode === 'level' ? `${strings.level} ${state.level}` : strings.randomGame

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label={strings.appName} onClick={(event) => event.preventDefault()}>
          <span className="brand-mark"><Droplets aria-hidden="true" /></span>
          <span>{strings.appName}</span>
        </a>
        <div className="mode-badge">{state.difficulty}</div>
      </header>

      <main className="game-layout">
        <section className="game-card" aria-labelledby="game-title">
          <div className="game-heading">
            <div>
              <p className="eyebrow">{state.mode === 'level' ? 'Seeded journey' : 'Fresh arrangement'}</p>
              <h1 id="game-title">{title}</h1>
            </div>
            <div className="score-strip" aria-label="Current game statistics">
              <div><span>{strings.moves}</span><strong data-testid="move-count">{state.moveCount}</strong></div>
              <div><span>{strings.time}</span><strong data-testid="timer">{formatTime(state.elapsedSeconds)}</strong></div>
            </div>
          </div>

          <div className="board-stage">
            <div className="ambient-orb ambient-one" />
            <div className="ambient-orb ambient-two" />
            <GameBoard
              board={state.board}
              capacity={4}
              selected={selected}
              invalidTube={invalidTube}
              animation={animation}
              locked={Boolean(animation)}
              onTubeClick={handleTubeClick}
            />
          </div>

          <p className={`instruction ${message === strings.invalidMove ? 'is-error' : ''}`} aria-live="polite">
            <span className="instruction-dot" />{message}
          </p>
        </section>

        <aside className="side-panel" aria-label="Game controls and records">
          <Controls
            difficulty={state.difficulty}
            canUndo={state.history.length > 0 && !state.completed}
            theme={theme}
            onDifficulty={game.changeDifficulty}
            onUndo={() => { game.undo(); setSelected(null) }}
            onRestart={() => { game.restart(); setSelected(null) }}
            onNewGame={() => { game.newRandomGame(); setSelected(null) }}
            onTheme={cycleTheme}
          />
          <section className="record-card">
            <p className="eyebrow">Personal best</p>
            <div className="record-grid">
              <div><span>{strings.bestMoves}</span><strong>{state.record.bestMoves ?? '—'}</strong></div>
              <div><span>{strings.bestTime}</span><strong>{state.record.bestTime === undefined ? '—' : formatTime(state.record.bestTime)}</strong></div>
            </div>
            <div className="progress-line"><span style={{ width: state.mode === 'level' ? `${Math.min(100, 28 + (state.level % 5) * 14)}%` : '64%' }} /></div>
            <small>{state.mode === 'level' ? `Level ${state.level} of your ${state.difficulty} journey` : 'A one-of-a-kind seeded puzzle'}</small>
          </section>
        </aside>
      </main>

      <footer>Every level is seeded, replayable, and generated with a guaranteed solution.</footer>

      <CompleteDialog
        open={state.completed}
        moves={state.moveCount}
        time={state.elapsedSeconds}
        record={state.record}
        mode={state.mode}
        onReplay={game.replay}
        onNext={state.mode === 'level' ? game.nextLevel : game.newRandomGame}
      />
    </div>
  )
}
