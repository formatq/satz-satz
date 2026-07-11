export type TokenRole = 'subj' | 'verb' | 'prefix' | 'aux' | 'art' | 'adj' | 'obj' | 'other'

export type Token = [text: string, role: TokenRole]

export interface SentenceVariant {
  de: Token[]
  ru: string
}

/** Feature switches. Learners enable dimensions one by one as they progress. */
export interface Toggles {
  /** Off → Präsens only, tense dial disabled. */
  tenses: boolean
  /** Off → Aktiv only, voice dial disabled. */
  voice: boolean
  /** Off → no adjective in the object phrase, adjective dial disabled. */
  adjective: boolean
  /** Off → separable verbs unavailable in the verb dial. */
  separable: boolean
  /** On → indefinite article for the object (ein/eine), mixed adjective declension. */
  indefinite: boolean
  /** On → the subject renders as a pronoun (er/sie/es/sie, von ihm/ihr/ihnen). */
  subjectPronoun: boolean
  /** On → the object renders as a pronoun (ihn/sie/es); suppresses the adjective. */
  objectPronoun: boolean
}

export interface Selection {
  /** One value index per dial, in `DIALS` order. */
  indices: number[]
  toggles: Toggles
}
