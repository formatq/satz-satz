import { describe, expect, it } from 'vitest'
import { DIAL } from '../de/grammar'
import { makeInitialState, reduce, type AppState, type Action } from './reducer'

function run(...actions: Action[]): AppState {
  return actions.reduce(reduce, makeInitialState())
}

const tensesOn: Action = { type: 'toggle', key: 'tenses' }

describe('reducer', () => {
  it('starts simple: one history entry, indefinite article, no highlights', () => {
    const state = makeInitialState()
    expect(state.history).toHaveLength(1)
    expect(state.history[0].de).toBe('Der Mann öffnet eine Tür.')
    expect(state.changed.every((flag) => !flag)).toBe(true)
  })

  it('spin updates the index, generation, diff flags and history', () => {
    const state = run(tensesOn, { type: 'spin', dial: DIAL.tense, direction: 1 })
    expect(state.selection.indices[DIAL.tense]).toBe(1)
    expect(state.generation).toBe(1)
    expect(state.history).toHaveLength(2)
    expect(state.changed.some((flag) => flag)).toBe(true)
    expect(state.active).toBe(DIAL.tense)
  })

  it('spin clamps at the edges instead of wrapping', () => {
    const atStart = run(tensesOn, { type: 'spin', dial: DIAL.tense, direction: -1 })
    expect(atStart.selection.indices[DIAL.tense]).toBe(0)
    const atEnd = run(
      tensesOn,
      ...Array.from({ length: 6 }, () => ({ type: 'spin', dial: DIAL.tense, direction: 1 }) as Action),
    )
    expect(atEnd.selection.indices[DIAL.tense]).toBe(3)
  })

  it('select jumps straight to a value and activates the dial', () => {
    const state = run({ type: 'select', dial: DIAL.subject, index: 3 })
    expect(state.selection.indices[DIAL.subject]).toBe(3)
    expect(state.active).toBe(DIAL.subject)
    expect(state.history[0].de).toBe('Die Kinder öffnen eine Tür.')
  })

  it('drops consecutive duplicate history entries', () => {
    const state = run(
      tensesOn,
      { type: 'spin', dial: DIAL.tense, direction: 1 },
      { type: 'spin', dial: DIAL.tense, direction: -1 },
    )
    expect(state.history).toHaveLength(3)
    expect(state.history[0].de).toBe(state.history[2].de)
  })

  it('toggling a feature that changes the sentence pushes history with highlights', () => {
    const state = run({ type: 'toggle', key: 'objectPronoun' })
    expect(state.history[0].de).toBe('Der Mann öffnet sie.')
    expect(state.changed.some((flag) => flag)).toBe(true)
    expect(state.generation).toBe(1)
  })

  it('toggling a dimension on does not change the sentence or history', () => {
    // The tense dial appears pinned at Präsens — same sentence.
    const state = run(tensesOn)
    expect(state.selection.toggles.tenses).toBe(true)
    expect(state.generation).toBe(0)
    expect(state.history).toHaveLength(1)
  })

  it('switching the indefinite article off restores the definite forms', () => {
    const state = run({ type: 'toggle', key: 'indefinite' })
    expect(state.history[0].de).toBe('Der Mann öffnet die Tür.')
  })

  it('turning a dimension off pins it back to the default value', () => {
    const state = run(
      tensesOn,
      { type: 'toggle', key: 'voice' },
      { type: 'select', dial: DIAL.tense, index: 2 },
      { type: 'select', dial: DIAL.voice, index: 1 },
      { type: 'toggle', key: 'tenses' },
      { type: 'toggle', key: 'voice' },
    )
    expect(state.selection.indices[DIAL.tense]).toBe(0)
    expect(state.selection.indices[DIAL.voice]).toBe(0)
    expect(state.history[0].de).toBe('Der Mann öffnet eine Tür.')
  })

  it('enabling Person swaps the driving dial and moves the active marker', () => {
    const state = run(
      { type: 'activate', dial: DIAL.subject },
      { type: 'toggle', key: 'person' },
      { type: 'select', dial: DIAL.person, index: 3 },
    )
    expect(state.active).toBe(DIAL.person)
    expect(state.history[0].de).toBe('Wir öffnen eine Tür.')
    // Subject dial is locked while Person drives.
    const blocked = reduce(state, { type: 'select', dial: DIAL.subject, index: 1 })
    expect(blocked.history[0].de).toBe('Wir öffnen eine Tür.')
    const off = reduce(state, { type: 'toggle', key: 'person' })
    expect(off.selection.indices[DIAL.person]).toBe(0)
    expect(off.history[0].de).toBe('Der Mann öffnet eine Tür.')
  })

  it('enabling a modal snaps the tense out of Perfekt and blocks it', () => {
    const state = run(
      tensesOn,
      { type: 'select', dial: DIAL.tense, index: 2 }, // Perfekt
      { type: 'toggle', key: 'modal' },
    )
    expect(state.selection.indices[DIAL.tense]).toBe(0)
    expect(state.history[0].de).toBe('Der Mann kann eine Tür öffnen.')
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
    expect(state.history[0].de).toBe('Öffnet der Mann eine Tür?')
    const off = reduce(state, { type: 'toggle', key: 'satzart' })
    expect(off.selection.indices[DIAL.satzart]).toBe(0)
    expect(off.history[0].de).toBe('Der Mann öffnet eine Tür.')
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
    // Default state: only Subjekt, Verb and Objekt are enabled.
    const state = run(
      { type: 'activate', dial: DIAL.subject },
      { type: 'move-active', direction: 1 },
    )
    expect(state.active).toBe(DIAL.verb)
    const wrapped = run(
      { type: 'activate', dial: DIAL.object },
      { type: 'move-active', direction: 1 },
    )
    expect(wrapped.active).toBe(DIAL.subject)
  })

  it('moves the active marker off a dial its own toggle just disabled', () => {
    const state = run(
      { type: 'toggle', key: 'voice' },
      { type: 'activate', dial: DIAL.voice },
      { type: 'toggle', key: 'voice' },
    )
    expect(state.active).toBe(DIAL.subject)
  })

  it('enabling the dative adds the recipient and pins it back on disable', () => {
    const state = run(
      { type: 'toggle', key: 'dative' },
      { type: 'select', dial: DIAL.recipient, index: 3 },
    )
    expect(state.history[0].de).toBe('Der Mann öffnet den Kindern eine Tür.')
    const off = reduce(state, { type: 'toggle', key: 'dative' })
    expect(off.selection.indices[DIAL.recipient]).toBe(0)
    expect(off.history[0].de).toBe('Der Mann öffnet eine Tür.')
  })

  it('enabling the adjective adds it to the sentence and enables the dial', () => {
    const state = run(
      { type: 'toggle', key: 'adjective' },
      { type: 'select', dial: DIAL.adjective, index: 2 },
    )
    expect(state.history[0].de).toBe('Der Mann öffnet eine kaputte Tür.')
  })
})
