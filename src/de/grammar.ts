// Runtime sentence composer. The pregenerated-JSON approach of v1 stopped
// scaling once object, adjective and pronoun modes multiplied the variant
// space into the thousands; the same hand-encoded tables now compose the
// sentence on the fly (still synchronous, still zero network requests).

import type { Selection, SentenceVariant, Toggles, Token } from '../lib/types'

// ---------------------------------------------------------------------------
// Tables

type RuGender = 'm' | 'f' | 'n' | 'pl'

interface Subject {
  de: string
  von: string
  pronoun: string
  vonPronoun: string
  plural: boolean
  ru: string
  ruPronoun: string
  ruGender: RuGender
  ruInstr: string
  ruInstrPronoun: string
}

const SUBJECTS: Subject[] = [
  {
    de: 'der Mann', von: 'vom Mann', pronoun: 'er', vonPronoun: 'von ihm', plural: false,
    ru: 'мужчина', ruPronoun: 'он', ruGender: 'm', ruInstr: 'мужчиной', ruInstrPronoun: 'им',
  },
  {
    de: 'die Frau', von: 'von der Frau', pronoun: 'sie', vonPronoun: 'von ihr', plural: false,
    ru: 'женщина', ruPronoun: 'она', ruGender: 'f', ruInstr: 'женщиной', ruInstrPronoun: 'ей',
  },
  {
    // Russian "ребёнок" is masculine, so the pronoun is "он" even though German uses "es".
    de: 'das Kind', von: 'vom Kind', pronoun: 'es', vonPronoun: 'von ihm', plural: false,
    ru: 'ребёнок', ruPronoun: 'он', ruGender: 'm', ruInstr: 'ребёнком', ruInstrPronoun: 'им',
  },
  {
    de: 'die Kinder', von: 'von den Kindern', pronoun: 'sie', vonPronoun: 'von ihnen', plural: true,
    ru: 'дети', ruPronoun: 'они', ruGender: 'pl', ruInstr: 'детьми', ruInstrPronoun: 'ими',
  },
]

interface Verb {
  lemma: string
  sep: string | null
  praesens3: string
  praesensPl: string
  praet3: string
  praetPl: string
  partizip2: string
  ru: {
    pres3: string
    presPl: string
    past: Record<RuGender, string>
    fut3: string
    futPl: string
    passivPres: string
    passivPart: Record<'m' | 'f' | 'n', string>
  }
}

// Inseparable verbs first: they stay available when the "trennbar" toggle is off.
const VERBS: Verb[] = [
  {
    lemma: 'öffnen', sep: null,
    praesens3: 'öffnet', praesensPl: 'öffnen',
    praet3: 'öffnete', praetPl: 'öffneten',
    partizip2: 'geöffnet',
    ru: {
      pres3: 'открывает', presPl: 'открывают',
      past: { m: 'открыл', f: 'открыла', n: 'открыло', pl: 'открыли' },
      fut3: 'откроет', futPl: 'откроют',
      passivPres: 'открывается',
      passivPart: { m: 'открыт', f: 'открыта', n: 'открыто' },
    },
  },
  {
    lemma: 'reparieren', sep: null,
    praesens3: 'repariert', praesensPl: 'reparieren',
    praet3: 'reparierte', praetPl: 'reparierten',
    partizip2: 'repariert',
    ru: {
      pres3: 'ремонтирует', presPl: 'ремонтируют',
      past: { m: 'отремонтировал', f: 'отремонтировала', n: 'отремонтировало', pl: 'отремонтировали' },
      fut3: 'отремонтирует', futPl: 'отремонтируют',
      passivPres: 'ремонтируется',
      passivPart: { m: 'отремонтирован', f: 'отремонтирована', n: 'отремонтировано' },
    },
  },
  {
    lemma: 'aufmachen', sep: 'auf',
    praesens3: 'macht', praesensPl: 'machen',
    praet3: 'machte', praetPl: 'machten',
    partizip2: 'aufgemacht',
    ru: {
      pres3: 'открывает', presPl: 'открывают',
      past: { m: 'открыл', f: 'открыла', n: 'открыло', pl: 'открыли' },
      fut3: 'откроет', futPl: 'откроют',
      passivPres: 'открывается',
      passivPart: { m: 'открыт', f: 'открыта', n: 'открыто' },
    },
  },
  {
    lemma: 'zumachen', sep: 'zu',
    praesens3: 'macht', praesensPl: 'machen',
    praet3: 'machte', praetPl: 'machten',
    partizip2: 'zugemacht',
    ru: {
      pres3: 'закрывает', presPl: 'закрывают',
      past: { m: 'закрыл', f: 'закрыла', n: 'закрыло', pl: 'закрыли' },
      fut3: 'закроет', futPl: 'закроют',
      passivPres: 'закрывается',
      passivPart: { m: 'закрыт', f: 'закрыта', n: 'закрыто' },
    },
  },
]

