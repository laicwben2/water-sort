import { Tube } from './Tube'
import type { Board } from '../game/types'

interface GameBoardProps {
  board: Board
  capacity: number
  selected: number | null
  invalidTube: number | null
  animation: { from: number; to: number } | null
  locked: boolean
  onTubeClick: (index: number) => void
}

export function GameBoard(props: GameBoardProps) {
  return (
    <div className="game-board" role="group" aria-label="Water sort puzzle board" style={{ '--tube-count': props.board.length } as React.CSSProperties}>
      {props.board.map((tube, index) => (
        <Tube
          key={index}
          tube={tube}
          index={index}
          capacity={props.capacity}
          selected={props.selected === index}
          invalid={props.invalidTube === index}
          pouringFrom={props.animation?.from === index}
          pouringTo={props.animation?.to === index}
          disabled={props.locked}
          onClick={() => props.onTubeClick(index)}
        />
      ))}
    </div>
  )
}
