import { describe, expect, it } from 'vitest'
import { diffTokens } from './diff'
import type { Token } from './types'

const praesens: Token[] = [
  ['Der', 'art'],
  ['Mann', 'subj'],
  ['macht', 'verb'],
  ['die', 'art'],
  ['Tür', 'obj'],
  ['auf', 'prefix'],
]

const perfekt: Token[] = [
  ['Der', 'art'],
  ['Mann', 'subj'],
  ['hat', 'aux'],
  ['die', 'art'],
  ['Tür', 'obj'],
  ['aufgemacht', 'verb'],
]

describe('diffTokens', () => {
  it('marks nothing on first render', () => {
    expect(diffTokens(null, praesens)).toEqual([false, false, false, false, false, false])
  })

  it('marks nothing when the sentence is identical', () => {
    expect(diffTokens(praesens, praesens.map((t) => [...t] as Token))).toEqual([
      false, false, false, false, false, false,
    ])
  })

  it('marks inserted aux and changed verb, not the stable words', () => {
    expect(diffTokens(praesens, perfekt)).toEqual([false, false, true, false, false, true])
  })

  it('pairs both parts of a separable verb as one lexeme', () => {
    const zumachen: Token[] = [
      ['Der', 'art'],
      ['Mann', 'subj'],
      ['macht', 'verb'],
      ['die', 'art'],
      ['Tür', 'obj'],
      ['zu', 'prefix'],
    ]
    // Only the prefix differs textually, but verb+prefix share the highlight.
    expect(diffTokens(praesens, zumachen)).toEqual([false, false, true, false, false, true])
  })

  it('marks a changed subject only', () => {
    const frau: Token[] = [
      ['Die', 'art'],
      ['Frau', 'subj'],
      ['macht', 'verb'],
      ['die', 'art'],
      ['Tür', 'obj'],
      ['auf', 'prefix'],
    ]
    expect(diffTokens(praesens, frau)).toEqual([true, true, false, false, false, false])
  })
})
