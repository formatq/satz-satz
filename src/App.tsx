import { useEffect, useReducer, useState } from 'react'
import { HistoryFeed } from './components/HistoryFeed'
import { Selector } from './components/Selector'
import { Sentence } from './components/Sentence'
import { compose, DIALS, isDialDisabled, isValueAvailable } from './de/grammar'
import { makeInitialState, reduce } from './lib/reducer'

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, makeInitialState)
  const [menuOpen, setMenuOpen] = useState(false)

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
          dispatch({ type: 'spin', dial: 'active', direction: -1 })
          break
        case 'ArrowDown':
          dispatch({ type: 'spin', dial: 'active', direction: 1 })
          break
        default: {
          const digit = Number(event.key)
          if (digit >= 1 && digit <= DIALS.length) {
            dispatch({ type: 'activate', dial: digit - 1 })
          }
          return
        }
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const { toggles } = state.selection
  const variant = compose(state.selection)

  return (
    <main className="app">
      <Sentence
        tokens={variant.de}
        changed={state.changed}
        generation={state.generation}
        ru={variant.ru}
      />
      <div className="selectors">
        {DIALS.map((dial, i) => (
          <Selector
            key={dial.id}
            label={dial.label}
            values={dial.values}
            index={state.selection.indices[i]}
            active={state.active === i}
            disabled={isDialDisabled(i, toggles)}
            available={dial.values.map((_, v) => isValueAvailable(i, v, toggles))}
            enableToggle={
              dial.enable
                ? {
                    checked: toggles[dial.enable],
                    // The adjective checkbox locks while the object is a pronoun:
                    // a pronoun object cannot carry an adjective.
                    disabled: dial.id === 'adjective' && toggles.objectPronoun,
                    onChange: () => dispatch({ type: 'toggle', key: dial.enable! }),
                  }
                : undefined
            }
            featureToggle={
              dial.feature
                ? {
                    label: dial.feature.label,
                    checked: toggles[dial.feature.key],
                    onChange: () => dispatch({ type: 'toggle', key: dial.feature!.key }),
                  }
                : undefined
            }
            onSelect={(index) => dispatch({ type: 'select', dial: i, index })}
            onSpin={(direction) => dispatch({ type: 'spin', dial: i, direction })}
            onActivate={() => dispatch({ type: 'activate', dial: i })}
          />
        ))}
      </div>
      <HistoryFeed entries={state.history} />
      {/* Mobile-only hamburger: disabled dials are hidden there instead of
          greyed, so their enable-toggles live in this menu. */}
      <div className="settings">
        <button
          type="button"
          className="settings-button"
          aria-label="Features"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
        {menuOpen && (
          <>
            <div className="settings-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="settings-menu">
              {DIALS.filter((dial) => dial.enable).map((dial) => (
                <label key={dial.id}>
                  <input
                    type="checkbox"
                    checked={toggles[dial.enable!]}
                    disabled={dial.id === 'adjective' && toggles.objectPronoun}
                    onChange={() => dispatch({ type: 'toggle', key: dial.enable! })}
                  />
                  <span>{dial.label}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
