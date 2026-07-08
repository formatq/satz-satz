import { describe, expect, it } from 'vitest'
import { validateTemplate } from '../lib/validate'
import type { Template } from '../lib/types'
import tuer from './data/tuer.json'

const template = tuer as unknown as Template

describe('committed dataset', () => {
  it('satisfies every invariant, including connectivity', () => {
    expect(validateTemplate(template)).toEqual([])
  })

  it('contains the full cross product for "die Tür"', () => {
    expect(Object.keys(template.variants)).toHaveLength(160)
  })
})
