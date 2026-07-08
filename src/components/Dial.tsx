import { useEffect, useRef, useState } from 'react'

interface DialProps {
  label: string
  values: string[]
  index: number
  active: boolean
  onSpin: (direction: 1 | -1) => void
  onActivate: () => void
}

const WHEEL_STEP_PX = 40
const TOUCH_STEP_PX = 60
const TOUCH_RESISTANCE = 0.5

/**
 * One scrollable picker. Shows the neighbors dimmed above/below the current
 * value. All animation state is local to this dial: the slide direction is
 * derived from this dial's own index changes, so spinning one dial can never
 * retrigger another dial's animation.
 */
export function Dial({ label, values, index, active, onSpin, onActivate }: DialProps) {
  const prevIndexRef = useRef(index)
  const [slide, setSlide] = useState<'none' | 'from-below' | 'from-above'>('none')

  if (prevIndexRef.current !== index) {
    // Shortest cyclic distance sign = spin direction (ties resolve to "down").
    const n = values.length
    const forward = (index - prevIndexRef.current + n) % n
    setSlide(forward <= n - forward ? 'from-below' : 'from-above')
    prevIndexRef.current = index
  }

  // Mouse wheel: rates differ wildly between trackpads and discrete wheels —
  // accumulate deltaY and consume it in fixed steps, never once per event.
  const rootRef = useRef<HTMLDivElement>(null)
  const wheelAccum = useRef(0)
  const spinRef = useRef(onSpin)
  spinRef.current = onSpin
  const activateRef = useRef(onActivate)
  activateRef.current = onActivate

  useEffect(() => {
    const root = rootRef.current!
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
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [])

  // Touch: content follows the finger (with resistance), commits a step at
  // the threshold, springs back on release.
  const [dragOffset, setDragOffset] = useState(0)
  const dragging = useRef<{ startY: number; consumed: number } | null>(null)

  const onTouchStart = (event: React.TouchEvent) => {
    activateRef.current()
    dragging.current = { startY: event.touches[0].clientY, consumed: 0 }
  }
  const onTouchMove = (event: React.TouchEvent) => {
    if (!dragging.current) return
    const raw = (event.touches[0].clientY - dragging.current.startY) * TOUCH_RESISTANCE
    let delta = raw - dragging.current.consumed
    while (delta <= -TOUCH_STEP_PX) {
      spinRef.current(1)
      dragging.current.consumed -= TOUCH_STEP_PX
      delta += TOUCH_STEP_PX
    }
    while (delta >= TOUCH_STEP_PX) {
      spinRef.current(-1)
      dragging.current.consumed += TOUCH_STEP_PX
      delta -= TOUCH_STEP_PX
    }
    setDragOffset(delta)
  }
  const onTouchEnd = () => {
    dragging.current = null
    setDragOffset(0)
  }

  const n = values.length
  const prev = values[(index - 1 + n) % n]
  const next = values[(index + 1) % n]
  const width = Math.max(...values.map((v) => v.length), label.length) + 3

  return (
    <div className="dial-block" ref={rootRef}>
      <div
        className={`dial${active ? ' dial-active' : ''}`}
        style={{ width: `${width}ch` }}
        onClick={onActivate}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          className="dial-strip"
          style={{
            transform: `translateY(${dragOffset}px)`,
            transition: dragging.current ? 'none' : 'transform 0.18s',
          }}
        >
          {/* Neighbor keys are prefixed: with two values prev === next. */}
          <div className="dial-neighbor" key={`prev-${prev}`}>
            {n > 1 ? prev : ' '}
          </div>
          <div className={`dial-current slide-${slide}`} key={`cur-${values[index]}`}>
            {values[index]}
          </div>
          <div className="dial-neighbor" key={`next-${next}`}>
            {n > 2 ? next : ' '}
          </div>
        </div>
      </div>
      <div className="dial-label">{label}</div>
    </div>
  )
}
