import { describe, expect, it } from 'vitest'
import { DIAL, initialSelection } from '../de/grammar'
import { decodeSelectionFromHash, encodeSelectionToHash } from './url'

describe('url state', () => {
  it('roundtrips the initial selection', () => {
    const initial = initialSelection()
    const hash = encodeSelectionToHash(initial)
    expect(hash).toBe('#d=0.0.0.0.0.0.0.0.0.0.0.0&t=indefinite')
    const decoded = decodeSelectionFromHash(hash)
    expect(decoded).toEqual(initial)
  })

  it('roundtrips a complex selection with toggles', () => {
    const sel = initialSelection()
    sel.toggles.modal = true
    sel.toggles.tenses = true
    sel.toggles.negation = true
    sel.indices[DIAL.modal] = 1
    sel.indices[DIAL.tense] = 1 // Präteritum (valid with modal)

    const hash = encodeSelectionToHash(sel)
    const decoded = decodeSelectionFromHash(hash)
    expect(decoded).toEqual(sel)
  })

  it('snaps unavailable tense values when modal is enabled', () => {
    const sel = initialSelection()
    sel.toggles.modal = true
    sel.toggles.tenses = true
    sel.indices[DIAL.tense] = 2 // Perfekt (not available with modal)

    const hash = encodeSelectionToHash(sel)
    const decoded = decodeSelectionFromHash(hash)
    expect(decoded).not.toBeNull()
    expect(decoded!.indices[DIAL.tense]).toBe(0) // snaps to Präsens
  })

  it('resets disabled dial indices to 0', () => {
    // If hash provides a non-zero index for a dial whose toggle is off
    const hash = '#d=0.0.0.0.0.0.3.0.0.0.0.0&t=indefinite' // tense dial index 3, but tenses toggle is off
    const decoded = decodeSelectionFromHash(hash)
    expect(decoded).not.toBeNull()
    expect(decoded!.indices[DIAL.tense]).toBe(0)
  })

  it('returns null for invalid or corrupted hashes', () => {
    expect(decodeSelectionFromHash('')).toBeNull()
    expect(decodeSelectionFromHash('#')).toBeNull()
    expect(decodeSelectionFromHash('#invalid')).toBeNull()
    expect(decodeSelectionFromHash('#d=1.2.3')).toBeNull() // wrong length
    expect(decodeSelectionFromHash('#d=a.b.c.d.e.f.g.h.i.j.k.l')).toBeNull()
  })
})
