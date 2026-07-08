// Deterministic generator for template "die Tür".
// Run manually (`npm run generate`); output is committed to src/de/data/tuer.json.
// Correctness lives in the tables and frames below — review those, not the 160 sentences.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ---------------------------------------------------------------------------
// Tables

const OBJECT = {
  // "die Tür" as accusative object (Aktiv) and as nominative subject (Passiv).
  de: ['die', 'Tür'],
  ru: 'дверь',
  // Russian passive forms agree with "дверь" (feminine).
  ruWas: 'была',
  ruWillBe: 'будет',
}

const SUBJECTS = [
  { de: 'der Mann', von: 'vom Mann', plural: false, ru: 'мужчина', ruGender: 'm', ruInstr: 'мужчиной' },
  { de: 'die Frau', von: 'von der Frau', plural: false, ru: 'женщина', ruGender: 'f', ruInstr: 'женщиной' },
  { de: 'das Kind', von: 'vom Kind', plural: false, ru: 'ребёнок', ruGender: 'm', ruInstr: 'ребёнком' },
  { de: 'die Kinder', von: 'von den Kindern', plural: true, ru: 'дети', ruGender: 'pl', ruInstr: 'детьми' },
]

const VERBS = [
  {
    lemma: 'aufmachen', sep: 'auf',
    praesens3: 'macht', praesensPl: 'machen',
    praet3: 'machte', praetPl: 'machten',
    partizip2: 'aufgemacht', aux: 'haben',
    ru: {
      pres3: 'открывает', presPl: 'открывают',
      past: { m: 'открыл', f: 'открыла', n: 'открыло', pl: 'открыли' },
      fut3: 'откроет', futPl: 'откроют',
      passivPres: 'открывается', passivPart: 'открыта',
    },
  },
  {
    lemma: 'zumachen', sep: 'zu',
    praesens3: 'macht', praesensPl: 'machen',
    praet3: 'machte', praetPl: 'machten',
    partizip2: 'zugemacht', aux: 'haben',
    ru: {
      pres3: 'закрывает', presPl: 'закрывают',
      past: { m: 'закрыл', f: 'закрыла', n: 'закрыло', pl: 'закрыли' },
      fut3: 'закроет', futPl: 'закроют',
      passivPres: 'закрывается', passivPart: 'закрыта',
    },
  },
  {
    lemma: 'öffnen', sep: null,
    praesens3: 'öffnet', praesensPl: 'öffnen',
    praet3: 'öffnete', praetPl: 'öffneten',
    partizip2: 'geöffnet', aux: 'haben',
    ru: {
      pres3: 'открывает', presPl: 'открывают',
      past: { m: 'открыл', f: 'открыла', n: 'открыло', pl: 'открыли' },
      fut3: 'откроет', futPl: 'откроют',
      passivPres: 'открывается', passivPart: 'открыта',
    },
  },
  {
    lemma: 'schließen', sep: null,
    praesens3: 'schließt', praesensPl: 'schließen',
    praet3: 'schloss', praetPl: 'schlossen',
    partizip2: 'geschlossen', aux: 'haben',
    ru: {
      pres3: 'закрывает', presPl: 'закрывают',
      past: { m: 'закрыл', f: 'закрыла', n: 'закрыло', pl: 'закрыли' },
      fut3: 'закроет', futPl: 'закроют',
      passivPres: 'закрывается', passivPart: 'закрыта',
    },
  },
  {
    lemma: 'reparieren', sep: null,
    praesens3: 'repariert', praesensPl: 'reparieren',
    praet3: 'reparierte', praetPl: 'reparierten',
    partizip2: 'repariert', aux: 'haben',
    ru: {
      pres3: 'ремонтирует', presPl: 'ремонтируют',
      past: { m: 'отремонтировал', f: 'отремонтировала', n: 'отремонтировало', pl: 'отремонтировали' },
      fut3: 'отремонтирует', futPl: 'отремонтируют',
      passivPres: 'ремонтируется', passivPart: 'отремонтирована',
    },
  },
]

const TENSES = ['Präsens', 'Präteritum', 'Perfekt', 'Futur I']
const VOICES = ['Aktiv', 'Passiv']

// ---------------------------------------------------------------------------
// Frames: one declarative token pattern per (tense × voice) cell.
// Each entry is a slot name resolved by SLOTS; a slot may emit zero tokens
// (e.g. `prefix` for inseparable verbs).

const FRAMES = {
  'Präsens|Aktiv': ['subjPhrase', 'finPraesens', 'objPhrase', 'prefix'],
  'Präteritum|Aktiv': ['subjPhrase', 'finPraeteritum', 'objPhrase', 'prefix'],
  'Perfekt|Aktiv': ['subjPhrase', 'auxHabenPraesens', 'objPhrase', 'partizip2'],
  'Futur I|Aktiv': ['subjPhrase', 'werdenPraesens', 'objPhrase', 'infinitiv'],
  'Präsens|Passiv': ['objAsSubject', 'wirdSg', 'vonPhrase', 'partizip2'],
  'Präteritum|Passiv': ['objAsSubject', 'wurdeSg', 'vonPhrase', 'partizip2'],
  'Perfekt|Passiv': ['objAsSubject', 'istSg', 'vonPhrase', 'partizip2', 'worden'],
  'Futur I|Passiv': ['objAsSubject', 'wirdSg', 'vonPhrase', 'partizip2', 'werdenInf'],
}

