import { useEffect, useReducer } from 'react'
import { Dial } from './components/Dial'
import { HistoryFeed } from './components/HistoryFeed'
import { Sentence } from './components/Sentence'
import { keyFromIndices } from './lib/navigation'
import { makeInitialState, makeReducer } from './lib/reducer'
import { validateTemplate } from './lib/validate'
import type { Template } from './lib/types'
import tuer from './de/data/tuer.json'

// JSON imports widen tuples to string[][]; the dataset invariants are enforced
// by tests and the dev-mode validator below.
const template = tuer as unknown as Template

if (import.meta.env.DEV) {
  for (const violation of validateTemplate(template)) {
    console.error(`dataset invariant violated: ${violation}`)
  }
}

const reduce = makeReducer(template)

export default function App() {
  const [state, dispatch] = useReducer(reduce, template, makeInitialState)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          dispatch({ type: 'move-active', direction: -1 })
          break
        case 'ArrowRight':
          dispatch({ type: 'move-active', direction: 1 })
          break
        case 'ArrowUp':
          dispatch({ type: 'spin', dim: 'active', direction: -1 })
          break
        case 'ArrowDown':
          dispatch({ type: 'spin', dim: 'active', direction: 1 })
          break
        default: {
          const digit = Number(event.key)
          if (digit >= 1 && digit <= template.dimensions.length) {
            dispatch({ type: 'activate', dim: digit - 1 })
          }
          return
        }
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const variant = template.variants[keyFromIndices(template, state.indices)]

  return (
    <main className="app">
      <Sentence
        tokens={variant.de}
        changed={state.changed}
        generation={state.generation}
        ru={variant.ru}
      />
      <div className="dials">
        {template.dimensions.map((dim, i) => (
          <Dial
            key={dim.id}
            label={dim.label}
            values={dim.values}
            index={state.indices[i]}
            active={state.active === i}
            onSpin={(direction) => dispatch({ type: 'spin', dim: i, direction })}
            onActivate={() => dispatch({ type: 'activate', dim: i })}
          />
        ))}
      </div>
      <HistoryFeed entries={state.history} />
    </main>
  )
}
