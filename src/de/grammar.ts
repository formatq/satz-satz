// Runtime sentence composer. The pregenerated-JSON approach of v1 stopped
// scaling once object, adjective and pronoun modes multiplied the variant
// space into the thousands; the same hand-encoded tables now compose the
// sentence on the fly (still synchronous, still zero network requests).

import type { Selection, SentenceVariant, Toggles, Token } from '../lib/types'

// ---------------------------------------------------------------------------
// Tables

type RuGender = 'm' | 'f' | 'n' | 'pl'

// Conjugation index into the six-row paradigm: ich·du·er·wir·ihr·sie.
type Person = 0 | 1 | 2 | 3 | 4 | 5

interface Subject {
  de: string
  von: string
  person: Person
  ru: string
  ruGender: RuGender
  ruInstr: string
  en: string
  enBy: string
}

const SUBJECTS: Subject[] = [
  {
    de: 'der Mann', von: 'vom Mann', person: 2, ru: 'мужчина', ruGender: 'm', ruInstr: 'мужчиной', en: 'the man', enBy: 'by the man',
  },
  {
    de: 'die Frau', von: 'von der Frau', person: 2, ru: 'женщина', ruGender: 'f', ruInstr: 'женщиной', en: 'the woman', enBy: 'by the woman',
  },
  {
    de: 'das Kind', von: 'vom Kind', person: 2, ru: 'ребёнок', ruGender: 'm', ruInstr: 'ребёнком', en: 'the child', enBy: 'by the child',
  },
  {
    de: 'die Kinder', von: 'von den Kindern', person: 5, ru: 'дети', ruGender: 'pl', ruInstr: 'детьми', en: 'the children', enBy: 'by the children',
  },
]

// Personal pronouns as subjects. They reuse the Subject shape, so every slot
// (agreement, von-phrase, Russian) works unchanged.
const PERSONS: Subject[] = [
  {
    de: 'ich', von: 'von mir', person: 0, ru: 'я', ruGender: 'm', ruInstr: 'мной', en: 'I', enBy: 'by me',
  },
  {
    de: 'du', von: 'von dir', person: 1, ru: 'ты', ruGender: 'm', ruInstr: 'тобой', en: 'you', enBy: 'by you',
  },
  {
    de: 'er', von: 'von ihm', person: 2, ru: 'он', ruGender: 'm', ruInstr: 'им', en: 'he', enBy: 'by him',
  },
  {
    de: 'wir', von: 'von uns', person: 3, ru: 'мы', ruGender: 'pl', ruInstr: 'нами', en: 'we', enBy: 'by us',
  },
  {
    de: 'ihr', von: 'von euch', person: 4, ru: 'вы', ruGender: 'pl', ruInstr: 'вами', en: 'you', enBy: 'by you',
  },
  {
    de: 'sie', von: 'von ihnen', person: 5, ru: 'они', ruGender: 'pl', ruInstr: 'ими', en: 'they', enBy: 'by them',
  },
]

interface Verb {
  lemma: string
  sep: string | null
  /** Six finite forms each, indexed by Person: ich·du·er·wir·ihr·sie. */
  praesens: string[]
  praeteritum: string[]
  partizip2: string
  en: { base: string; s3: string; past: string; part: string }
  ru: {
    /** Perfective infinitive, for modal constructions (может открыть). */
    inf: string
    /** Six forms indexed by Person: я·ты·он·мы·вы·они. */
    pres: string[]
    fut: string[]
    past: Record<RuGender, string>
    passivPres: string
    passivPart: Record<'m' | 'f' | 'n', string>
  }
}