// Slot name → tokens ([text, role][]) for a given (subject, verb).
const SLOTS = {
  subjPhrase: (subject) => nounPhrase(subject.de, 'subj'),
  objPhrase: () => [
    [OBJECT.de[0], 'art'],
    [OBJECT.de[1], 'obj'],
  ],
  // In Passiv "die Tür" becomes the grammatical subject but keeps the `obj`
  // role tag: the subject dial still controls the von-phrase.
  objAsSubject: () => [
    [OBJECT.de[0], 'art'],
    [OBJECT.de[1], 'obj'],
  ],
  vonPhrase: (subject) => nounPhrase(subject.von, 'subj'),
  finPraesens: (subject, verb) => [[subject.plural ? verb.praesensPl : verb.praesens3, 'verb']],
  finPraeteritum: (subject, verb) => [[subject.plural ? verb.praetPl : verb.praet3, 'verb']],
  prefix: (_subject, verb) => (verb.sep ? [[verb.sep, 'prefix']] : []),
  partizip2: (_subject, verb) => [[verb.partizip2, 'verb']],
  infinitiv: (_subject, verb) => [[verb.lemma, 'verb']],
  auxHabenPraesens: (subject) => [[subject.plural ? 'haben' : 'hat', 'aux']],
  werdenPraesens: (subject) => [[subject.plural ? 'werden' : 'wird', 'aux']],
  // Passiv finite verbs agree with "die Tür" (always singular), not the agent.
  wirdSg: () => [['wird', 'aux']],
  wurdeSg: () => [['wurde', 'aux']],
  istSg: () => [['ist', 'aux']],
  worden: () => [['worden', 'aux']],
  werdenInf: () => [['werden', 'aux']],
}

// A multi-word noun phrase: last word is the noun, everything before it
// (articles, fused prepositions) gets the `art` role.
function nounPhrase(phrase, nounRole) {
  const words = phrase.split(' ')
  return words.map((word, i) => [word, i === words.length - 1 ? nounRole : 'art'])
}

// ---------------------------------------------------------------------------
// Russian composition (approximate by design; flagged for later proofreading).

function composeRussian(subject, verb, tense, voice) {
  const { ru } = verb
  if (voice === 'Aktiv') {
    const subj = capitalize(subject.ru)
    switch (tense) {
      case 'Präsens':
        return `${subj} ${subject.plural ? ru.presPl : ru.pres3} ${OBJECT.ru}.`
      case 'Präteritum':
      case 'Perfekt':
        return `${subj} ${ru.past[subject.ruGender]} ${OBJECT.ru}.`
      case 'Futur I':
        return `${subj} ${subject.plural ? ru.futPl : ru.fut3} ${OBJECT.ru}.`
    }
  }
  const obj = capitalize(OBJECT.ru)
  switch (tense) {
    case 'Präsens':
      return `${obj} ${ru.passivPres} ${subject.ruInstr}.`
    case 'Präteritum':
    case 'Perfekt':
      return `${obj} ${OBJECT.ruWas} ${ru.passivPart} ${subject.ruInstr}.`
    case 'Futur I':
      return `${obj} ${OBJECT.ruWillBe} ${ru.passivPart} ${subject.ruInstr}.`
  }
}

// ---------------------------------------------------------------------------
// Assembly

function capitalize(text) {
  // Only the first character; German casing is authored in the tables.
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function composeGerman(subject, verb, tense, voice) {
  const frame = FRAMES[`${tense}|${voice}`]
  const tokens = frame.flatMap((slot) => SLOTS[slot](subject, verb))
  tokens[0] = [capitalize(tokens[0][0]), tokens[0][1]]
  return tokens
}

export function generateTemplate() {
  const variants = {}
  for (const subject of SUBJECTS) {
    for (const verb of VERBS) {
      for (const tense of TENSES) {
        for (const voice of VOICES) {
          const key = [subject.de, verb.lemma, tense, voice].join('|')
          variants[key] = {
            de: composeGerman(subject, verb, tense, voice),
            ru: composeRussian(subject, verb, tense, voice),
          }
        }
      }
    }
  }
  return {
    id: 'tuer',
    label: 'die Tür',
    dimensions: [
      { id: 'subject', label: 'Subjekt', values: SUBJECTS.map((s) => s.de) },
      { id: 'verb', label: 'Verb', values: VERBS.map((v) => v.lemma) },
      { id: 'tense', label: 'Zeitform', values: TENSES },
      { id: 'voice', label: 'Genus Verbi', values: VOICES },
    ],
    variants,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const template = generateTemplate()
  const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'de', 'data', 'tuer.json')
  writeFileSync(outPath, JSON.stringify(template, null, 2) + '\n', 'utf8')
  console.log(`wrote ${Object.keys(template.variants).length} variants to ${outPath}`)
}
