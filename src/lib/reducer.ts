import type { Template } from './types'
import { diffTokens } from './diff'
import { initialIndices, keyFromIndices, nextValidIndex } from './navigation'

export interface HistoryEntry {
  de: string
  ru: string
}

export interface AppState {
  indices: number[]
  active: number
  /** Monotonic counter: bumps on every sentence change, drives diff/animation keys. */
  generation: number
  /** Per-token "changed since previous variant" flags for the current sentence. */
  changed: boolean[]
  history: HistoryEntry[]
}

export type Action =
  | { type: 'spin'; dim: number | 'active'; direction: 1 | -1 }
  | { type: 'activate'; dim: number }
  | { type: 'move-active'; direction: 1 | -1 }

const HISTORY_CAP = 50

export function sentenceText(template: Template, indices: number[]): string {
  const variant = template.variants[keyFromIndices(template, indices)]
  return variant.de.map(([text]) => text).join(' ') + '.'
}

export function makeInitialState(template: Template): AppState {
  const indices = initialIndices(template)
  const variant = template.variants[keyFromIndices(template, indices)]
  return {
    indices,
    active: 0,
    generation: 0,
    changed: diffTokens(null, variant.de),
    history: [{ de: sentenceText(template, indices), ru: variant.ru }],
  }
}

export function makeReducer(template: Template) {
  const dimCount = template.dimensions.length

  return function reduce(state: AppState, action: Action): AppState {
    switch (action.type) {
      case 'activate':
        return action.dim === state.active ? state : { ...state, active: action.dim }
      case 'move-active': {
        const active = (state.active + action.direction + dimCount) % dimCount
        return { ...state, active }
      }
      case 'spin': {
        const dim = action.dim === 'active' ? state.active : action.dim
        const next = nextValidIndex(template, state.indices, dim, action.direction)
        if (next === state.indices[dim]) return { ...state, active: dim }
        const indices = state.indices.slice()
        indices[dim] = next
        const prevVariant = template.variants[keyFromIndices(template, state.indices)]
        const variant = template.variants[keyFromIndices(template, indices)]
        const entry = { de: sentenceText(template, indices), ru: variant.ru }
        const history =
          state.history[0]?.de === entry.de
            ? state.history
            : [entry, ...state.history].slice(0, HISTORY_CAP)
        return {
          ...state,
          indices,
          active: dim,
          generation: state.generation + 1,
          changed: diffTokens(prevVariant.de, variant.de),
          history,
        }
      }
    }
  }
}
