import { describe, expect, it } from 'vitest'
import { findNextValid, initialIndices, keyFromIndices, nextValidIndex } from './navigation'
import type { Template } from './types'

describe('findNextValid', () => {
  const all = () => true

  it('steps forward and backward', () => {
    expect(findNextValid(4, 1, 1, all)).toBe(2)
    expect(findNextValid(4, 1, -1, all)).toBe(0)
  })

  it('wraps around in both directions', () => {
    expect(findNextValid(4, 3, 1, all)).toBe(0)
    expect(findNextValid(4, 0, -1, all)).toBe(3)
  })

  it('skips invalid indices', () => {
    const onlyEven = (i: number) => i % 2 === 0
    expect(findNextValid(5, 0, 1, onlyEven)).toBe(2)
    expect(findNextValid(5, 0, -1, onlyEven)).toBe(4)
  })

  it('returns current when only current is valid', () => {
    expect(findNextValid(4, 2, 1, (i) => i === 2)).toBe(2)
    expect(findNextValid(4, 2, -1, (i) => i === 2)).toBe(2)
  })

  it('returns current when nothing is valid', () => {
    expect(findNextValid(4, 2, 1, () => false)).toBe(2)
  })
})

const template: Template = {
  id: 'test',
  label: 'test',
  dimensions: [
    { id: 'a', label: 'A', values: ['a1', 'a2', 'a3'] },
    { id: 'b', label: 'B', values: ['b1', 'b2'] },
  ],
  variants: {
    'a1|b1': { de: [['x', 'other']], ru: 'x' },
    'a2|b1': { de: [['x', 'other']], ru: 'x' },
    'a3|b2': { de: [['x', 'other']], ru: 'x' },
    'a1|b2': { de: [['x', 'other']], ru: 'x' },
  },
}

describe('nextValidIndex', () => {
  it('skips values that do not form an existing variant', () => {
    // From a1|b1, spinning A forward: a2|b1 exists.
    expect(nextValidIndex(template, [0, 0], 0, 1)).toBe(1)
    // From a2|b1, spinning A forward: a3|b1 missing, wraps to a1|b1.
    expect(nextValidIndex(template, [1, 0], 0, 1)).toBe(0)
    // From a2|b1, spinning B: a2|b2 missing, stays.
    expect(nextValidIndex(template, [1, 0], 1, 1)).toBe(0)
  })
})

describe('initialIndices', () => {
  it('derives positions from the first variant key, not all-zeros', () => {
    const shifted: Template = {
      ...template,
      variants: { 'a2|b2': { de: [['x', 'other']], ru: 'x' }, ...template.variants },
    }
    expect(initialIndices(shifted)).toEqual([1, 1])
    expect(keyFromIndices(shifted, [1, 1])).toBe('a2|b2')
  })
})
