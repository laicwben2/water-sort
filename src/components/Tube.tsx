import type { Tube as TubeState } from '../game/types'

interface TubeProps {
  tube: TubeState
  index: number
  capacity: number
  selected: boolean
  invalid: boolean
  pouringFrom: boolean
  pouringTo: boolean
  disabled: boolean
  onClick: () => void
}

export function Tube({ tube, index, capacity, selected, invalid, pouringFrom, pouringTo, disabled, onClick }: TubeProps) {
  const classes = ['tube-button', selected && 'is-selected', invalid && 'is-invalid', pouringFrom && 'is-pouring', pouringTo && 'is-receiving']
    .filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Tube ${index + 1}, ${tube.length} of ${capacity} layers`}
      aria-pressed={selected}
      data-tube-index={index}
      data-colors={tube.join(',')}
    >
      <span className="tube" aria-hidden="true">
        <span className="tube-glint" />
        <span className="liquid-stack">
          {Array.from({ length: capacity }, (_, layer) => {
            const color = tube[layer]
            return <span key={layer} className="liquid-slot" style={color === undefined ? undefined : { '--liquid': `var(--liquid-${color})` } as React.CSSProperties}>
              {color !== undefined ? <span className="liquid"><span className="liquid-shine" /></span> : null}
            </span>
          })}
        </span>
      </span>
      <span className="tube-number" aria-hidden="true">{index + 1}</span>
    </button>
  )
}
