import { useEffect, useReducer, useState } from 'react'
import { HistoryFeed } from './components/HistoryFeed'
import { Selector } from './components/Selector'
import { Sentence } from './components/Sentence'
import {
  compose,
  DIALS,
  isDialDisabled,
  isToggleLocked,
  isValueAvailable,
  MENU_TOGGLES,
} from './de/grammar'
import { makeInitialState, reduce } from './lib/reducer'
import type { Lang } from './lib/types'

const LANG_KEY = 'satz-satz-lang'

const LANGS: { id: Lang; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
]

function initialLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'ru' || saved === 'en') return saved
  return navigator.language.startsWith('ru') ? 'ru' : 'en'
}

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, makeInitialState)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lang, setLang] = useState<Lang>(initialLang)
  const [langOpen, setLangOpen] = useState(false)

  const chooseLang = (next: Lang) => {
    setLang(next)
    localStorage.setItem(LANG_KEY, next)
    setLangOpen(false)
  }

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
        end={variant.end}
        translation={variant[lang]}
        lang={lang}
      />
      <div className="selectors">
        {DIALS.map((dial, i) =>
          isDialDisabled(i, toggles) ? null : (
            <Selector
              key={dial.id}
              label={dial.label}
              values={dial.values}
              index={state.selection.indices[i]}
              active={state.active === i}
              available={dial.values.map((_, v) => isValueAvailable(i, v, toggles))}
              onSelect={(index) => dispatch({ type: 'select', dial: i, index })}
              onSpin={(direction) => dispatch({ type: 'spin', dial: i, direction })}
              onActivate={() => dispatch({ type: 'activate', dial: i })}
            />
          ),
        )}
      </div>
      <HistoryFeed entries={state.history} lang={lang} />
      {/* All configuration lives here: hidden dials and features are opened
          up one by one, so the first impression stays simple. */}
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
              {MENU_TOGGLES.map(({ key, label }) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={toggles[key]}
                    disabled={isToggleLocked(key, toggles)}
                    onChange={() => dispatch({ type: 'toggle', key })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Translation language, top-right. */}
      <div className="lang">
        <button
          type="button"
          className="settings-button"
          aria-label="Translation language"
          onClick={() => setLangOpen((open) => !open)}
        >
          {lang.toUpperCase()}
        </button>
        {langOpen && (
          <>
            <div className="settings-backdrop" onClick={() => setLangOpen(false)} />
            <div className="settings-menu lang-menu">
              {LANGS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`lang-option${id === lang ? ' lang-current' : ''}`}
                  onClick={() => chooseLang(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
