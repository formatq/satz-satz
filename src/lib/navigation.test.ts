import { describe, expect, it } from 'vitest'
import { stepClamped } from './navigation'

describe('stepClamped', () => {
  const all = () => true

  it('steps forward and backward', () => {
    expect(stepClamped(4, 1, 1, all)).toBe(2)
    expect(stepClamped(4, 1, -1, all)).toBe(0)
  })

  it('clamps at both edges instead of wrapping', () => {
    expect(stepClamped(4, 3, 1, all)).toBe(3)
    expect(stepClamped(4, 0, -1, all)).toBe(0)
  })

  it('skips unavailable indices', () => {
    const onlyEven = (i: number) => i % 2 === 0
    expect(stepClamped(5, 0, 1, onlyEven)).toBe(2)
    expect(stepClamped(5, 4, -1, onlyEven)).toBe(2)
  })

  it('returns current when nothing is available in that direction', () => {
    expect(stepClamped(5, 2, 1, (i) => i < 2)).toBe(2)
    expect(stepClamped(4, 2, 1, () => false)).toBe(2)
  })
})
