import { describe, expect, it } from 'vitest'
import type { Selection, Toggles } from '../lib/types'
import { compose, DIAL, initialSelection } from './grammar'

// Value indices, for readable test setups:
// subject: 0 der Mann · 1 die Frau · 2 das Kind · 3 die Kinder
// verb:    0 öffnen · 1 reparieren · 2 aufmachen · 3 zumachen
// object:  0 die Tür · 1 der Schrank · 2 das Fenster
// adjective: 0 alt · 1 neu · 2 kaputt
// tense:   0 Präsens · 1 Präteritum · 2 Perfekt · 3 Futur I
// voice:   0 Aktiv · 1 Passiv

interface Setup {
  subject?: number
  verb?: number
  object?: number
  adjective?: number
  tense?: number
  voice?: number
  toggles?: Partial<Toggles>
}

function make(setup: Setup): Selection {
  const selection = initialSelection()
  selection.indices[DIAL.subject] = setup.subject ?? 0
  selection.indices[DIAL.verb] = setup.verb ?? 0
  selection.indices[DIAL.object] = setup.object ?? 0
  selection.indices[DIAL.adjective] = setup.adjective ?? 0
  selection.indices[DIAL.tense] = setup.tense ?? 0
  selection.indices[DIAL.voice] = setup.voice ?? 0
  selection.toggles = { ...selection.toggles, ...setup.toggles }
  return selection
}

function de(setup: Setup): string {
  return compose(make(setup)).de.map(([text]) => text).join(' ') + '.'
}

function ru(setup: Setup): string {
  return compose(make(setup)).ru
}

describe('German composition', () => {
  it('composes the initial sentence', () => {
    expect(de({})).toBe('Der Mann öffnet die Tür.')
    expect(ru({})).toBe('Мужчина открывает дверь.')
  })

  it('splits separable verbs in Präsens and fuses them in Perfekt', () => {
    expect(de({ verb: 2 })).toBe('Der Mann macht die Tür auf.')
    expect(de({ verb: 2, tense: 2 })).toBe('Der Mann hat die Tür aufgemacht.')
    expect(ru({ verb: 2, tense: 2 })).toBe('Мужчина открыл дверь.')
  })

  it('tags both parts of a separable verb for the diff pairing', () => {
    const tokens = compose(make({ verb: 2 })).de
    expect(tokens.map(([, role]) => role)).toContain('prefix')
  })

  it('agrees the verb with a plural subject', () => {
    expect(de({ subject: 3 })).toBe('Die Kinder öffnen die Tür.')
    expect(de({ subject: 3, tense: 2, verb: 2 })).toBe('Die Kinder haben die Tür aufgemacht.')
    expect(ru({ subject: 3 })).toBe('Дети открывают дверь.')
  })

  it('composes Passiv Perfekt with worden (not geworden)', () => {
    expect(de({ verb: 2, tense: 2, voice: 1 })).toBe('Die Tür ist vom Mann aufgemacht worden.')
    expect(ru({ verb: 2, tense: 2, voice: 1 })).toBe('Дверь была открыта мужчиной.')
  })

  it('composes Passiv Futur I', () => {
    expect(de({ tense: 3, voice: 1 })).toBe('Die Tür wird vom Mann geöffnet werden.')
    expect(ru({ tense: 3, voice: 1 })).toBe('Дверь будет открыта мужчиной.')
  })

  it('declines the von-phrase with the agent, keeping the finite verb singular', () => {
    expect(de({ subject: 3, verb: 3, voice: 1 })).toBe('Die Tür wird von den Kindern zugemacht.')
    expect(ru({ subject: 3, verb: 3, voice: 1 })).toBe('Дверь закрывается детьми.')
    expect(de({ subject: 2, object: 2, tense: 1, voice: 1 })).toBe('Das Fenster wurde vom Kind geöffnet.')
    expect(ru({ subject: 2, object: 2, tense: 1, voice: 1 })).toBe('Окно было открыто ребёнком.')
  })

  it('declines the object article by gender in the accusative', () => {
    expect(de({ object: 1 })).toBe('Der Mann öffnet den Schrank.')
    expect(de({ object: 1, voice: 1 })).toBe('Der Schrank wird vom Mann geöffnet.')
  })
})

describe('adjective', () => {
  const on = { toggles: { adjective: true } }

  it('uses weak declension: -en only in masculine accusative', () => {
    expect(de({ ...on, subject: 1, object: 1 })).toBe('Die Frau öffnet den alten Schrank.')
    expect(de({ ...on })).toBe('Der Mann öffnet die alte Tür.')
    expect(de({ ...on, object: 2, adjective: 2 })).toBe('Der Mann öffnet das kaputte Fenster.')
  })

  it('switches to nominative when the object becomes the Passiv subject', () => {
    expect(de({ ...on, subject: 1, object: 1, voice: 1 })).toBe('Der alte Schrank wird von der Frau geöffnet.')
    expect(ru({ ...on, subject: 1, object: 1, voice: 1 })).toBe('Старый шкаф открывается женщиной.')
  })

  it('agrees the Russian adjective with gender and case', () => {
    expect(ru({ ...on })).toBe('Мужчина открывает старую дверь.')
    expect(ru({ ...on, object: 1, adjective: 1 })).toBe('Мужчина открывает новый шкаф.')
  })
})

describe('pronouns', () => {
  it('replaces the subject with a nominative pronoun', () => {
    expect(de({ toggles: { subjectPronoun: true } })).toBe('Er öffnet die Tür.')
    expect(de({ subject: 1, toggles: { subjectPronoun: true } })).toBe('Sie öffnet die Tür.')
    expect(de({ subject: 2, toggles: { subjectPronoun: true } })).toBe('Es öffnet die Tür.')
    expect(ru({ toggles: { subjectPronoun: true } })).toBe('Он открывает дверь.')
  })

  it('replaces the object with an accusative pronoun by gender', () => {
    expect(de({ toggles: { objectPronoun: true } })).toBe('Der Mann öffnet sie.')
    expect(de({ object: 1, toggles: { objectPronoun: true } })).toBe('Der Mann öffnet ihn.')
    expect(de({ object: 2, toggles: { objectPronoun: true } })).toBe('Der Mann öffnet es.')
    expect(ru({ toggles: { objectPronoun: true } })).toBe('Мужчина открывает её.')
  })

  it('declines both pronouns in Passiv (nominative object, dative agent)', () => {
    const both = { toggles: { subjectPronoun: true, objectPronoun: true } }
    expect(de({ ...both, voice: 1 })).toBe('Sie wird von ihm geöffnet.')
    expect(ru({ ...both, voice: 1 })).toBe('Она открывается им.')
    expect(de({ ...both, subject: 3, object: 1, voice: 1 })).toBe('Er wird von ihnen geöffnet.')
  })

  it('suppresses the adjective while the object is a pronoun', () => {
    expect(de({ toggles: { adjective: true, objectPronoun: true } })).toBe('Der Mann öffnet sie.')
  })
})

describe('toggles pin disabled dimensions', () => {
  it('pins the tense to Präsens while tenses are off', () => {
    expect(de({ tense: 2, toggles: { tenses: false } })).toBe('Der Mann öffnet die Tür.')
  })

  it('pins the voice to Aktiv while Genus Verbi is off', () => {
    expect(de({ voice: 1, toggles: { voice: false } })).toBe('Der Mann öffnet die Tür.')
  })
})