interface Obj {
  de: string
  noun: string
  gender: 'm' | 'f' | 'n'
  artNom: string
  artAcc: string
  einNom: string
  einAcc: string
  pronNom: string
  pronAcc: string
  ru: string
  ruAcc: string
  ruNomPron: string
  ruAccPron: string
  ruGender: 'm' | 'f' | 'n'
  ruWas: string
  ruWillBe: string
}

// Three genders — all three can be opened, closed and repaired, so every
// verb × object combination stays grammatical AND sensible.
const OBJECTS: Obj[] = [
  {
    de: 'die Tür', noun: 'Tür', gender: 'f', artNom: 'die', artAcc: 'die', einNom: 'eine', einAcc: 'eine',
    pronNom: 'sie', pronAcc: 'sie',
    ru: 'дверь', ruAcc: 'дверь', ruNomPron: 'она', ruAccPron: 'её', ruGender: 'f', ruWas: 'была', ruWillBe: 'будет',
  },
  {
    de: 'der Schrank', noun: 'Schrank', gender: 'm', artNom: 'der', artAcc: 'den', einNom: 'ein', einAcc: 'einen',
    pronNom: 'er', pronAcc: 'ihn',
    ru: 'шкаф', ruAcc: 'шкаф', ruNomPron: 'он', ruAccPron: 'его', ruGender: 'm', ruWas: 'был', ruWillBe: 'будет',
  },
  {
    de: 'das Fenster', noun: 'Fenster', gender: 'n', artNom: 'das', artAcc: 'das', einNom: 'ein', einAcc: 'ein',
    pronNom: 'es', pronAcc: 'es',
    ru: 'окно', ruAcc: 'окно', ruNomPron: 'оно', ruAccPron: 'его', ruGender: 'n', ruWas: 'было', ruWillBe: 'будет',
  },
]

interface Adjective {
  de: string
  ru: { m: string; f: string; n: string; fAcc: string }
}

const ADJECTIVES: Adjective[] = [
  { de: 'alt', ru: { m: 'старый', f: 'старая', n: 'старое', fAcc: 'старую' } },
  { de: 'neu', ru: { m: 'новый', f: 'новая', n: 'новое', fAcc: 'новую' } },
  { de: 'kaputt', ru: { m: 'сломанный', f: 'сломанная', n: 'сломанное', fAcc: 'сломанную' } },
]

export const TENSES = ['Präsens', 'Präteritum', 'Perfekt', 'Futur I'] as const
export const VOICES = ['Aktiv', 'Passiv'] as const
export const SATZARTEN = ['Hauptsatz', 'Frage', 'Nebensatz'] as const

type Tense = (typeof TENSES)[number]
type Voice = (typeof VOICES)[number]
type Satzart = (typeof SATZARTEN)[number]

// ---------------------------------------------------------------------------
// Dial configuration (consumed by the UI and the reducer)

export const DIAL = { subject: 0, verb: 1, object: 2, adjective: 3, tense: 4, voice: 5, satzart: 6 } as const

export interface DialSpec {
  id: 'subject' | 'verb' | 'object' | 'adjective' | 'tense' | 'voice' | 'satzart'
  label: string
  values: string[]
  /** Toggle that enables/disables the whole dial (checkbox inline with the label). */
  enable?: keyof Toggles
  /** Feature checkboxes under the dial that change what the dial produces. */
  features?: { key: keyof Toggles; label: string }[]
}

