import type { Lang, Token } from '../lib/types'

interface SentenceProps {
  tokens: Token[]
  changed: boolean[]
  /** Bumps on every variant change; remounts changed tokens to replay the fade. */
  generation: number
  /** End mark: '.' or '?'. */
  end: string
  translation: string
  lang: Lang
}

/**
 * The sentence, rendered token by token. Changed tokens get a background that
 * fades over ~600 ms; the fade is replayed by remounting via a
 * generation-scoped key, so fresh input interrupts it cleanly.
 */
export function Sentence({ tokens, changed, generation, end, translation, lang }: SentenceProps) {
  return (
    <div className="sentence-block">
      <p className="sentence" lang="de">
        {tokens.map(([text, role], i) => (
          <span key={changed[i] ? `g${generation}-${i}` : `t-${i}`}>
            <span className={`token role-${role}${changed[i] ? ' token-changed' : ''}`}>{text}</span>
            {i < tokens.length - 1 ? ' ' : end}
          </span>
        ))}
      </p>
      <p className="translation" lang={lang}>
        {translation}
      </p>
    </div>
  )
}
