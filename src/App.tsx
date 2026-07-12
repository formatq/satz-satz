import { useEffect, useReducer, useState, type CSSProperties } from 'react'
import { HistoryFeed } from './components/HistoryFeed'
import { Selector } from './components/Selector'
import { Sentence } from './components/Sentence'
import {
  compose,
  DIAL,
  DIALS,
  isDialDisabled,
  isToggleLocked,
  isValueAvailable,
  MENU_TOGGLES,
} from './de/grammar'
import { makeInitialState, reduce } from './lib/reducer'
import type { Lang } from './lib/types'

const LANG_KEY = 'satz-satz-lang'
const THEME_KEY = 'satz-satz-theme'

type Theme = 'dark' | 'light'

const LANGS: { id: Lang; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
]

function initialLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'ru' || saved === 'en') return saved
  return navigator.language.startsWith('ru') ? 'ru' : 'en'
}

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, makeInitialState)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lang, setLang] = useState<Lang>(initialLang)
  const [langOpen, setLangOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(initialTheme)

  const chooseLang = (next: Lang) => {
    setLang(next)
    localStorage.setItem(LANG_KEY, next)
    setLangOpen(false)
  }

  const chooseTheme = (next: Theme) => {
    setTheme(next)
    localStorage.setItem(THEME_KEY, next)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const { toggles } = state.selection
  // Person and Subjekt are two ways to fill the same grammatical slot. The
  // UI deliberately gives that slot one permanent home and one shortcut.
  const dialSlots = [
    { key: 'subject', number: 1, dial: toggles.person ? DIAL.person : DIAL.subject, label: 'Subjekt' },
    { key: 'verb', number: 2, dial: DIAL.verb, label: DIALS[DIAL.verb].label },
    { key: 'modal', number: 3, dial: DIAL.modal, label: DIALS[DIAL.modal].label },
    { key: 'object', number: 4, dial: DIAL.object, label: DIALS[DIAL.object].label },
    { key: 'adjective', number: 5, dial: DIAL.adjective, label: DIALS[DIAL.adjective].label },
    { key: 'tense', number: 6, dial: DIAL.tense, label: DIALS[DIAL.tense].label },
    { key: 'voice', number: 7, dial: DIAL.voice, label: DIALS[DIAL.voice].label },
    { key: 'satzart', number: 8, dial: DIAL.satzart, label: DIALS[DIAL.satzart].label },
  ].filter(({ dial }) => !isDialDisabled(dial, toggles))
  const dialSlotsSignature = dialSlots.map(({ number, dial }) => `${number}:${dial}`).join(',')

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
          const slot = dialSlots.find(({ number }) => number === digit)
          if (slot) {
            dispatch({ type: 'activate', dial: slot.dial })
          }
          return
        }
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialSlotsSignature])

  const variant = compose(state.selection)
  const visibleDialCount = dialSlots.length
  const dialGridStyle = {
    '--dial-columns': String(Math.min(visibleDialCount, 8)),
    '--dial-columns-mid': String(Math.min(visibleDialCount, 4)),
    '--dial-columns-mobile-wide': String(Math.min(visibleDialCount, 3)),
    '--dial-columns-small': String(Math.min(visibleDialCount, 2)),
  } as CSSProperties
  const dimensionToggles = MENU_TOGGLES.slice(0, 6)
  const optionToggles = MENU_TOGGLES.slice(6)

  const renderToggle = ({ key, label }: (typeof MENU_TOGGLES)[number]) => (
    <label key={key} className="menu-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={toggles[key]}
        disabled={isToggleLocked(key, toggles)}
        onChange={() => dispatch({ type: 'toggle', key })}
      />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  )

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
      <div className="selectors" style={dialGridStyle}>
        {dialSlots.map(({ key, number, dial: dialIndex, label }) => {
          const dial = DIALS[dialIndex]
          return (
            <Selector
              key={key}
              label={label}
              values={dial.values}
              index={state.selection.indices[dialIndex]}
              active={state.active === dialIndex}
              available={dial.values.map((_, valueIndex) => isValueAvailable(dialIndex, valueIndex, toggles))}
              onSelect={(index) => dispatch({ type: 'select', dial: dialIndex, index })}
              onSpin={(direction) => dispatch({ type: 'spin', dial: dialIndex, direction })}
              onActivate={() => dispatch({ type: 'activate', dial: dialIndex })}
              dialNumber={number}
            />
          )
        })}
      </div>
      <HistoryFeed entries={state.history} lang={lang} />
      {/* All configuration lives here: hidden dials and features are opened
          up one by one, so the first impression stays simple. */}
      <div className="settings">
        <button
          type="button"
          className="settings-button menu-button"
          aria-label="Features"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        {menuOpen && (
          <>
            <div className="settings-backdrop" onClick={() => setMenuOpen(false)} />
            <div className="settings-menu feature-menu">
              <div className="menu-group">
                <div className="menu-group-title">Dimensionen</div>
                {dimensionToggles.map(renderToggle)}
              </div>
              <div className="menu-group">
                <div className="menu-group-title">Optionen</div>
                {optionToggles.map(renderToggle)}
              </div>
              <div className="menu-group">
                <div className="menu-group-title">Darstellung</div>
                <div className="theme-choice" role="group" aria-label="Farbschema">
                  <button
                    type="button"
                    className={theme === 'light' ? 'theme-current' : ''}
                    aria-pressed={theme === 'light'}
                    onClick={() => chooseTheme('light')}
                  >
                    Hell
                  </button>
                  <button
                    type="button"
                    className={theme === 'dark' ? 'theme-current' : ''}
                    aria-pressed={theme === 'dark'}
                    onClick={() => chooseTheme('dark')}
                  >
                    Dunkel
                  </button>
                </div>
              </div>
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
          DE → {lang.toUpperCase()}
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
