import { useEffect, useRef } from 'react'

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

  const width = Math.max(...values.map((v) => v.length), label.length) + 3

  return (
    <div className="selector-block">
      <div className="selector-head">{label}</div>
      <div
        ref={listRef}
        className={`selector${active ? ' selector-active' : ''}`}
        style={{ width: `${width}ch` }}
        onClick={onActivate}
      >
        {values.map((value, i) => (
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
    </div>
  )
}
