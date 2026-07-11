export type TokenRole = 'subj' | 'verb' | 'prefix' | 'aux' | 'art' | 'adj' | 'obj' | 'other'

export type Token = [text: string, role: TokenRole]

export interface SentenceVariant {
  de: Token[]
  /** End mark for the German sentence ('.' or '?'); ru carries its own. */
  end: string
  ru: string
}

/**
 * Feature switches, all living in the hamburger menu. Everything starts off
 * (except the indefinite article), and hidden dials don't render — learners
 * open things up one by one as they progress.
 */
export interface Toggles {
  /** Off → Präsens only, tense dial hidden. */
  tenses: boolean
  /** Off → Aktiv only, voice dial hidden. */
  voice: boolean
  /** Off → Hauptsatz only, sentence-type dial hidden. */
  satzart: boolean
  /** On → the Person dial (ich/du/er/…) drives the subject; the Subjekt dial hides. */
  person: boolean
  /** On → a modal verb carries the finite slot; the main verb becomes a final infinitive. Restricts tense to Präsens/Präteritum. */
  modal: boolean
  /** Off → no adjective in the object phrase, adjective dial hidden. */
  adjective: boolean
  /** On → indefinite article for the object (ein/eine), mixed adjective declension. */
  indefinite: boolean
  /** On → negated sentence: `nicht` before the verb cluster, or `kein-` when the object is indefinite. */
  negation: boolean
  /** On → the object renders as a pronoun (ihn/sie/es); suppresses the adjective. */
  objectPronoun: boolean
}

export interface Selection {
  /** One value index per dial, in `DIALS` order. */
  indices: number[]
  toggles: Toggles
}
