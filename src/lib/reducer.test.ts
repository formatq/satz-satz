import { describe, expect, it } from 'vitest'
import { makeInitialState, makeReducer } from './reducer'
import type { Template } from './types'
import tuer from '../de/data/tuer.json'

const template = tuer as unknown as Template
const reduce = makeReducer(template)

describe('reducer', () => {
  it('starts at the first variant with a history entry and no highlights', () => {
    const state = makeInitialState(template)
    expect(state.history).toHaveLength(1)
    expect(state.changed.every((flag) => !flag)).toBe(true)
  })

  it('spin updates indices, generation, diff flags and history', () => {
    const initial = makeInitialState(template)
    // Dimension 2 is Zeitform: Präsens → Präteritum.
    const state = reduce(initial, { type: 'spin', dim: 2, direction: 1 })
    expect(state.generation).toBe(1)
    expect(state.indices[2]).not.toBe(initial.indices[2])
    expect(state.history.length).toBe(2)
    expect(state.changed.some((flag) => flag)).toBe(true)
    expect(state.active).toBe(2)
  })

  it('drops consecutive duplicate history entries', () => {
    const initial = makeInitialState(template)
    const there = reduce(initial, { type: 'spin', dim: 2, direction: 1 })
    const back = reduce(there, { type: 'spin', dim: 2, direction: -1 })
    // Back to the initial sentence, which is already history[1].
    expect(back.history[0].de).toBe(initial.history[0].de)
    expect(back.history).toHaveLength(3)
    const again = reduce(reduce(back, { type: 'spin', dim: 2, direction: 1 }), {
      type: 'spin',
      dim: 2,
      direction: 1,
    })
    expect(new Set(again.history.map((e) => e.de)).size).toBeGreaterThan(1)
  })

  it('move-active wraps around all dials', () => {
    const initial = makeInitialState(template)
    const left = reduce(initial, { type: 'move-active', direction: -1 })
    expect(left.active).toBe(template.dimensions.length - 1)
    const wrapped = reduce(left, { type: 'move-active', direction: 1 })
    expect(wrapped.active).toBe(0)
  })
})