export const DIALS: DialSpec[] = [
  {
    id: 'subject', label: 'Subjekt', values: SUBJECTS.map((s) => s.de),
    features: [{ key: 'subjectPronoun', label: 'Pronomen' }],
  },
  {
    id: 'verb', label: 'Verb', values: VERBS.map((v) => v.lemma),
    features: [{ key: 'separable', label: 'trennbar' }],
  },
  {
    id: 'object', label: 'Objekt', values: OBJECTS.map((o) => o.de),
    features: [
      { key: 'objectPronoun', label: 'Pronomen' },
      { key: 'indefinite', label: 'unbestimmt' },
    ],
  },
  { id: 'adjective', label: 'Adjektiv', values: ADJECTIVES.map((a) => a.de), enable: 'adjective' },
  { id: 'tense', label: 'Zeitform', values: [...TENSES], enable: 'tenses' },
  { id: 'voice', label: 'Genus Verbi', values: [...VOICES], enable: 'voice' },
  { id: 'satzart', label: 'Satzart', values: [...SATZARTEN], enable: 'satzart' },
]

export function initialSelection(): Selection {
  return {
    indices: DIALS.map(() => 0),
    // v1 dimensions start enabled; the new features (adjective, pronouns)
    // start off so the initial sentence stays simple.
    toggles: {
      tenses: true,
      voice: true,
      satzart: false,
      adjective: false,
      separable: true,
      indefinite: false,
      subjectPronoun: false,
      objectPronoun: false,
    },
  }
}

export function isDialDisabled(dial: number, toggles: Toggles): boolean {
  switch (DIALS[dial].id) {
    case 'adjective':
      // A pronoun object cannot carry an adjective ("die alte sie" is not a thing).
      return !toggles.adjective || toggles.objectPronoun
    case 'tense':
      return !toggles.tenses
    case 'voice':
      return !toggles.voice
    case 'satzart':
      return !toggles.satzart
    default:
      return false
  }
}

export function isValueAvailable(dial: number, index: number, toggles: Toggles): boolean {
  return DIALS[dial].id !== 'verb' || !VERBS[index].sep || toggles.separable
}

// ---------------------------------------------------------------------------
// German composition: one declarative frame per (tense × voice) cell.

interface Ctx {
  subject: Subject
  verb: Verb
  object: Obj
  adjective: Adjective | null
  subjPron: boolean
  objPron: boolean
  indef: boolean
}

// A multi-word noun phrase: last word is the noun/pronoun, everything before
// it (articles, fused prepositions, "von") gets the `art` role.
function nounPhrase(phrase: string, nounRole: Token[1]): Token[] {
  const words = phrase.split(' ')
  return words.map((word, i) => [word, i === words.length - 1 ? nounRole : 'art'])
}

// Adjective ending in the noun phrase we reach (nominative/accusative,
// singular). Weak declension after der/die/das: -e, except masculine
// accusative -en. Mixed declension after ein-: the adjective carries the
// gender marker the article dropped (-er/-es), masculine accusative -en.
function adjectiveEnding(gender: 'm' | 'f' | 'n', kase: 'nom' | 'acc', indef: boolean): string {
  if (gender === 'm') return kase === 'acc' ? 'en' : indef ? 'er' : 'e'
  if (gender === 'n') return indef ? 'es' : 'e'
  return 'e'
}

function objectTokens(c: Ctx, kase: 'nom' | 'acc'): Token[] {
  const o = c.object
  if (c.objPron) return [[kase === 'nom' ? o.pronNom : o.pronAcc, 'obj']]
  const article = c.indef
    ? kase === 'nom' ? o.einNom : o.einAcc
    : kase === 'nom' ? o.artNom : o.artAcc
  const tokens: Token[] = [[article, 'art']]
  if (c.adjective) {
    tokens.push([c.adjective.de + adjectiveEnding(o.gender, kase, c.indef), 'adj'])
  }
  tokens.push([o.noun, 'obj'])
  return tokens
}

type Slot = (c: Ctx) => Token[]

