import { useEffect, useRef, useState } from 'react'

interface SelectorProps {
  label: string
  values: string[]
  index: number
  active: boolean
  /** Per-value availability (e.g. Perfekt/Futur while a modal is active). */
  available: boolean[]
  onSelect: (index: number) => void
  onSpin: (direction: 1 | -1) => void
  onActivate: () => void
  /** Original dial number, shown as the keyboard shortcut in the heading. */
  dialNumber: number
}

const WHEEL_STEP_PX = 40

/**
 * One fixed-position vertical selector: every value is visible, the current
 * one is highlighted. Click a value to select it; the mouse wheel steps
 * (clamped, no wrap). Unavailable values render dimmed and inert.
 */
export function Selector({
  label,
  values,
  index,
  active,
  available,
  onSelect,
  onSpin,
  onActivate,
  dialNumber,
}: SelectorProps) {
  // Mouse wheel: rates differ wildly between trackpads and discrete wheels —
  // accumulate deltaY and consume it in fixed steps, never once per event.
  const listRef = useRef<HTMLDivElement>(null)
  const wheelAccum = useRef(0)
  const spinRef = useRef(onSpin)
  spinRef.current = onSpin
  const activateRef = useRef(onActivate)
  activateRef.current = onActivate

  useEffect(() => {
    const list = listRef.current!
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      activateRef.current()
      wheelAccum.current += event.deltaY
      while (wheelAccum.current >= WHEEL_STEP_PX) {
        wheelAccum.current -= WHEEL_STEP_PX
        spinRef.current(1)
      }
      while (wheelAccum.current <= -WHEEL_STEP_PX) {
        wheelAccum.current += WHEEL_STEP_PX
        spinRef.current(-1)
      }
    }
    list.addEventListener('wheel', onWheel, { passive: false })
    return () => list.removeEventListener('wheel', onWheel)
  }, [])

  const [expanded, setExpanded] = useState(false)
  const canCollapse = values.length > 3
  // Keep exactly three rows in the regular view. As the selection moves past
  // the edge, this is a viewport over the values rather than an expanding card.
  const start = Math.max(0, Math.min(index - 1, values.length - 3))
  const shown = expanded ? values.map((value, i) => ({ value, i })) : values.slice(start, start + 3).map((value, offset) => ({ value, i: start + offset }))

  return (
    <div className="selector-block">
      <button type="button" className={`selector-head${active ? ' selector-head-active' : ''}`} onClick={onActivate}>
        <span className="selector-key">{dialNumber}</span>
        <span>{label}</span>
      </button>
      <div
        ref={listRef}
        className={`selector${active ? ' selector-active' : ''}`}
        onClick={onActivate}
      >
        {shown.map(({ value, i }) => (
          <button
            key={value}
            type="button"
            className={`option${i === index ? ' option-current' : ''}${
              available[i] ? '' : ' option-unavailable'
            }`}
            disabled={!available[i]}
            onClick={() => onSelect(i)}
          >
            {value}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`selector-more${canCollapse ? '' : ' selector-more-empty'}`}
        aria-expanded={expanded}
        disabled={!canCollapse}
        onClick={() => setExpanded((open) => !open)}
      >
        {canCollapse ? (expanded ? 'weniger' : `alle ${values.length} zeigen`) : '\u00a0'}
      </button>
    </div>
  )
}
