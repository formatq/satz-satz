import { describe, expect, it } from 'vitest'
import { validateTemplate } from './validate'
import type { Template, Variant } from './types'

const variant = (text: string): Variant => ({ de: [[text, 'other']], ru: text })

function makeTemplate(keys: string[]): Template {
  return {
    id: 'test',
    label: 'test',
    dimensions: [
      { id: 'a', label: 'A', values: ['a1', 'a2'] },
      { id: 'b', label: 'B', values: ['b1', 'b2'] },
    ],
    variants: Object.fromEntries(keys.map((key) => [key, variant(key)])),
  }
}

describe('validateTemplate', () => {
  it('accepts a fully connected template', () => {
    expect(validateTemplate(makeTemplate(['a1|b1', 'a1|b2', 'a2|b1', 'a2|b2']))).toEqual([])
  })

  it('rejects malformed keys', () => {
    const errors = validateTemplate(makeTemplate(['a1|b1', 'a1|zzz', 'a2|b2', 'a2|b1', 'a1|b2']))
    expect(errors.some((e) => e.includes('zzz'))).toBe(true)
  })

  it('rejects unused dimension values', () => {
    const errors = validateTemplate(makeTemplate(['a1|b1', 'a1|b2']))
    expect(errors.some((e) => e.includes('"a2" is used by no variant'))).toBe(true)
  })

  it('rejects empty translations', () => {
    const template = makeTemplate(['a1|b1', 'a1|b2', 'a2|b1', 'a2|b2'])
    template.variants['a1|b1'].ru = '  '
    const errors = validateTemplate(template)
    expect(errors.some((e) => e.includes('empty translation'))).toBe(true)
  })

  it('detects an island unreachable by single-dial moves', () => {
    // 3×3 grid: {a1,a2}×{b1,b2} is one component; a3|b3 is a lone island —
    // reaching it would require changing two dials at once.
    const template: Template = {
      id: 'island',
      label: 'island',
      dimensions: [
        { id: 'a', label: 'A', values: ['a1', 'a2', 'a3'] },
        { id: 'b', label: 'B', values: ['b1', 'b2', 'b3'] },
      ],
      variants: Object.fromEntries(
        ['a1|b1', 'a1|b2', 'a2|b1', 'a2|b2', 'a3|b3'].map((key) => [key, variant(key)]),
      ),
    }
    const errors = validateTemplate(template)
    expect(errors).toEqual(['variant "a3|b3" is unreachable from the initial variant by single-dial moves'])
  })
})
