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
// satzart: 0 Hauptsatz · 1 Frage · 2 Nebensatz
// person:  0 ich · 1 du · 2 er · 3 wir · 4 ihr · 5 sie
// modal:   0 können · 1 müssen · 2 wollen
// recipient: 0 der Frau · 1 dem Kind · 2 dem Mann · 3 den Kindern

interface Setup {
  subject?: number
  person?: number
  verb?: number
  modal?: number
  object?: number
  adjective?: number
  tense?: number
  voice?: number
  satzart?: number
  recipient?: number
  toggles?: Partial<Toggles>
}

function make(setup: Setup): Selection {
  const selection = initialSelection()
  selection.indices[DIAL.subject] = setup.subject ?? 0
  selection.indices[DIAL.person] = setup.person ?? 0
  selection.indices[DIAL.verb] = setup.verb ?? 0
  selection.indices[DIAL.modal] = setup.modal ?? 0
  selection.indices[DIAL.object] = setup.object ?? 0
  selection.indices[DIAL.adjective] = setup.adjective ?? 0
  selection.indices[DIAL.tense] = setup.tense ?? 0
  selection.indices[DIAL.voice] = setup.voice ?? 0
  selection.indices[DIAL.satzart] = setup.satzart ?? 0
  selection.indices[DIAL.recipient] = setup.recipient ?? 0
  selection.toggles = {
    ...selection.toggles,
    // The app defaults to the indefinite article; these golden tests were
    // written against definite forms, so pin it off unless a test opts in.
    indefinite: false,
    // Setting an index implies enabling the dimension; explicit toggles win.
    tenses: setup.tense !== undefined,
    voice: setup.voice !== undefined,
    satzart: setup.satzart !== undefined,
    dative: setup.recipient !== undefined,
    ...setup.toggles,
  }
  return selection
}

function de(setup: Setup): string {
  const variant = compose(make(setup))
  return variant.de.map(([text]) => text).join(' ') + variant.end
}

function ru(setup: Setup): string {
  return compose(make(setup)).ru
}

function en(setup: Setup): string {
  return compose(make(setup)).en
}

