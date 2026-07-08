import { useEffect, useState } from 'react'
import type { HistoryEntry } from '../lib/reducer'

const TYPE_INTERVAL_MS = 18

/** Newest entry types itself out; older entries render as plain text. */
export function HistoryFeed({ entries }: { entries: HistoryEntry[] }) {
  const newest = entries[0]
  const fullText = newest ? `${newest.de} — ${newest.ru}` : ''
  const [typed, setTyped] = useState(fullText.length)

  useEffect(() => {
    setTyped(0)
    const interval = setInterval(() => {
      setTyped((count) => {
        if (count >= fullText.length) {
          clearInterval(interval)
          return count
        }
        return count + 1
      })
    }, TYPE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fullText])

  return (
    <div className="history">
      <div className="history-rule">history</div>
      <ul>
        {entries.map((entry, i) => (
          <li key={`${entries.length - i}`} className={i === 0 ? 'history-newest' : ''}>
            {i === 0 ? fullText.slice(0, typed) : `${entry.de} — ${entry.ru}`}
          </li>
        ))}
      </ul>
    </div>
  )
}
