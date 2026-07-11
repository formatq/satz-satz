import { describe, expect, it } from 'vitest'
import { DIAL } from '../de/grammar'
import { makeInitialState, reduce, type AppState, type Action } from './reducer'

function run(...actions: Action[]): AppState {
  return actions.reduce(reduce, makeInitialState())
}

describe('reducer', () => {
  it('starts with one history entry and no highlights', () => {
    const state = makeInitialState()
    expect(state.history).toHaveLength(1)
    expect(state.history[0].de).toBe('Der Mann öffnet die Tür.')
    expect(state.changed.every((flag) => !flag)).toBe(true)
  })

  it('spin updates the index, generation, diff flags and history', () => {
    const state = run({ type: 'spin', dial: DIAL.tense, direction: 1 })
    expect(state.selection.indices[DIAL.tense]).toBe(1)
    expect(state.generation).toBe(1)
    expect(state.history).toHaveLength(2)
    expect(state.changed.some((flag) => flag)).toBe(true)
    expect(state.active).toBe(DIAL.tense)
  })

  it('spin clamps at the edges instead of wrapping', () => {
    const atStart = run({ type: 'spin', dial: DIAL.tense, direction: -1 })
    expect(atStart.selection.indices[DIAL.tense]).toBe(0)
    const atEnd = run(
      ...Array.from({ length: 6 }, () => ({ type: 'spin', dial: DIAL.tense, direction: 1 }) as Action),
    )
    expect(atEnd.selection.indices[DIAL.tense]).toBe(3)
  })

  it('select jumps straight to a value and activates the dial', () => {
    const state = run({ type: 'select', dial: DIAL.subject, index: 3 })
    expect(state.selection.indices[DIAL.subject]).toBe(3)
    expect(state.active).toBe(DIAL.subject)
    expect(state.history[0].de).toBe('Die Kinder öffnen die Tür.')
  })

  it('drops consecutive duplicate history entries', () => {
    const state = run(
      { type: 'spin', dial: DIAL.tense, direction: 1 },
      { type: 'spin', dial: DIAL.tense, direction: -1 },
    )
    expect(state.history).toHaveLength(3)
    expect(state.history[0].de).toBe(state.history[2].de)
  })

  it('toggling a feature that changes the sentence pushes history with highlights', () => {
    const state = run({ type: 'toggle', key: 'subjectPronoun' })
    expect(state.history[0].de).toBe('Er öffnet die Tür.')
    expect(state.changed.some((flag) => flag)).toBe(true)
    expect(state.generation).toBe(1)
  })

  it('toggling a feature that does not change the sentence leaves history alone', () => {
    // öffnen is inseparable, so flipping "trennbar" off changes nothing.
    const state = run({ type: 'toggle', key: 'separable' })
    expect(state.selection.toggles.separable).toBe(false)
    expect(state.generation).toBe(0)
    expect(state.history).toHaveLength(1)
  })

  it('turning "trennbar" off snaps a separable verb to the first available one', () => {
    const state = run(
      { type: 'select', dial: DIAL.verb, index: 2 }, // aufmachen
      { type: 'toggle', key: 'separable' },
    )
    expect(state.selection.indices[DIAL.verb]).toBe(0) // öffnen
    expect(state.history[0].de).toBe('Der Mann öffnet die Tür.')
  })

  it('spin skips unavailable separable verbs', () => {
    const state = run(
      { type: 'toggle', key: 'separable' },
      { type: 'spin', dial: DIAL.verb, direction: 1 },
      { type: 'spin', dial: DIAL.verb, direction: 1 },
    )
    // öffnen → reparieren, then clamped: aufmachen/zumachen are unavailable.
    expect(state.selection.indices[DIAL.verb]).toBe(1)
  })

  it('turning a dimension off pins it back to the default value', () => {
    const state = run(
      { type: 'select', dial: DIAL.tense, index: 2 },
      { type: 'select', dial: DIAL.voice, index: 1 },
      { type: 'toggle', key: 'tenses' },
      { type: 'toggle', key: 'voice' },
    )
    expect(state.selection.indices[DIAL.tense]).toBe(0)
    expect(state.selection.indices[DIAL.voice]).toBe(0)
    expect(state.history[0].de).toBe('Der Mann öffnet die Tür.')
  })

  it('enabling Person swaps the driving dial and moves the active marker', () => {
    const state = run(
      { type: 'activate', dial: DIAL.subject },
      { type: 'toggle', key: 'person' },
      { type: 'select', dial: DIAL.person, index: 3 },
    )
    expect(state.active).toBe(DIAL.person)
    expect(state.history[0].de).toBe('Wir öffnen die Tür.')
    // Subject dial is locked while Person drives.
    const blocked = reduce(state, { type: 'select', dial: DIAL.subject, index: 1 })
    expect(blocked.history[0].de).toBe('Wir öffnen die Tür.')
    const off = reduce(state, { type: 'toggle', key: 'person' })
    expect(off.selection.indices[DIAL.person]).toBe(0)
    expect(off.history[0].de).toBe('Der Mann öffnet die Tür.')
  })

  it('enabling a modal snaps the tense out of Perfekt and blocks it', () => {
    const state = run(
      { type: 'select', dial: DIAL.tense, index: 2 }, // Perfekt
      { type: 'toggle', key: 'modal' },
    )
    expect(state.selection.indices[DIAL.tense]).toBe(0)
    expect(state.history[0].de).toBe('Der Mann kann die Tür öffnen.')
    // Perfekt/Futur stay unreachable while the modal is on.
    const blocked = reduce(state, { type: 'select', dial: DIAL.tense, index: 3 })
    expect(blocked.selection.indices[DIAL.tense]).toBe(0)
    const spun = reduce(state, { type: 'spin', dial: DIAL.tense, direction: 1 })
    expect(spun.selection.indices[DIAL.tense]).toBe(1)
    const clamped = reduce(spun, { type: 'spin', dial: DIAL.tense, direction: 1 })
    expect(clamped.selection.indices[DIAL.tense]).toBe(1)
  })

  it('enabling Satzart and picking Frage rewrites the sentence with a question mark', () => {
    const state = run(
      { type: 'toggle', key: 'satzart' },
      { type: 'select', dial: DIAL.satzart, index: 1 },
    )
    expect(state.history[0].de).toBe('Öffnet der Mann die Tür?')
    const off = reduce(state, { type: 'toggle', key: 'satzart' })
    expect(off.selection.indices[DIAL.satzart]).toBe(0)
    expect(off.history[0].de).toBe('Der Mann öffnet die Tür.')
  })

  it('ignores spin and select on a disabled dial', () => {
    // The adjective dial is disabled by default (toggle off).
    const state = run(
      { type: 'spin', dial: DIAL.adjective, direction: 1 },
      { type: 'select', dial: DIAL.adjective, index: 2 },
    )
    expect(state.selection.indices[DIAL.adjective]).toBe(0)
    expect(state.generation).toBe(0)
  })

  it('move-active skips disabled dials and wraps', () => {
    // From the object dial, moving right skips the disabled adjective dial.
    const state = run(
      { type: 'activate', dial: DIAL.object },
      { type: 'move-active', direction: 1 },
    )
    expect(state.active).toBe(DIAL.tense)
    const wrapped = reduce(
      run({ type: 'activate', dial: DIAL.voice }),
      { type: 'move-active', direction: 1 },
    )
    expect(wrapped.active).toBe(DIAL.subject)
  })

  it('moves the active marker off a dial its own toggle just disabled', () => {
    const state = run(
      { type: 'activate', dial: DIAL.voice },
      { type: 'toggle', key: 'voice' },
    )
    expect(state.active).toBe(DIAL.subject)
  })

  it('enabling the adjective adds it to the sentence and enables the dial', () => {
    const state = run(
      { type: 'toggle', key: 'adjective' },
      { type: 'select', dial: DIAL.adjective, index: 2 },
    )
    expect(state.history[0].de).toBe('Der Mann öffnet die kaputte Tür.')
  })
})
