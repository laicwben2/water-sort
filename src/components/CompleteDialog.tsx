import { strings } from '../i18n/strings'
import { formatTime } from '../utils/formatTime'
import type { GameRecord } from '../game/types'

interface CompleteDialogProps {
  open: boolean
  moves: number
  time: number
  record: GameRecord
  mode: 'level' | 'random'
  onNext: () => void
  onReplay: () => void
}

export function CompleteDialog(props: CompleteDialogProps) {
  if (!props.open) return null
  return (
    <div className="complete-backdrop" role="presentation">
      <section className="complete-card" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <div className="complete-mark" aria-hidden="true"><span>✓</span></div>
        <p className="complete-kicker">Clear &amp; collected</p>
        <h2 id="complete-title">{strings.levelComplete}</h2>
        <div className="complete-stats">
          <div><span>{strings.moves}</span><strong>{props.moves}</strong></div>
          <div><span>{strings.bestMoves}</span><strong>{props.record.bestMoves ?? '—'}</strong></div>
          <div><span>{strings.time}</span><strong>{formatTime(props.time)}</strong></div>
          <div><span>{strings.bestTime}</span><strong>{props.record.bestTime === undefined ? '—' : formatTime(props.record.bestTime)}</strong></div>
        </div>
        <div className="complete-actions">
          <button type="button" className="secondary-button" onClick={props.onReplay}>{strings.replay}</button>
          <button type="button" className="primary-button" onClick={props.onNext}>{props.mode === 'level' ? strings.nextLevel : strings.newGame}</button>
        </div>
      </section>
    </div>
  )
}
