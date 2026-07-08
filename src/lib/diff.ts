import type { Token } from './types'

/**
 * Marks which tokens of `next` changed relative to `prev`, using a word-level
 * LCS over token texts. Both parts of a separable verb count as one lexeme:
 * if either the verb or its prefix changed, both are marked.
 */
export function diffTokens(prev: Token[] | null, next: Token[]): boolean[] {
  if (prev === null) return next.map(() => false)

  const a = prev.map(([text]) => text)
  const b = next.map(([text]) => text)

  // Standard LCS table over ≤10 tokens; no library needed.
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      table[i][j] =
        a[i - 1] === b[j - 1]
          ? table[i - 1][j - 1] + 1
          : Math.max(table[i - 1][j], table[i][j - 1])
    }
  }

  const changed = next.map(() => true)
  let i = a.length
  let j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      changed[j - 1] = false
      i--
      j--
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  const lexemeChanged = next.some(
    ([, role], k) => changed[k] && (role === 'verb' || role === 'prefix'),
  )
  if (lexemeChanged) {
    next.forEach(([, role], k) => {
      if (role === 'verb' || role === 'prefix') changed[k] = true
    })
  }

  return changed
}