const subjPhrase: Slot = (c) => (c.subjPron ? [[c.subject.pronoun, 'subj']] : nounPhrase(c.subject.de, 'subj'))
const objPhrase: Slot = (c) => objectTokens(c, 'acc')
const objAsSubject: Slot = (c) => objectTokens(c, 'nom')
const vonPhrase: Slot = (c) => nounPhrase(c.subjPron ? c.subject.vonPronoun : c.subject.von, 'subj')
const finPraesens: Slot = (c) => [[c.subject.plural ? c.verb.praesensPl : c.verb.praesens3, 'verb']]
const finPraeteritum: Slot = (c) => [[c.subject.plural ? c.verb.praetPl : c.verb.praet3, 'verb']]
// Verb-final position (Nebensatz): a separable verb fuses back onto its
// finite form — "macht … auf" becomes "… aufmacht".
const finPraesensFused: Slot = (c) => [
  [(c.verb.sep ?? '') + (c.subject.plural ? c.verb.praesensPl : c.verb.praesens3), 'verb'],
]
const finPraeteritumFused: Slot = (c) => [
  [(c.verb.sep ?? '') + (c.subject.plural ? c.verb.praetPl : c.verb.praet3), 'verb'],
]
const weil: Slot = () => [
  ['…,', 'other'],
  ['weil', 'other'],
]
const prefix: Slot = (c) => (c.verb.sep ? [[c.verb.sep, 'prefix']] : [])
const partizip2: Slot = (c) => [[c.verb.partizip2, 'verb']]
const infinitiv: Slot = (c) => [[c.verb.lemma, 'verb']]
const auxHaben: Slot = (c) => [[c.subject.plural ? 'haben' : 'hat', 'aux']]
const auxWerden: Slot = (c) => [[c.subject.plural ? 'werden' : 'wird', 'aux']]
// Passiv finite verbs agree with the object (always singular here), not the agent.
const wirdSg: Slot = () => [['wird', 'aux']]
const wurdeSg: Slot = () => [['wurde', 'aux']]
const istSg: Slot = () => [['ist', 'aux']]
const worden: Slot = () => [['worden', 'aux']]
const werdenInf: Slot = () => [['werden', 'aux']]

const FRAMES: Record<`${Satzart}|${Tense}|${Voice}`, Slot[]> = {
  // Hauptsatz: verb-second declarative.
  'Hauptsatz|Präsens|Aktiv': [subjPhrase, finPraesens, objPhrase, prefix],
  'Hauptsatz|Präteritum|Aktiv': [subjPhrase, finPraeteritum, objPhrase, prefix],
  'Hauptsatz|Perfekt|Aktiv': [subjPhrase, auxHaben, objPhrase, partizip2],
  'Hauptsatz|Futur I|Aktiv': [subjPhrase, auxWerden, objPhrase, infinitiv],
  'Hauptsatz|Präsens|Passiv': [objAsSubject, wirdSg, vonPhrase, partizip2],
  'Hauptsatz|Präteritum|Passiv': [objAsSubject, wurdeSg, vonPhrase, partizip2],
  'Hauptsatz|Perfekt|Passiv': [objAsSubject, istSg, vonPhrase, partizip2, worden],
  'Hauptsatz|Futur I|Passiv': [objAsSubject, wirdSg, vonPhrase, partizip2, werdenInf],
  // Frage (ja/nein): the finite verb moves to first position.
  'Frage|Präsens|Aktiv': [finPraesens, subjPhrase, objPhrase, prefix],
  'Frage|Präteritum|Aktiv': [finPraeteritum, subjPhrase, objPhrase, prefix],
  'Frage|Perfekt|Aktiv': [auxHaben, subjPhrase, objPhrase, partizip2],
  'Frage|Futur I|Aktiv': [auxWerden, subjPhrase, objPhrase, infinitiv],
  'Frage|Präsens|Passiv': [wirdSg, objAsSubject, vonPhrase, partizip2],
  'Frage|Präteritum|Passiv': [wurdeSg, objAsSubject, vonPhrase, partizip2],
  'Frage|Perfekt|Passiv': [istSg, objAsSubject, vonPhrase, partizip2, worden],
  'Frage|Futur I|Passiv': [wirdSg, objAsSubject, vonPhrase, partizip2, werdenInf],
  // Nebensatz (weil): the finite verb moves to last position; separable
  // verbs fuse back together.
  'Nebensatz|Präsens|Aktiv': [weil, subjPhrase, objPhrase, finPraesensFused],
  'Nebensatz|Präteritum|Aktiv': [weil, subjPhrase, objPhrase, finPraeteritumFused],
  'Nebensatz|Perfekt|Aktiv': [weil, subjPhrase, objPhrase, partizip2, auxHaben],
  'Nebensatz|Futur I|Aktiv': [weil, subjPhrase, objPhrase, infinitiv, auxWerden],
  'Nebensatz|Präsens|Passiv': [weil, objAsSubject, vonPhrase, partizip2, wirdSg],
  'Nebensatz|Präteritum|Passiv': [weil, objAsSubject, vonPhrase, partizip2, wurdeSg],
  'Nebensatz|Perfekt|Passiv': [weil, objAsSubject, vonPhrase, partizip2, worden, istSg],
  'Nebensatz|Futur I|Passiv': [weil, objAsSubject, vonPhrase, partizip2, werdenInf, wirdSg],
}

