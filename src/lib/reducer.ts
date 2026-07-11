import { compose, DIAL, DIALS, initialSelection, isDialDisabled, isValueAvailable } from '../de/grammar'
import { diffTokens } from './diff'
import { stepClamped } from './navigation'
import type { Selection, Toggles, Token } from './types'

export interface HistoryEntry {
  de: string
  ru: string
}

export interface AppState {
  selection: Selection
  active: number
  /** Monotonic counter: bumps on every sentence change, drives diff/animation keys. */
  generation: number
  /** Per-token "changed since previous sentence" flags for the current sentence. */
  changed: boolean[]
  history: HistoryEntry[]
}

export type Action =
  | { type: 'spin'; dial: number | 'active'; direction: 1 | -1 }
  | { type: 'select'; dial: number; index: number }
  | { type: 'activate'; dial: number }
  | { type: 'move-active'; direction: 1 | -1 }
  | { type: 'toggle'; key: keyof Toggles }

const HISTORY_CAP = 50

export function tokensText(tokens: Token[]): string {
  return tokens.map(([text]) => text).join(' ') + '.'
}

export function makeInitialState(): AppState {
  const selection = initialSelection()
  const variant = compose(selection)
  return {
    selection,
    active: 0,
    generation: 0,
    changed: diffTokens(null, variant.de),
    history: [{ de: tokensText(variant.de), ru: variant.ru }],
  }
}

/**
 * Commits a new selection: recomposes the sentence, diffs it against the
 * previous one and pushes history — but only if the sentence actually changed
 * (a toggle flipped while its dimension sits at the default changes nothing).
 */
function withSelection(state: AppState, selection: Selection, active: number): AppState {
  const prev = compose(state.selection)
  const next = compose(selection)
  const de = tokensText(next.de)
  if (de === tokensText(prev.de)) return { ...state, selection, active }
  const entry = { de, ru: next.ru }
  const history =
    state.history[0]?.de === de ? state.history : [entry, ...state.history].slice(0, HISTORY_CAP)
  return {
    ...state,
    selection,
    active,
    generation: state.generation + 1,
    changed: diffTokens(prev.de, next.de),
    history,
  }
}

export function reduce(state: AppState, action: Action): AppState {
  const { toggles } = state.selection
  switch (action.type) {
    case 'activate':
      if (isDialDisabled(action.dial, toggles) || action.dial === state.active) return state
      return { ...state, active: action.dial }

    case 'move-active': {
      const n = DIALS.length
      for (let step = 1; step <= n; step++) {
        const dial = (((state.active + action.direction * step) % n) + n) % n
        if (!isDialDisabled(dial, toggles)) {
          return dial === state.active ? state : { ...state, active: dial }
        }
      }
      return state
    }

    case 'spin': {
      const dial = action.dial === 'active' ? state.active : action.dial
      if (isDialDisabled(dial, toggles)) return state
      const current = state.selection.indices[dial]
      const next = stepClamped(DIALS[dial].values.length, current, action.direction, (index) =>
        isValueAvailable(dial, index, toggles),
      )
      if (next === current) return dial === state.active ? state : { ...state, active: dial }
      const indices = state.selection.indices.slice()
      indices[dial] = next
      return withSelection(state, { ...state.selection, indices }, dial)
    }

    case 'select': {
      const { dial, index } = action
      if (isDialDisabled(dial, toggles) || !isValueAvailable(dial, index, toggles)) return state
      if (index === state.selection.indices[dial]) {
        return dial === state.active ? state : { ...state, active: dial }
      }
      const indices = state.selection.indices.slice()
      indices[dial] = index
      return withSelection(state, { ...state.selection, indices }, dial)
    }

    case 'toggle': {
      const nextToggles = { ...toggles, [action.key]: !toggles[action.key] }
      const indices = state.selection.indices.slice()
      // A dial disabled by its toggle pins back to the default value, so the
      // greyed-out dial and the sentence agree.
      if (!nextToggles.tenses) indices[DIAL.tense] = 0
      if (!nextToggles.voice) indices[DIAL.voice] = 0
      // A value made unavailable (separable verb after "trennbar" goes off)
      // snaps to the first available one.
      for (let dial = 0; dial < DIALS.length; dial++) {
        if (!isValueAvailable(dial, indices[dial], nextToggles)) {
          const first = DIALS[dial].values.findIndex((_, index) =>
            isValueAvailable(dial, index, nextToggles),
          )
          if (first !== -1) indices[dial] = first
        }
      }
      const active = isDialDisabled(state.active, nextToggles)
        ? DIALS.findIndex((_, dial) => !isDialDisabled(dial, nextToggles))
        : state.active
      return withSelection(state, { indices, toggles: nextToggles }, active)
    }
  }
}
