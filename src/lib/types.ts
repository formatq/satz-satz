export type TokenRole = 'subj' | 'verb' | 'prefix' | 'aux' | 'art' | 'adj' | 'obj' | 'other'

export type Token = [text: string, role: TokenRole]

/** Translation language for the line under the sentence and the history feed. */
export type Lang = 'ru' | 'en'

export interface SentenceVariant {
  de: Token[]
  /** End mark for the German sentence ('.' or '?'); translations carry their own. */
  end: string
  ru: string
  en: string
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
  /** On → personal pronouns (ich/du/er/…) fill the same Subjekt UI slot. */
  person: boolean
  /** On → a modal verb carries the finite slot; the main verb becomes a final infinitive. Restricts tense to Präsens/Präteritum. */
  modal: boolean
  /** Off → no adjective in the object phrase, adjective dial hidden. */
  adjective: boolean
  /** On → indefinite article for the object (ein/eine), mixed adjective declension. */
  indefinite: boolean
  /** On → indefinite article for the subject (ein Mann); bare plural (Kinder). Ignored for pronoun subjects. */
  subjectIndefinite: boolean
  /** On → indefinite article for the dative recipient (einer Frau); bare plural (Kindern). */
  recipientIndefinite: boolean
  /** On → negated sentence: `nicht` before the verb cluster, or `kein-` when the object is indefinite. */
  negation: boolean
  /** On → personal pronouns (ihn/sie/es) fill the Accusative UI slot; suppresses adjective and article. */
  objectPronoun: boolean
  /** On → personal pronouns (mir/dir/…) fill the Dative UI slot. Only meaningful while dative is on. */
  dativePronoun: boolean
  /** On → a dative recipient joins the sentence (öffnet der Frau die Tür), recipient dial shown. */
  dative: boolean
}

export interface Selection {
  /** One value index per dial, in `DIALS` order. */
  indices: number[]
  toggles: Toggles
}