const VERBS: Verb[] = [
  {
    lemma: 'öffnen', sep: null,
    en: { base: 'open', s3: 'opens', past: 'opened', part: 'opened' },
    praesens: ['öffne', 'öffnest', 'öffnet', 'öffnen', 'öffnet', 'öffnen'],
    praeteritum: ['öffnete', 'öffnetest', 'öffnete', 'öffneten', 'öffnetet', 'öffneten'],
    partizip2: 'geöffnet',
    ru: {
      inf: 'открыть',
      pres: ['открываю', 'открываешь', 'открывает', 'открываем', 'открываете', 'открывают'],
      fut: ['открою', 'откроешь', 'откроет', 'откроем', 'откроете', 'откроют'],
      past: { m: 'открыл', f: 'открыла', n: 'открыло', pl: 'открыли' },
      passivPres: 'открывается',
      passivPart: { m: 'открыт', f: 'открыта', n: 'открыто' },
    },
  },
  {
    lemma: 'reparieren', sep: null,
    en: { base: 'repair', s3: 'repairs', past: 'repaired', part: 'repaired' },
    praesens: ['repariere', 'reparierst', 'repariert', 'reparieren', 'repariert', 'reparieren'],
    praeteritum: ['reparierte', 'repariertest', 'reparierte', 'reparierten', 'repariertet', 'reparierten'],
    partizip2: 'repariert',
    ru: {
      inf: 'отремонтировать',
      pres: ['ремонтирую', 'ремонтируешь', 'ремонтирует', 'ремонтируем', 'ремонтируете', 'ремонтируют'],
      fut: ['отремонтирую', 'отремонтируешь', 'отремонтирует', 'отремонтируем', 'отремонтируете', 'отремонтируют'],
      past: { m: 'отремонтировал', f: 'отремонтировала', n: 'отремонтировало', pl: 'отремонтировали' },
      passivPres: 'ремонтируется',
      passivPart: { m: 'отремонтирован', f: 'отремонтирована', n: 'отремонтировано' },
    },
  },
  {
    lemma: 'aufmachen', sep: 'auf',
    en: { base: 'open', s3: 'opens', past: 'opened', part: 'opened' },
    praesens: ['mache', 'machst', 'macht', 'machen', 'macht', 'machen'],
    praeteritum: ['machte', 'machtest', 'machte', 'machten', 'machtet', 'machten'],
    partizip2: 'aufgemacht',
    ru: {
      inf: 'открыть',
      pres: ['открываю', 'открываешь', 'открывает', 'открываем', 'открываете', 'открывают'],
      fut: ['открою', 'откроешь', 'откроет', 'откроем', 'откроете', 'откроют'],
      past: { m: 'открыл', f: 'открыла', n: 'открыло', pl: 'открыли' },
      passivPres: 'открывается',
      passivPart: { m: 'открыт', f: 'открыта', n: 'открыто' },
    },
  },
  {
    lemma: 'zumachen', sep: 'zu',
    en: { base: 'close', s3: 'closes', past: 'closed', part: 'closed' },
    praesens: ['mache', 'machst', 'macht', 'machen', 'macht', 'machen'],
    praeteritum: ['machte', 'machtest', 'machte', 'machten', 'machtet', 'machten'],
    partizip2: 'zugemacht',
    ru: {
      inf: 'закрыть',
      pres: ['закрываю', 'закрываешь', 'закрывает', 'закрываем', 'закрываете', 'закрывают'],
      fut: ['закрою', 'закроешь', 'закроет', 'закроем', 'закроете', 'закроют'],
      past: { m: 'закрыл', f: 'закрыла', n: 'закрыло', pl: 'закрыли' },
      passivPres: 'закрывается',
      passivPart: { m: 'закрыт', f: 'закрыта', n: 'закрыто' },
    },
  },
]

/** Auxiliary paradigms, indexed by Person. */
const HABEN = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben']
const WERDEN = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden']

interface Modal {
  lemma: string
  /** Six finite forms each, indexed by Person (note the irregular singular: kann/muss/will). */
  praesens: string[]
  praeteritum: string[]
  /** English: `can` is a true modal; müssen/wollen go periphrastic (have to / want to) with do-support. */
  en: { can: true; past: string } | { can?: undefined; base: string; s3: string; past: string }
  ru: {
    /** By person: могу·можешь·может·… */
    pres: string[]
    /** Overrides `pres` when the Russian form agrees in gender instead (должен/должна). */
    presGender?: Record<RuGender, string>
    past: Record<RuGender, string>
  }
}

