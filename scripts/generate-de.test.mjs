import { describe, expect, it } from 'vitest'
import { generateTemplate } from './generate-de.mjs'

const template = generateTemplate()

function sentence(key) {
  const variant = template.variants[key]
  if (!variant) throw new Error(`missing variant: ${key}`)
  return variant.de.map(([text]) => text).join(' ') + '.'
}

describe('generator golden sentences', () => {
  it('generates the full cross product', () => {
    expect(Object.keys(template.variants)).toHaveLength(4 * 5 * 4 * 2)
  })

  it('Präsens Aktiv splits the separable verb', () => {
    expect(sentence('der Mann|aufmachen|Präsens|Aktiv')).toBe('Der Mann macht die Tür auf.')
  })

  it('Präsens Aktiv with an inseparable verb has no trailing prefix', () => {
    expect(sentence('der Mann|öffnen|Präsens|Aktiv')).toBe('Der Mann öffnet die Tür.')
  })

  it('Perfekt Aktiv fuses the participle at the end', () => {
    expect(sentence('der Mann|aufmachen|Perfekt|Aktiv')).toBe('Der Mann hat die Tür aufgemacht.')
  })

  it('Futur I Aktiv uses werden + infinitive', () => {
    expect(sentence('der Mann|aufmachen|Futur I|Aktiv')).toBe('Der Mann wird die Tür aufmachen.')
  })

  it('plural subject flips verb agreement', () => {
    expect(sentence('die Kinder|aufmachen|Präsens|Aktiv')).toBe('Die Kinder machen die Tür auf.')
    expect(sentence('die Kinder|schließen|Präteritum|Aktiv')).toBe('Die Kinder schlossen die Tür.')
    expect(sentence('die Kinder|aufmachen|Perfekt|Aktiv')).toBe('Die Kinder haben die Tür aufgemacht.')
  })

  it('Präsens Passiv uses von + dative agent', () => {
    expect(sentence('der Mann|aufmachen|Präsens|Passiv')).toBe('Die Tür wird vom Mann aufgemacht.')
    expect(sentence('die Frau|öffnen|Präsens|Passiv')).toBe('Die Tür wird von der Frau geöffnet.')
    expect(sentence('das Kind|zumachen|Präsens|Passiv')).toBe('Die Tür wird vom Kind zugemacht.')
    expect(sentence('die Kinder|schließen|Präsens|Passiv')).toBe('Die Tür wird von den Kindern geschlossen.')
  })

  it('Perfekt Passiv ends in "worden", not "geworden"', () => {
    expect(sentence('die Kinder|aufmachen|Perfekt|Passiv')).toBe(
      'Die Tür ist von den Kindern aufgemacht worden.',
    )
  })

  it('Futur I Passiv ends in participle + werden', () => {
    expect(sentence('der Mann|reparieren|Futur I|Passiv')).toBe(
      'Die Tür wird vom Mann repariert werden.',
    )
  })

  it('"-ieren" participle has no ge- prefix', () => {
    expect(sentence('die Frau|reparieren|Perfekt|Aktiv')).toBe('Die Frau hat die Tür repariert.')
  })

  it('tags both parts of a separable verb for diff pairing', () => {
    const tokens = template.variants['der Mann|aufmachen|Präsens|Aktiv'].de
    expect(tokens.filter(([, role]) => role === 'verb' || role === 'prefix')).toEqual([
      ['macht', 'verb'],
      ['auf', 'prefix'],
    ])
  })

  it('composes Russian translations', () => {
    expect(template.variants['der Mann|aufmachen|Perfekt|Aktiv'].ru).toBe('Мужчина открыл дверь.')
    expect(template.variants['die Frau|zumachen|Präteritum|Aktiv'].ru).toBe('Женщина закрыла дверь.')
    expect(template.variants['die Kinder|aufmachen|Futur I|Aktiv'].ru).toBe('Дети откроют дверь.')
    expect(template.variants['der Mann|aufmachen|Präsens|Passiv'].ru).toBe('Дверь открывается мужчиной.')
    expect(template.variants['die Kinder|schließen|Perfekt|Passiv'].ru).toBe('Дверь была закрыта детьми.')
  })
})
