import { DIAL, DIALS, initialSelection, isValueAvailable } from '../de/grammar'
import type { Selection, Toggles } from './types'

/**
 * Serializes the current grammar selection to a URL hash string.
 * Example output: `#d=0.0.1.0.0.0.0.0.0.0.0.0&t=indefinite,modal`
 */
export function encodeSelectionToHash(selection: Selection): string {
  const d = selection.indices.join('.')
  const activeToggles = (Object.keys(selection.toggles) as (keyof Toggles)[])
    .filter((k) => selection.toggles[k])
    .sort()

  const params = new URLSearchParams()
  params.set('d', d)
  if (activeToggles.length > 0) {
    params.set('t', activeToggles.join(','))
  }
  return '#' + params.toString()
}

/**
 * Deserializes a URL hash string into a valid Selection.
 * Resets invalid or unavailable states to maintain grammatical validity.
 */
export function decodeSelectionFromHash(hash: string): Selection | null {
  if (!hash || hash.length <= 1) return null

  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    const params = new URLSearchParams(raw)
    const dStr = params.get('d')
    if (!dStr) return null

    const rawIndices = dStr.split('.').map((x) => (x.trim() === '' ? NaN : Number(x)))
    if (rawIndices.length !== DIALS.length || rawIndices.some((n) => isNaN(n) || !Number.isInteger(n))) {
      return null
    }

    const init = initialSelection()
    const toggles: Toggles = { ...init.toggles }
    const validToggleKeys = Object.keys(toggles) as (keyof Toggles)[]

    const activeList = params.has('t')
      ? (params.get('t') || '').split(',').map((s) => s.trim())
      : []

    for (const k of validToggleKeys) {
      toggles[k] = activeList.includes(k)
    }

    // Clamp indices to valid boundaries of each dial
    const indices = DIALS.map((dial, dialIndex) => {
      const idx = rawIndices[dialIndex]
      if (idx >= 0 && idx < dial.values.length) {
        return idx
      }
      return 0
    })

    // Reset disabled dials according to toggle dependencies (consistent with reducer toggle logic)
    if (!toggles.tenses) indices[DIAL.tense] = 0
    if (!toggles.voice) indices[DIAL.voice] = 0
    if (!toggles.satzart) indices[DIAL.satzart] = 0
    if (!toggles.person) indices[DIAL.person] = 0
    if (!toggles.modal) indices[DIAL.modal] = 0
    if (!toggles.objectPronoun) indices[DIAL.accPronoun] = 0
    if (!toggles.dative) {
      indices[DIAL.recipient] = 0
      toggles.recipientIndefinite = false
      toggles.dativePronoun = false
    }
    if (!toggles.dativePronoun) indices[DIAL.datPronoun] = 0

    // Snap unavailable values (e.g. Perfekt while modal is enabled)
    for (let dial = 0; dial < DIALS.length; dial++) {
      if (!isValueAvailable(dial, indices[dial], toggles)) {
        const first = DIALS[dial].values.findIndex((_, index) =>
          isValueAvailable(dial, index, toggles),
        )
        if (first !== -1) indices[dial] = first
      }
    }

    return { indices, toggles }
  } catch {
    return null
  }
}