const MODALS: Modal[] = [
  {
    lemma: 'können',
    en: { can: true, past: 'could' },
    praesens: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'],
    praeteritum: ['konnte', 'konntest', 'konnte', 'konnten', 'konntet', 'konnten'],
    ru: {
      pres: ['могу', 'можешь', 'может', 'можем', 'можете', 'могут'],
      past: { m: 'мог', f: 'могла', n: 'могло', pl: 'могли' },
    },
  },
  {
    lemma: 'müssen',
    en: { base: 'have to', s3: 'has to', past: 'had to' },
    praesens: ['muss', 'musst', 'muss', 'müssen', 'müsst', 'müssen'],
    praeteritum: ['musste', 'musstest', 'musste', 'mussten', 'musstet', 'mussten'],
    ru: {
      pres: ['должен', 'должен', 'должен', 'должны', 'должны', 'должны'],
      presGender: { m: 'должен', f: 'должна', n: 'должно', pl: 'должны' },
      past: { m: 'должен был', f: 'должна была', n: 'должно было', pl: 'должны были' },
    },
  },
  {
    lemma: 'wollen',
    en: { base: 'want to', s3: 'wants to', past: 'wanted to' },
    praesens: ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'],
    praeteritum: ['wollte', 'wolltest', 'wollte', 'wollten', 'wolltet', 'wollten'],
    ru: {
      pres: ['хочу', 'хочешь', 'хочет', 'хотим', 'хотите', 'хотят'],
      past: { m: 'хотел', f: 'хотела', n: 'хотело', pl: 'хотели' },
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
  en: string
}

// Three genders — all three can be opened, closed and repaired, so every
// verb × object combination stays grammatical AND sensible.
const OBJECTS: Obj[] = [
  {
    de: 'die Tür', noun: 'Tür', gender: 'f', artNom: 'die', artAcc: 'die', einNom: 'eine', einAcc: 'eine',
    pronNom: 'sie', pronAcc: 'sie',
    ru: 'дверь', ruAcc: 'дверь', ruNomPron: 'она', ruAccPron: 'её', ruGender: 'f', ruWas: 'была', ruWillBe: 'будет', en: 'door',
  },
  {
    de: 'der Schrank', noun: 'Schrank', gender: 'm', artNom: 'der', artAcc: 'den', einNom: 'ein', einAcc: 'einen',
    pronNom: 'er', pronAcc: 'ihn',
    ru: 'шкаф', ruAcc: 'шкаф', ruNomPron: 'он', ruAccPron: 'его', ruGender: 'm', ruWas: 'был', ruWillBe: 'будет', en: 'cupboard',
  },
  {
    de: 'das Fenster', noun: 'Fenster', gender: 'n', artNom: 'das', artAcc: 'das', einNom: 'ein', einAcc: 'ein',
    pronNom: 'es', pronAcc: 'es',
    ru: 'окно', ruAcc: 'окно', ruNomPron: 'оно', ruAccPron: 'его', ruGender: 'n', ruWas: 'было', ruWillBe: 'будет', en: 'window',
  },
]

interface Adjective {
  de: string
  en: string
  ru: { m: string; f: string; n: string; fAcc: string }
}

const ADJECTIVES: Adjective[] = [
  { de: 'alt', en: 'old', ru: { m: 'старый', f: 'старая', n: 'старое', fAcc: 'старую' } },
  { de: 'neu', en: 'new', ru: { m: 'новый', f: 'новая', n: 'новое', fAcc: 'новую' } },
  { de: 'kaputt', en: 'broken', ru: { m: 'сломанный', f: 'сломанная', n: 'сломанное', fAcc: 'сломанную' } },
]

interface Recipient {
  de: string
  /** Russian dative, for the active clause (открывает женщине дверь). */
  ru: string
  /** для + genitive, for the passive clause (открывается мужчиной для женщины). */
  ruFor: string
  en: string
}

// The benefactive dative combines with every verb × object pair (öffnet der
// Frau die Tür, repariert dem Kind den Schrank), so the recipient is a third
// participant on top of the existing inventories, not a new verb class. The
// nouns repeat the Subjekt dial on purpose: the learner sees der → dem,
// die → der, die → den on words they already know. die Frau leads so the
// default doesn't collide with the default subject der Mann.
const RECIPIENTS: Recipient[] = [
  { de: 'der Frau', ru: 'женщине', ruFor: 'для женщины', en: 'for the woman' },
  { de: 'dem Kind', ru: 'ребёнку', ruFor: 'для ребёнка', en: 'for the child' },
  { de: 'dem Mann', ru: 'мужчине', ruFor: 'для мужчины', en: 'for the man' },
  { de: 'den Kindern', ru: 'детям', ruFor: 'для детей', en: 'for the children' },
]

export const TENSES = ['Präsens', 'Präteritum', 'Perfekt', 'Futur I'] as const
export const VOICES = ['Aktiv', 'Passiv'] as const
export const SATZARTEN = ['Hauptsatz', 'Frage', 'Nebensatz'] as const

type Tense = (typeof TENSES)[number]
type Voice = (typeof VOICES)[number]
type Satzart = (typeof SATZARTEN)[number]

// ---------------------------------------------------------------------------
// Dial configuration (consumed by the UI and the reducer)

// recipient is appended so the existing dial indices stay stable.
export const DIAL = { subject: 0, person: 1, verb: 2, modal: 3, object: 4, adjective: 5, tense: 6, voice: 7, satzart: 8, recipient: 9 } as const

export interface DialSpec {
  id: 'subject' | 'person' | 'verb' | 'modal' | 'object' | 'adjective' | 'tense' | 'voice' | 'satzart' | 'recipient'
  label: string
  values: string[]
}

export const DIALS: DialSpec[] = [
  { id: 'subject', label: 'Subjekt', values: SUBJECTS.map((s) => s.de) },
  { id: 'person', label: 'Person', values: PERSONS.map((p) => p.de) },
  { id: 'verb', label: 'Verb', values: VERBS.map((v) => v.lemma) },
  { id: 'modal', label: 'Modalverb', values: MODALS.map((m) => m.lemma) },
  { id: 'object', label: 'Objekt', values: OBJECTS.map((o) => o.de) },
  { id: 'adjective', label: 'Adjektiv', values: ADJECTIVES.map((a) => a.de) },
  { id: 'tense', label: 'Zeitform', values: [...TENSES] },
  { id: 'voice', label: 'Genus Verbi', values: [...VOICES] },
  { id: 'satzart', label: 'Satzart', values: [...SATZARTEN] },
  { id: 'recipient', label: 'Dativobjekt', values: RECIPIENTS.map((r) => r.de) },
]

/** Everything configurable, in hamburger-menu order: dials first, then features. */
export const MENU_TOGGLES: { key: keyof Toggles; label: string }[] = [
  { key: 'person', label: 'Subjekt als Pronomen' },
  { key: 'modal', label: 'Modalverb' },
  { key: 'dative', label: 'Dativobjekt' },
  { key: 'adjective', label: 'Adjektiv' },
  { key: 'tenses', label: 'Zeitform' },
  { key: 'voice', label: 'Genus Verbi' },
  { key: 'satzart', label: 'Satzart' },
  { key: 'indefinite', label: 'unbestimmter Artikel' },
  { key: 'negation', label: 'Negation' },
  { key: 'objectPronoun', label: 'Pronomen (Objekt)' },
]

/** Menu entries locked in the current state: a pronoun object takes no article and no adjective. */
export function isToggleLocked(key: keyof Toggles, toggles: Toggles): boolean {
  return (key === 'adjective' || key === 'indefinite') && toggles.objectPronoun
}

export function initialSelection(): Selection {
  return {
    indices: DIALS.map(() => 0),
    // First impression is the simple app — Subjekt · Verb · Objekt only;
    // everything else is opened up from the hamburger menu over time.
    toggles: {
      tenses: false,
      voice: false,
      satzart: false,
      person: false,
      modal: false,
      adjective: false,
      indefinite: true,
      negation: false,
      objectPronoun: false,
      dative: false,
    },
  }
}

export function isDialDisabled(dial: number, toggles: Toggles): boolean {
  switch (DIALS[dial].id) {
    // Exactly one of Subjekt/Person drives the sentence at a time.
    case 'subject':
      return toggles.person
    case 'person':
      return !toggles.person
    case 'modal':
      return !toggles.modal
    case 'adjective':
      // A pronoun object cannot carry an adjective ("die alte sie" is not a thing).
      return !toggles.adjective || toggles.objectPronoun
    case 'tense':
      return !toggles.tenses
    case 'voice':
      return !toggles.voice
    case 'satzart':
      return !toggles.satzart
    case 'recipient':
      return !toggles.dative
    default:
      return false
  }
}

export function isValueAvailable(dial: number, index: number, toggles: Toggles): boolean {
  // With a modal the app stays out of double-infinitive territory
  // (hat aufmachen können): Präsens and Präteritum only.
  return DIALS[dial].id !== 'tense' || !toggles.modal || index < 2
}

// ---------------------------------------------------------------------------
// German composition: one declarative frame per (tense × voice) cell.

interface Ctx {
  subject: Subject
  verb: Verb
  modal: Modal | null
  object: Obj
  adjective: Adjective | null
  recipient: Recipient | null
  objPron: boolean
  indef: boolean
  neg: boolean
}

// German negates an indefinite noun phrase in its article (kein-) and
// everything else with `nicht` before the final verb cluster.
function usesKein(c: Ctx): boolean {
  return c.neg && c.indef && !c.objPron
}

function nichtTokens(c: Ctx): Token[] {
  return c.neg && !usesKein(c) ? [['nicht', 'other']] : []
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
  let article = c.indef
    ? kase === 'nom' ? o.einNom : o.einAcc
    : kase === 'nom' ? o.artNom : o.artAcc
  // kein- declines exactly like ein-: eine → keine, einen → keinen.
  if (usesKein(c)) article = `k${article}`
  const tokens: Token[] = [[article, 'art']]
  if (c.adjective) {
    tokens.push([c.adjective.de + adjectiveEnding(o.gender, kase, c.indef), 'adj'])
  }
  tokens.push([o.noun, 'obj'])
  return tokens
}

type Slot = (c: Ctx) => Token[]

const subjPhrase: Slot = (c) => nounPhrase(c.subject.de, 'subj')
const recipientTokens = (c: Ctx): Token[] => (c.recipient ? nounPhrase(c.recipient.de, 'obj') : [])
// `nicht` negates the predicate, so in every frame it lands right after the
// object (Aktiv) / the agent (Passiv), just before the final verb cluster.
// Mittelfeld order: the dative precedes an accusative noun (öffnet der Frau
// die Tür), but an accusative pronoun jumps ahead of it (öffnet sie der Frau).
const objPhrase: Slot = (c) => {
  const dat = recipientTokens(c)
  const acc = objectTokens(c, 'acc')
  return [...(c.objPron ? [...acc, ...dat] : [...dat, ...acc]), ...nichtTokens(c)]
}
const objAsSubject: Slot = (c) => objectTokens(c, 'nom')
// In Passiv the dative stays dative and precedes the von-agent:
// Die Tür wird der Frau vom Mann geöffnet.
const vonPhrase: Slot = (c) => [
  ...recipientTokens(c),
  ...nounPhrase(c.subject.von, 'subj'),
  ...nichtTokens(c),
]
const finPraesens: Slot = (c) => [[c.verb.praesens[c.subject.person], 'verb']]
const finPraeteritum: Slot = (c) => [[c.verb.praeteritum[c.subject.person], 'verb']]
// Verb-final position (Nebensatz): a separable verb fuses back onto its
// finite form — "macht … auf" becomes "… aufmacht".
const finPraesensFused: Slot = (c) => [
  [(c.verb.sep ?? '') + c.verb.praesens[c.subject.person], 'verb'],
]
const finPraeteritumFused: Slot = (c) => [
  [(c.verb.sep ?? '') + c.verb.praeteritum[c.subject.person], 'verb'],
]
const weil: Slot = () => [
  ['…,', 'other'],
  ['weil', 'other'],
]
const prefix: Slot = (c) => (c.verb.sep ? [[c.verb.sep, 'prefix']] : [])
const partizip2: Slot = (c) => [[c.verb.partizip2, 'verb']]
const infinitiv: Slot = (c) => [[c.verb.lemma, 'verb']]
const auxHaben: Slot = (c) => [[HABEN[c.subject.person], 'aux']]
const auxWerden: Slot = (c) => [[WERDEN[c.subject.person], 'aux']]
// Passiv finite verbs agree with the object (always singular here), not the agent.
const wirdSg: Slot = () => [['wird', 'aux']]
const wurdeSg: Slot = () => [['wurde', 'aux']]
const istSg: Slot = () => [['ist', 'aux']]
const worden: Slot = () => [['worden', 'aux']]
const werdenInf: Slot = () => [['werden', 'aux']]
// The modal takes the finite slot; in Passiv it agrees with the (singular) object.
const modalPraesens: Slot = (c) => [[c.modal!.praesens[c.subject.person], 'aux']]
const modalPraeteritum: Slot = (c) => [[c.modal!.praeteritum[c.subject.person], 'aux']]
const modalPraesensSg: Slot = (c) => [[c.modal!.praesens[2], 'aux']]
const modalPraeteritumSg: Slot = (c) => [[c.modal!.praeteritum[2], 'aux']]

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

// With a modal the finite slot holds the modal and the main verb becomes a
// final infinitive; Passiv adds the Infinitiv Passiv (partizip2 + werden).
// Tense is restricted to Präsens/Präteritum (see isValueAvailable).
type ModalTense = 'Präsens' | 'Präteritum'

const MODAL_FRAMES: Record<`${Satzart}|${ModalTense}|${Voice}`, Slot[]> = {
  'Hauptsatz|Präsens|Aktiv': [subjPhrase, modalPraesens, objPhrase, infinitiv],
  'Hauptsatz|Präteritum|Aktiv': [subjPhrase, modalPraeteritum, objPhrase, infinitiv],
  'Frage|Präsens|Aktiv': [modalPraesens, subjPhrase, objPhrase, infinitiv],
  'Frage|Präteritum|Aktiv': [modalPraeteritum, subjPhrase, objPhrase, infinitiv],
  'Nebensatz|Präsens|Aktiv': [weil, subjPhrase, objPhrase, infinitiv, modalPraesens],
  'Nebensatz|Präteritum|Aktiv': [weil, subjPhrase, objPhrase, infinitiv, modalPraeteritum],
  'Hauptsatz|Präsens|Passiv': [objAsSubject, modalPraesensSg, vonPhrase, partizip2, werdenInf],
  'Hauptsatz|Präteritum|Passiv': [objAsSubject, modalPraeteritumSg, vonPhrase, partizip2, werdenInf],
  'Frage|Präsens|Passiv': [modalPraesensSg, objAsSubject, vonPhrase, partizip2, werdenInf],
  'Frage|Präteritum|Passiv': [modalPraeteritumSg, objAsSubject, vonPhrase, partizip2, werdenInf],
  'Nebensatz|Präsens|Passiv': [weil, objAsSubject, vonPhrase, partizip2, werdenInf, modalPraesensSg],
  'Nebensatz|Präteritum|Passiv': [weil, objAsSubject, vonPhrase, partizip2, werdenInf, modalPraeteritumSg],
}

// ---------------------------------------------------------------------------
// Russian composition (approximate by design; good enough for "see the difference").

function ruAdjective(adjective: Adjective, gender: 'm' | 'f' | 'n', kase: 'nom' | 'acc'): string {
  return kase === 'acc' && gender === 'f' ? adjective.ru.fAcc : adjective.ru[gender]
}

/** Modal present: должен agrees in gender, могу/хочу conjugate by person. */
function ruModalPres(modal: Modal, person: Person, gender: RuGender): string {
  return modal.ru.presGender?.[gender] ?? modal.ru.pres[person]
}

/** Clause body without final punctuation or leading capital. */
function russianBody(c: Ctx, tense: Tense, voice: Voice): string {
  const { subject, verb, modal, object, adjective } = c
  // Russian negates with "не" before the (finite) verb, for nicht and kein alike.
  const ne = c.neg ? 'не ' : ''
  if (voice === 'Aktiv') {
    const subj = subject.ru
    // Russian mirrors the German Mittelfeld order: dative before an accusative
    // noun (открывает женщине дверь), after an accusative pronoun (открывает её женщине).
    const dat = c.recipient ? c.recipient.ru : ''
    const obj = (c.objPron
      ? [object.ruAccPron, dat]
      : [dat, adjective ? ruAdjective(adjective, object.ruGender, 'acc') : '', object.ruAcc]
    )
      .filter(Boolean)
      .join(' ')
    if (modal) {
      const form =
        tense === 'Präteritum'
          ? modal.ru.past[subject.ruGender]
          : ruModalPres(modal, subject.person, subject.ruGender)
      return `${subj} ${ne}${form} ${verb.ru.inf} ${obj}`
    }
    switch (tense) {
      case 'Präsens':
        return `${subj} ${ne}${verb.ru.pres[subject.person]} ${obj}`
      case 'Präteritum':
      case 'Perfekt':
        return `${subj} ${ne}${verb.ru.past[subject.ruGender]} ${obj}`
      case 'Futur I':
        return `${subj} ${ne}${verb.ru.fut[subject.person]} ${obj}`
    }
  }
  const objSubj = c.objPron
    ? object.ruNomPron
    : `${adjective ? ruAdjective(adjective, object.ruGender, 'nom') + ' ' : ''}${object.ru}`
  // A dative would be stilted in the Russian passive; «для + genitive» keeps
  // the beneficiary readable: открывается мужчиной для женщины.
  const agent = subject.ruInstr + (c.recipient ? ` ${c.recipient.ruFor}` : '')
  const part = verb.ru.passivPart[object.ruGender]
  if (modal) {
    // The modal agrees with the passive subject: дверь может/должна быть открыта.
    const form =
      tense === 'Präteritum'
        ? modal.ru.past[object.ruGender]
        : ruModalPres(modal, 2, object.ruGender)
    return `${objSubj} ${ne}${form} быть ${part} ${agent}`
  }
  switch (tense) {
    case 'Präsens':
      return `${objSubj} ${ne}${verb.ru.passivPres} ${agent}`
    case 'Präteritum':
    case 'Perfekt':
      return `${objSubj} ${ne}${object.ruWas} ${part} ${agent}`
    case 'Futur I':
      return `${objSubj} ${ne}${object.ruWillBe} ${part} ${agent}`
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
// English composition. Deliberately more informative than Russian in places:
// Präteritum/Perfekt stay distinct (opened / has opened) and questions get
// their do-support (Does the man open …?).

function enObjPhrase(c: Ctx): string {
  if (c.objPron) return 'it'
  const adjective = c.adjective?.en
  const first = adjective ?? c.object.en
  const article = c.indef ? (/^[aeiou]/.test(first) ? 'an' : 'a') : 'the'
  return [article, adjective, c.object.en].filter(Boolean).join(' ')
}

/** Präsens/Präteritum simple clause with do-support for negation and questions. */
function enSimple(
  subj: string,
  is3: boolean,
  verb: { base: string; s3: string; past: string },
  rest: string,
  past: boolean,
  not: boolean,
  question: boolean,
): string {
  if (question || not) {
    const doAux = past ? 'did' : is3 ? 'does' : 'do'
    return question
      ? `${doAux} ${subj}${not ? ' not' : ''} ${verb.base} ${rest}`
      : `${subj} ${doAux} not ${verb.base} ${rest}`
  }
  return `${subj} ${past ? verb.past : is3 ? verb.s3 : verb.base} ${rest}`
}

function enActive(c: Ctx, tense: Tense, question: boolean): string {
  const verb = c.verb.en
  const is3 = c.subject.person === 2
  const subj = c.subject.en
  // English renders the beneficiary as a for-phrase: opens the door for the woman.
  const obj = enObjPhrase(c) + (c.recipient ? ` ${c.recipient.en}` : '')
  const not = c.neg
  const past = tense === 'Präteritum'
  if (c.modal) {
    const modal = c.modal.en
    if (modal.can) {
      const aux = past ? 'could' : 'can'
      if (question) return `${aux} ${subj}${not ? ' not' : ''} ${verb.base} ${obj}`
      return `${subj} ${not ? (past ? 'could not' : 'cannot') : aux} ${verb.base} ${obj}`
    }
    // Periphrastic modal (have to / want to) behaves like a simple verb.
    const composite = {
      base: `${modal.base} ${verb.base}`,
      s3: `${modal.s3} ${verb.base}`,
      past: `${modal.past} ${verb.base}`,
    }
    return enSimple(subj, is3, composite, obj, past, not, question)
  }
  switch (tense) {
    case 'Präsens':
    case 'Präteritum':
      return enSimple(subj, is3, verb, obj, past, not, question)
    case 'Perfekt': {
      const aux = is3 ? 'has' : 'have'
      return question
        ? `${aux} ${subj}${not ? ' not' : ''} ${verb.part} ${obj}`
        : `${subj} ${aux}${not ? ' not' : ''} ${verb.part} ${obj}`
    }
    case 'Futur I':
      return question
        ? `will ${subj}${not ? ' not' : ''} ${verb.base} ${obj}`
        : `${subj} will${not ? ' not' : ''} ${verb.base} ${obj}`
  }
}

function enPassive(c: Ctx, tense: Tense, question: boolean): string {
  const verb = c.verb.en
  const objSubj = enObjPhrase(c)
  // The for-phrase precedes the by-agent: opened for the woman by the man.
  const by = (c.recipient ? `${c.recipient.en} ` : '') + c.subject.enBy
  const not = c.neg
  const past = tense === 'Präteritum'
  if (c.modal) {
    const modal = c.modal.en
    if (modal.can) {
      const aux = past ? 'could' : 'can'
      if (question) return `${aux} ${objSubj}${not ? ' not' : ''} be ${verb.part} ${by}`
      return `${objSubj} ${not ? (past ? 'could not' : 'cannot') : aux} be ${verb.part} ${by}`
    }
    // The passive subject is always 3sg here.
    const composite = { base: `${modal.base} be`, s3: `${modal.s3} be`, past: `${modal.past} be` }
    return enSimple(objSubj, true, composite, `${verb.part} ${by}`, past, not, question)
  }
  switch (tense) {
    case 'Präsens':
    case 'Präteritum': {
      const be = past ? 'was' : 'is'
      return question
        ? `${be} ${objSubj}${not ? ' not' : ''} ${verb.part} ${by}`
        : `${objSubj} ${be}${not ? ' not' : ''} ${verb.part} ${by}`
    }
    case 'Perfekt':
      return question
        ? `has ${objSubj}${not ? ' not' : ''} been ${verb.part} ${by}`
        : `${objSubj} has${not ? ' not' : ''} been ${verb.part} ${by}`
    case 'Futur I':
      return question
        ? `will ${objSubj}${not ? ' not' : ''} be ${verb.part} ${by}`
        : `${objSubj} will${not ? ' not' : ''} be ${verb.part} ${by}`
  }
}

function composeEnglish(c: Ctx, tense: Tense, voice: Voice, satzart: Satzart): string {
  const clause = (question: boolean) =>
    voice === 'Aktiv' ? enActive(c, tense, question) : enPassive(c, tense, question)
  switch (satzart) {
    case 'Hauptsatz':
      return `${capitalize(clause(false))}.`
    case 'Frage':
      return `${capitalize(clause(true))}?`
    case 'Nebensatz':
      return `…, because ${clause(false)}.`
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
    subject: toggles.person ? PERSONS[sel.indices[DIAL.person]] : SUBJECTS[sel.indices[DIAL.subject]],
    verb: VERBS[sel.indices[DIAL.verb]],
    modal: toggles.modal ? MODALS[sel.indices[DIAL.modal]] : null,
    object: OBJECTS[sel.indices[DIAL.object]],
    adjective: toggles.adjective && !toggles.objectPronoun ? ADJECTIVES[sel.indices[DIAL.adjective]] : null,
    recipient: toggles.dative ? RECIPIENTS[sel.indices[DIAL.recipient]] : null,
    objPron: toggles.objectPronoun,
    indef: toggles.indefinite,
    neg: toggles.negation,
  }
  // Disabled dimensions pin to their first value even if the index is stale.
  const tense = TENSES[toggles.tenses ? sel.indices[DIAL.tense] : 0]
  const voice = VOICES[toggles.voice ? sel.indices[DIAL.voice] : 0]
  const satzart = SATZARTEN[toggles.satzart ? sel.indices[DIAL.satzart] : 0]
  // Modal frames only exist for Präsens/Präteritum; the reducer keeps the
  // tense in range, this clamp is just a safety net for stale selections.
  const frame = ctx.modal
    ? MODAL_FRAMES[`${satzart}|${tense === 'Präsens' || tense === 'Präteritum' ? tense : 'Präsens'}|${voice}`]
    : FRAMES[`${satzart}|${tense}|${voice}`]
  const tokens = frame.flatMap((slot) => slot(ctx))
  // Capitalize the first word; the Nebensatz opener "…," has no letter to raise.
  tokens[0] = [capitalize(tokens[0][0]), tokens[0][1]]
  return {
    de: tokens,
    end: satzart === 'Frage' ? '?' : '.',
    ru: composeRussian(ctx, tense, voice, satzart),
    en: composeEnglish(ctx, tense, voice, satzart),
  }
}