// ---------------------------------------------------------------------------
// Russian composition (approximate by design; good enough for "see the difference").

function ruAdjective(adjective: Adjective, gender: 'm' | 'f' | 'n', kase: 'nom' | 'acc'): string {
  return kase === 'acc' && gender === 'f' ? adjective.ru.fAcc : adjective.ru[gender]
}

/** Clause body without final punctuation or leading capital. */
function russianBody(c: Ctx, tense: Tense, voice: Voice): string {
  const { subject, verb, object, adjective } = c
  if (voice === 'Aktiv') {
    const subj = c.subjPron ? subject.ruPronoun : subject.ru
    const obj = c.objPron
      ? object.ruAccPron
      : `${adjective ? ruAdjective(adjective, object.ruGender, 'acc') + ' ' : ''}${object.ruAcc}`
    switch (tense) {
      case 'Präsens':
        return `${subj} ${subject.plural ? verb.ru.presPl : verb.ru.pres3} ${obj}`
      case 'Präteritum':
      case 'Perfekt':
        return `${subj} ${verb.ru.past[subject.ruGender]} ${obj}`
      case 'Futur I':
        return `${subj} ${subject.plural ? verb.ru.futPl : verb.ru.fut3} ${obj}`
    }
  }
  const objSubj = c.objPron
    ? object.ruNomPron
    : `${adjective ? ruAdjective(adjective, object.ruGender, 'nom') + ' ' : ''}${object.ru}`
  const agent = c.subjPron ? subject.ruInstrPronoun : subject.ruInstr
  const part = verb.ru.passivPart[object.ruGender]
  switch (tense) {
    case 'Präsens':
      return `${objSubj} ${verb.ru.passivPres} ${agent}`
    case 'Präteritum':
    case 'Perfekt':
      return `${objSubj} ${object.ruWas} ${part} ${agent}`
    case 'Futur I':
      return `${objSubj} ${object.ruWillBe} ${part} ${agent}`
  }
}

function composeRussian(c: Ctx, tense: Tense, voice: Voice, satzart: Satzart): string {
  const body = russianBody(c, tense, voice)
  switch (satzart) {
    case 'Hauptsatz':
      return `${capitalize(body)}.`
    case 'Frage':
      return `${capitalize(body)}?`
    case 'Nebensatz':
      return `…, потому что ${body}.`
  }
}

// ---------------------------------------------------------------------------
// Assembly

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function compose(sel: Selection): SentenceVariant {
  const { toggles } = sel
  const ctx: Ctx = {
    subject: SUBJECTS[sel.indices[DIAL.subject]],
    verb: VERBS[sel.indices[DIAL.verb]],
    object: OBJECTS[sel.indices[DIAL.object]],
    adjective: toggles.adjective && !toggles.objectPronoun ? ADJECTIVES[sel.indices[DIAL.adjective]] : null,
    subjPron: toggles.subjectPronoun,
    objPron: toggles.objectPronoun,
    indef: toggles.indefinite,
  }
  // Disabled dimensions pin to their first value even if the index is stale.
  const tense = TENSES[toggles.tenses ? sel.indices[DIAL.tense] : 0]
  const voice = VOICES[toggles.voice ? sel.indices[DIAL.voice] : 0]
  const satzart = SATZARTEN[toggles.satzart ? sel.indices[DIAL.satzart] : 0]
  const tokens = FRAMES[`${satzart}|${tense}|${voice}`].flatMap((slot) => slot(ctx))
  // Capitalize the first word; the Nebensatz opener "…," has no letter to raise.
  tokens[0] = [capitalize(tokens[0][0]), tokens[0][1]]
  return {
    de: tokens,
    end: satzart === 'Frage' ? '?' : '.',
    ru: composeRussian(ctx, tense, voice, satzart),
  }
}
