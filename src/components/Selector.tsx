import { useEffect, useRef } from 'react'

interface EnableToggle {
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

interface FeatureToggle extends EnableToggle {
  label: string
}

interface SelectorProps {
  label: string
  values: string[]
  index: number
  active: boolean
  disabled: boolean
  /** Per-value availability (e.g. separable verbs while "trennbar" is off). */
  available: boolean[]
  /** Checkbox inline with the label that enables/disables the whole dial. */
  enableToggle?: EnableToggle
  /** Checkbox under the list that changes what the dial produces. */
  featureToggle?: FeatureToggle
  onSelect: (index: number) => void
  onSpin: (direction: 1 | -1) => void
  onActivate: () => void
}

const WHEEL_STEP_PX = 40

/**
 * One fixed-position vertical selector: every value is visible, the current
 * one is highlighted. Click a value to select it; the mouse wheel steps
 * (clamped, no wrap). Unavailable values render dimmed and inert; a disabled
 * dial greys out entirely but keeps its footprint, so toggling causes no
 * layout jump.
 */
export function Selector({
  label,
  values,
  index,
  active,
  disabled,
  available,
  enableToggle,
  featureToggle,
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
    <div className={`selector-block${disabled ? ' selector-disabled' : ''}`}>
      {enableToggle ? (
        <label className="selector-head selector-enable">
          <input
            type="checkbox"
            checked={enableToggle.checked}
            disabled={enableToggle.disabled}
            onChange={enableToggle.onChange}
          />
          <span>{label}</span>
        </label>
      ) : (
        <div className="selector-head">{label}</div>
      )}
      <div
        ref={listRef}
        className={`selector${active && !disabled ? ' selector-active' : ''}`}
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
            disabled={disabled || !available[i]}
            onClick={() => onSelect(i)}
          >
            {value}
          </button>
        ))}
      </div>
      {featureToggle && (
        <label className="selector-feature">
          <input
            type="checkbox"
            checked={featureToggle.checked}
            disabled={featureToggle.disabled}
            onChange={featureToggle.onChange}
          />
          <span>{featureToggle.label}</span>
        </label>
      )}
    </div>
  )
}