describe('German composition', () => {
  it('composes the initial sentence with the default indefinite article', () => {
    const variant = compose(initialSelection())
    expect(variant.de.map(([text]) => text).join(' ') + variant.end).toBe('Der Mann öffnet eine Tür.')
    expect(variant.ru).toBe('Мужчина открывает дверь.')
  })

  it('composes the definite base sentence', () => {
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

describe('indefinite article', () => {
  const ein = { toggles: { indefinite: true } }

  it('declines ein- by gender and case', () => {
    expect(de({ ...ein })).toBe('Der Mann öffnet eine Tür.')
    expect(de({ ...ein, object: 1 })).toBe('Der Mann öffnet einen Schrank.')
    expect(de({ ...ein, object: 2 })).toBe('Der Mann öffnet ein Fenster.')
    expect(de({ ...ein, object: 1, voice: 1 })).toBe('Ein Schrank wird vom Mann geöffnet.')
  })

  it('switches the adjective to mixed declension: it carries the gender marker', () => {
    const einAdj = { toggles: { indefinite: true, adjective: true } }
    expect(de({ ...einAdj })).toBe('Der Mann öffnet eine alte Tür.')
    expect(de({ ...einAdj, object: 1 })).toBe('Der Mann öffnet einen alten Schrank.')
    expect(de({ ...einAdj, object: 2, adjective: 2 })).toBe('Der Mann öffnet ein kaputtes Fenster.')
    // Nominative in Passiv: -er/-es where the definite article had plain -e.
    expect(de({ ...einAdj, object: 1, voice: 1 })).toBe('Ein alter Schrank wird vom Mann geöffnet.')
    expect(de({ ...einAdj, object: 2, voice: 1 })).toBe('Ein altes Fenster wird vom Mann geöffnet.')
  })

  it('keeps the Russian translation unchanged (Russian has no articles)', () => {
    expect(ru({ ...ein })).toBe('Мужчина открывает дверь.')
  })

  it('is ignored while the object is a pronoun', () => {
    expect(de({ toggles: { indefinite: true, objectPronoun: true } })).toBe('Der Mann öffnet sie.')
  })
})

describe('object pronoun', () => {
  it('replaces the object with an accusative pronoun by gender', () => {
    expect(de({ toggles: { objectPronoun: true } })).toBe('Der Mann öffnet sie.')
    expect(de({ object: 1, toggles: { objectPronoun: true } })).toBe('Der Mann öffnet ihn.')
    expect(de({ object: 2, toggles: { objectPronoun: true } })).toBe('Der Mann öffnet es.')
    expect(ru({ toggles: { objectPronoun: true } })).toBe('Мужчина открывает её.')
  })

  it('declines both pronouns in Passiv (nominative object, dative agent)', () => {
    const both = { toggles: { person: true, objectPronoun: true } }
    expect(de({ ...both, person: 2, voice: 1 })).toBe('Sie wird von ihm geöffnet.')
    expect(ru({ ...both, person: 2, voice: 1 })).toBe('Она открывается им.')
    expect(de({ ...both, person: 5, object: 1, voice: 1 })).toBe('Er wird von ihnen geöffnet.')
  })

  it('suppresses the adjective while the object is a pronoun', () => {
    expect(de({ toggles: { adjective: true, objectPronoun: true } })).toBe('Der Mann öffnet sie.')
  })
})

describe('dative object', () => {
  it('places the dative recipient before the accusative object', () => {
    expect(de({ recipient: 0 })).toBe('Der Mann öffnet der Frau die Tür.')
    expect(ru({ recipient: 0 })).toBe('Мужчина открывает женщине дверь.')
    expect(en({ recipient: 0 })).toBe('The man opens the door for the woman.')
  })

  it('declines the dative article by gender, with -n on the plural noun', () => {
    expect(de({ recipient: 1 })).toBe('Der Mann öffnet dem Kind die Tür.')
    expect(de({ recipient: 2, subject: 1 })).toBe('Die Frau öffnet dem Mann die Tür.')
    expect(de({ recipient: 3 })).toBe('Der Mann öffnet den Kindern die Tür.')
    expect(ru({ recipient: 3 })).toBe('Мужчина открывает детям дверь.')
  })

  it('keeps the dative through tenses and separable verbs', () => {
    expect(de({ recipient: 1, verb: 2 })).toBe('Der Mann macht dem Kind die Tür auf.')
    expect(de({ recipient: 1, verb: 2, tense: 2 })).toBe('Der Mann hat dem Kind die Tür aufgemacht.')
    expect(de({ recipient: 1, tense: 3 })).toBe('Der Mann wird dem Kind die Tür öffnen.')
  })

  it('moves an accusative pronoun ahead of the dative', () => {
    expect(de({ recipient: 0, toggles: { objectPronoun: true } })).toBe('Der Mann öffnet sie der Frau.')
    expect(de({ recipient: 1, object: 1, toggles: { objectPronoun: true } })).toBe('Der Mann öffnet ihn dem Kind.')
    expect(ru({ recipient: 0, toggles: { objectPronoun: true } })).toBe('Мужчина открывает её женщине.')
  })

  it('negates after the object pair, or with kein- on an indefinite object', () => {
    expect(de({ recipient: 0, toggles: { negation: true } })).toBe('Der Mann öffnet der Frau die Tür nicht.')
    expect(de({ recipient: 0, toggles: { negation: true, indefinite: true } })).toBe('Der Mann öffnet der Frau keine Tür.')
  })

  it('keeps the dative before the von-agent in Passiv', () => {
    expect(de({ recipient: 0, voice: 1 })).toBe('Die Tür wird der Frau vom Mann geöffnet.')
    expect(de({ recipient: 3, voice: 1, tense: 2, verb: 2 })).toBe('Die Tür ist den Kindern vom Mann aufgemacht worden.')
    expect(ru({ recipient: 0, voice: 1 })).toBe('Дверь открывается мужчиной для женщины.')
    expect(en({ recipient: 0, voice: 1 })).toBe('The door is opened for the woman by the man.')
  })

  it('works with modals, Frage and Nebensatz', () => {
    expect(de({ recipient: 1, toggles: { modal: true } })).toBe('Der Mann kann dem Kind die Tür öffnen.')
    expect(de({ recipient: 1, satzart: 1 })).toBe('Öffnet der Mann dem Kind die Tür?')
    expect(de({ recipient: 1, satzart: 2, verb: 2 })).toBe('…, weil der Mann dem Kind die Tür aufmacht.')
    expect(ru({ recipient: 1, toggles: { modal: true } })).toBe('Мужчина может открыть ребёнку дверь.')
  })

  it('combines the dative with the adjective and the indefinite article', () => {
    expect(de({ recipient: 0, toggles: { adjective: true, indefinite: true } })).toBe(
      'Der Mann öffnet der Frau eine alte Tür.',
    )
    expect(ru({ recipient: 0, toggles: { adjective: true, indefinite: true } })).toBe(
      'Мужчина открывает женщине старую дверь.',
    )
  })

  it('stays out of the sentence while the toggle is off', () => {
    expect(de({ recipient: 2, toggles: { dative: false } })).toBe('Der Mann öffnet die Tür.')
  })
})

describe('modal verbs', () => {
  const on = { toggles: { modal: true } }

  it('puts the modal in the finite slot and the main verb at the end as infinitive', () => {
    expect(de({ ...on, verb: 2 })).toBe('Der Mann kann die Tür aufmachen.')
    expect(de({ ...on, modal: 1, subject: 1 })).toBe('Die Frau muss die Tür öffnen.')
    expect(de({ ...on, modal: 2, subject: 3 })).toBe('Die Kinder wollen die Tür öffnen.')
    expect(ru({ ...on, verb: 2 })).toBe('Мужчина может открыть дверь.')
    expect(ru({ ...on, modal: 1, subject: 1 })).toBe('Женщина должна открыть дверь.')
  })

  it('conjugates the irregular modal Präsens by person', () => {
    const person = { toggles: { modal: true, person: true } }
    expect(de({ ...person, person: 0 })).toBe('Ich kann die Tür öffnen.')
    expect(de({ ...person, person: 1, modal: 2 })).toBe('Du willst die Tür öffnen.')
    expect(de({ ...person, person: 4, modal: 1 })).toBe('Ihr müsst die Tür öffnen.')
    expect(ru({ ...person, person: 0 })).toBe('Я могу открыть дверь.')
  })

  it('uses the Präteritum modal forms', () => {
    expect(de({ ...on, tense: 1 })).toBe('Der Mann konnte die Tür öffnen.')
    expect(de({ ...on, tense: 1, modal: 1, subject: 1 })).toBe('Die Frau musste die Tür öffnen.')
    expect(ru({ ...on, tense: 1 })).toBe('Мужчина мог открыть дверь.')
    expect(ru({ ...on, tense: 1, modal: 1, subject: 1 })).toBe('Женщина должна была открыть дверь.')
  })

  it('builds the Infinitiv Passiv: modal + partizip + werden', () => {
    expect(de({ ...on, voice: 1, verb: 2 })).toBe('Die Tür kann vom Mann aufgemacht werden.')
    expect(de({ ...on, voice: 1, modal: 1 })).toBe('Die Tür muss vom Mann geöffnet werden.')
    expect(de({ ...on, voice: 1, tense: 1 })).toBe('Die Tür konnte vom Mann geöffnet werden.')
    expect(ru({ ...on, voice: 1 })).toBe('Дверь может быть открыта мужчиной.')
    expect(ru({ ...on, voice: 1, modal: 1 })).toBe('Дверь должна быть открыта мужчиной.')
  })

  it('moves the modal in Frage and Nebensatz', () => {
    const satz = { toggles: { modal: true, satzart: true } }
    expect(de({ ...satz, satzart: 1, verb: 2 })).toBe('Kann der Mann die Tür aufmachen?')
    expect(de({ ...satz, satzart: 2, verb: 2 })).toBe('…, weil der Mann die Tür aufmachen kann.')
    expect(de({ ...satz, satzart: 2, voice: 1 })).toBe('…, weil die Tür vom Mann geöffnet werden kann.')
  })

  it('combines with negation', () => {
    expect(de({ ...on, toggles: { ...on.toggles, negation: true } })).toBe(
      'Der Mann kann die Tür nicht öffnen.',
    )
    expect(ru({ ...on, toggles: { ...on.toggles, negation: true } })).toBe(
      'Мужчина не может открыть дверь.',
    )
  })

  it('clamps Perfekt/Futur to Präsens while a modal is active', () => {
    expect(de({ ...on, tense: 2 })).toBe('Der Mann kann die Tür öffnen.')
    expect(de({ ...on, tense: 3 })).toBe('Der Mann kann die Tür öffnen.')
  })
})

describe('negation', () => {
  const neg = { toggles: { negation: true } }

  it('places nicht before the final verb cluster', () => {
    expect(de({ ...neg })).toBe('Der Mann öffnet die Tür nicht.')
    expect(de({ ...neg, verb: 2 })).toBe('Der Mann macht die Tür nicht auf.')
    expect(de({ ...neg, verb: 2, tense: 2 })).toBe('Der Mann hat die Tür nicht aufgemacht.')
    expect(de({ ...neg, tense: 3 })).toBe('Der Mann wird die Tür nicht öffnen.')
    expect(ru({ ...neg })).toBe('Мужчина не открывает дверь.')
    expect(ru({ ...neg, tense: 2 })).toBe('Мужчина не открыл дверь.')
  })

  it('places nicht after the agent in Passiv', () => {
    expect(de({ ...neg, voice: 1 })).toBe('Die Tür wird vom Mann nicht geöffnet.')
    expect(de({ ...neg, voice: 1, tense: 2, verb: 2 })).toBe('Die Tür ist vom Mann nicht aufgemacht worden.')
    expect(ru({ ...neg, voice: 1 })).toBe('Дверь не открывается мужчиной.')
    expect(ru({ ...neg, voice: 1, tense: 2 })).toBe('Дверь не была открыта мужчиной.')
  })

  it('switches to kein- when the object is indefinite', () => {
    const kein = { toggles: { negation: true, indefinite: true } }
    expect(de({ ...kein })).toBe('Der Mann öffnet keine Tür.')
    expect(de({ ...kein, object: 1 })).toBe('Der Mann öffnet keinen Schrank.')
    expect(de({ ...kein, object: 2 })).toBe('Der Mann öffnet kein Fenster.')
    expect(de({ ...kein, object: 1, toggles: { ...kein.toggles, adjective: true } })).toBe(
      'Der Mann öffnet keinen alten Schrank.',
    )
    expect(de({ ...kein, voice: 1 })).toBe('Keine Tür wird vom Mann geöffnet.')
  })

  it('keeps nicht for pronoun objects even with unbestimmt on', () => {
    expect(de({ toggles: { negation: true, indefinite: true, objectPronoun: true } })).toBe(
      'Der Mann öffnet sie nicht.',
    )
  })

  it('works inside Frage and Nebensatz', () => {
    const satz = { toggles: { negation: true, satzart: true } }
    expect(de({ ...satz, satzart: 1, verb: 2 })).toBe('Macht der Mann die Tür nicht auf?')
    expect(de({ ...satz, satzart: 2, verb: 2 })).toBe('…, weil der Mann die Tür nicht aufmacht.')
  })
})

describe('person', () => {
  const on = { toggles: { person: true } }

  it('conjugates through the whole paradigm in Präsens', () => {
    expect(de({ ...on, person: 0 })).toBe('Ich öffne die Tür.')
    expect(de({ ...on, person: 1 })).toBe('Du öffnest die Tür.')
    expect(de({ ...on, person: 2 })).toBe('Er öffnet die Tür.')
    expect(de({ ...on, person: 3 })).toBe('Wir öffnen die Tür.')
    expect(de({ ...on, person: 4 })).toBe('Ihr öffnet die Tür.')
    expect(de({ ...on, person: 5 })).toBe('Sie öffnen die Tür.')
    expect(ru({ ...on, person: 0 })).toBe('Я открываю дверь.')
    expect(ru({ ...on, person: 4 })).toBe('Вы открываете дверь.')
  })

  it('conjugates the auxiliaries (wirst!) and splits separable verbs', () => {
    expect(de({ ...on, person: 1, verb: 2 })).toBe('Du machst die Tür auf.')
    expect(de({ ...on, person: 0, verb: 2, tense: 2 })).toBe('Ich habe die Tür aufgemacht.')
    expect(de({ ...on, person: 1, tense: 3 })).toBe('Du wirst die Tür öffnen.')
    expect(de({ ...on, person: 4, tense: 2 })).toBe('Ihr habt die Tür geöffnet.')
    expect(de({ ...on, person: 1, tense: 1 })).toBe('Du öffnetest die Tür.')
  })

  it('declines the person in the Passiv von-phrase', () => {
    expect(de({ ...on, person: 0, voice: 1 })).toBe('Die Tür wird von mir geöffnet.')
    expect(de({ ...on, person: 3, voice: 1 })).toBe('Die Tür wird von uns geöffnet.')
    expect(ru({ ...on, person: 0, voice: 1 })).toBe('Дверь открывается мной.')
  })

  it('keeps person agreement in Frage and Nebensatz', () => {
    const satz = { toggles: { person: true, satzart: true } }
    expect(de({ ...satz, person: 1, verb: 2, satzart: 1 })).toBe('Machst du die Tür auf?')
    expect(de({ ...satz, person: 0, verb: 2, satzart: 2 })).toBe('…, weil ich die Tür aufmache.')
  })

  it('falls back to the Subjekt dial while the toggle is off', () => {
    expect(de({ person: 3, toggles: { person: false } })).toBe('Der Mann öffnet die Tür.')
  })
})

describe('Satzart', () => {
  const on = { toggles: { satzart: true } }

  it('moves the finite verb to first position in a Frage', () => {
    expect(de({ ...on, satzart: 1, verb: 2 })).toBe('Macht der Mann die Tür auf?')
    expect(de({ ...on, satzart: 1, verb: 2, tense: 2 })).toBe('Hat der Mann die Tür aufgemacht?')
    expect(de({ ...on, satzart: 1, voice: 1 })).toBe('Wird die Tür vom Mann geöffnet?')
    expect(ru({ ...on, satzart: 1 })).toBe('Мужчина открывает дверь?')
  })

  it('moves the finite verb to last position in a Nebensatz', () => {
    expect(de({ ...on, satzart: 2 })).toBe('…, weil der Mann die Tür öffnet.')
    expect(de({ ...on, satzart: 2, tense: 2, verb: 2 })).toBe('…, weil der Mann die Tür aufgemacht hat.')
    expect(de({ ...on, satzart: 2, tense: 3, verb: 2 })).toBe('…, weil der Mann die Tür aufmachen wird.')
    expect(ru({ ...on, satzart: 2 })).toBe('…, потому что мужчина открывает дверь.')
  })

  it('fuses a separable verb back together in the Nebensatz', () => {
    expect(de({ ...on, satzart: 2, verb: 2 })).toBe('…, weil der Mann die Tür aufmacht.')
    expect(de({ ...on, satzart: 2, verb: 3, subject: 3, tense: 1 })).toBe('…, weil die Kinder die Tür zumachten.')
  })

  it('orders the Passiv verb cluster correctly in the Nebensatz', () => {
    expect(de({ ...on, satzart: 2, voice: 1, tense: 2, verb: 2 })).toBe('…, weil die Tür vom Mann aufgemacht worden ist.')
    expect(de({ ...on, satzart: 2, voice: 1, tense: 3 })).toBe('…, weil die Tür vom Mann geöffnet werden wird.')
  })

  it('pins to Hauptsatz while the toggle is off', () => {
    expect(de({ satzart: 1, toggles: { satzart: false } })).toBe('Der Mann öffnet die Tür.')
  })
})

describe('English translation', () => {
  it('translates the tenses, keeping Präteritum and Perfekt distinct', () => {
    expect(en({})).toBe('The man opens the door.')
    expect(en({ subject: 3 })).toBe('The children open the door.')
    expect(en({ tense: 1 })).toBe('The man opened the door.')
    expect(en({ tense: 2 })).toBe('The man has opened the door.')
    expect(en({ tense: 3 })).toBe('The man will open the door.')
    expect(en({ person: 0, toggles: { person: true } })).toBe('I open the door.')
    expect(en({ person: 1, tense: 2, toggles: { person: true } })).toBe('You have opened the door.')
  })

  it('translates the passive', () => {
    expect(en({ voice: 1 })).toBe('The door is opened by the man.')
    expect(en({ voice: 1, tense: 1, subject: 1 })).toBe('The door was opened by the woman.')
    expect(en({ voice: 1, tense: 2 })).toBe('The door has been opened by the man.')
    expect(en({ voice: 1, tense: 3 })).toBe('The door will be opened by the man.')
  })

  it('picks a/an for the indefinite article', () => {
    expect(en({ toggles: { indefinite: true } })).toBe('The man opens a door.')
    expect(en({ adjective: 0, toggles: { indefinite: true, adjective: true } })).toBe(
      'The man opens an old door.',
    )
    expect(en({ object: 1, adjective: 2, toggles: { indefinite: true, adjective: true } })).toBe(
      'The man opens a broken cupboard.',
    )
  })

  it('uses do-support for questions and negation', () => {
    expect(en({ satzart: 1 })).toBe('Does the man open the door?')
    expect(en({ satzart: 1, subject: 3, tense: 1 })).toBe('Did the children open the door?')
    expect(en({ satzart: 1, tense: 2 })).toBe('Has the man opened the door?')
    expect(en({ satzart: 1, voice: 1 })).toBe('Is the door opened by the man?')
    expect(en({ toggles: { negation: true } })).toBe('The man does not open the door.')
    expect(en({ tense: 1, toggles: { negation: true } })).toBe('The man did not open the door.')
    expect(en({ voice: 1, toggles: { negation: true } })).toBe('The door is not opened by the man.')
  })

  it('translates the Nebensatz with because', () => {
    expect(en({ satzart: 2, verb: 2 })).toBe('…, because the man opens the door.')
  })

  it('translates modals: can stays modal, müssen/wollen go periphrastic', () => {
    expect(en({ toggles: { modal: true } })).toBe('The man can open the door.')
    expect(en({ modal: 1, subject: 1, toggles: { modal: true } })).toBe('The woman has to open the door.')
    expect(en({ modal: 2, subject: 3, toggles: { modal: true } })).toBe('The children want to open the door.')
    expect(en({ tense: 1, toggles: { modal: true } })).toBe('The man could open the door.')
    expect(en({ satzart: 1, toggles: { modal: true } })).toBe('Can the man open the door?')
    expect(en({ modal: 1, satzart: 1, toggles: { modal: true } })).toBe('Does the man have to open the door?')
    expect(en({ toggles: { modal: true, negation: true } })).toBe('The man cannot open the door.')
    expect(en({ modal: 1, toggles: { modal: true, negation: true } })).toBe(
      'The man does not have to open the door.',
    )
    expect(en({ voice: 1, toggles: { modal: true } })).toBe('The door can be opened by the man.')
    expect(en({ modal: 1, voice: 1, toggles: { modal: true } })).toBe('The door has to be opened by the man.')
  })

  it('translates object pronouns as it', () => {
    expect(en({ toggles: { objectPronoun: true } })).toBe('The man opens it.')
    expect(en({ voice: 1, toggles: { objectPronoun: true } })).toBe('It is opened by the man.')
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
