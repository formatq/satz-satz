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
import type { Lang, Toggles } from './lib/types'

const LANG_KEY = 'satz-satz-lang'
const THEME_KEY = 'satz-satz-theme'

type Theme = 'dark' | 'light'

const LANGS: { id: Lang; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
]

const UI: Record<Lang, {
  dials: Record<'subject' | 'verb' | 'modal' | 'object' | 'recipient' | 'adjective' | 'tense' | 'voice' | 'satzart', string>
  /** Full hover explanations for the short case labels. */
  dialTitles: { object: string; recipient: string }
  articleTitle: string
  toggles: Record<keyof Toggles, string>
  dimensions: string
  options: string
  appearance: string
  light: string
  dark: string
  aboutButton: string
  aboutKicker: string
  aboutTitle: string
  about: string[]
  history: string
  showAll: (count: number) => string
  less: string
  settingsAria: string
  languageAria: string
  themeAria: string
  closeAria: string
}> = {
  en: {
    dials: { subject: 'Subject', verb: 'Verb', modal: 'Modal verb', object: 'Accusative', recipient: 'Dative', adjective: 'Adjective', tense: 'Tense', voice: 'Voice', satzart: 'Sentence type' },
    dialTitles: { object: 'Accusative object — the direct object (wen? was?)', recipient: 'Dative object — the recipient (wem?)' },
    articleTitle: 'Definite (der) or indefinite (ein) article',
    toggles: { person: 'Subject as pronoun', modal: 'Modal verb', dative: 'Dative object', adjective: 'Adjective', tenses: 'Tense', voice: 'Voice', satzart: 'Sentence type', indefinite: 'Indefinite article', subjectIndefinite: 'Indefinite subject article', recipientIndefinite: 'Indefinite dative article', negation: 'Negation', objectPronoun: 'Accusative as pronoun', dativePronoun: 'Dative as pronoun' },
    dimensions: 'Dimensions', options: 'Options', appearance: 'Appearance', light: 'Light', dark: 'Dark',
    aboutButton: 'About Satz-Satz', aboutKicker: 'About the project', aboutTitle: 'Satz-Satz',
    about: [
      'An interactive trainer for German sentence grammar. Instead of memorising rules first, change one part of a sentence and instantly see what else changes.',
      'The selectors control the subject, verb, object, tense, active and passive voice, and more. Highlighted words show the grammatical effect of every change.',
      'Use the mouse, mouse wheel, or keyboard: ← → changes a dimension, ↑ ↓ changes a value, and 1–9 jumps directly.',
    ],
    history: 'History', showAll: (count) => `show all ${count}`, less: 'show less', settingsAria: 'Settings', languageAria: 'Translation language', themeAria: 'Colour theme', closeAria: 'Close',
  },
  ru: {
    dials: { subject: 'Подлежащее', verb: 'Глагол', modal: 'Модальный глагол', object: 'Аккузатив', recipient: 'Датив', adjective: 'Прилагательное', tense: 'Время', voice: 'Залог', satzart: 'Тип предложения' },
    dialTitles: { object: 'Дополнение в аккузативе — прямое дополнение (wen? was?)', recipient: 'Дополнение в дативе — получатель (wem?)' },
    articleTitle: 'Определённый (der) или неопределённый (ein) артикль',
    toggles: { person: 'Подлежащее — местоимение', modal: 'Модальный глагол', dative: 'Дательное дополнение', adjective: 'Прилагательное', tenses: 'Время', voice: 'Залог', satzart: 'Тип предложения', indefinite: 'Неопределённый артикль', subjectIndefinite: 'Неопределённый артикль подлежащего', recipientIndefinite: 'Неопределённый артикль датива', negation: 'Отрицание', objectPronoun: 'Аккузатив — местоимение', dativePronoun: 'Датив — местоимение' },
    dimensions: 'Параметры', options: 'Опции', appearance: 'Оформление', light: 'Светлая', dark: 'Тёмная',
    aboutButton: 'О Satz-Satz', aboutKicker: 'О проекте', aboutTitle: 'Satz-Satz',
    about: [
      'Интерактивный тренажёр грамматики немецких предложений. Вместо того чтобы сначала запоминать правила, измените одну часть предложения и сразу увидите, что меняется вместе с ней.',
      'Селекторы управляют подлежащим, глаголом, дополнением, временем, активным и пассивным залогом и другими частями. Выделенные слова показывают грамматический результат каждого изменения.',
      'Используйте мышь, колёсико или клавиатуру: ← → меняют параметр, ↑ ↓ — значение, 1–9 сразу выбирают нужный блок.',
    ],
    history: 'История', showAll: (count) => `показать все (${count})`, less: 'свернуть', settingsAria: 'Настройки', languageAria: 'Язык перевода', themeAria: 'Цветовая тема', closeAria: 'Закрыть',
  },
}

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
  const [aboutOpen, setAboutOpen] = useState(false)
  const ui = UI[lang]

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
  // Noun-phrase slots carry a der/ein switch; it hides when the phrase has no
  // article (pronoun subject, pronoun object).
  const articleFor = (key: keyof Toggles, hidden: boolean) =>
    hidden
      ? undefined
      : {
          indefinite: toggles[key],
          onToggle: () => dispatch({ type: 'toggle', key }),
          title: ui.articleTitle,
        }
  interface DialSlot {
    key: string
    number: number
    dial: number
    label: string
    title?: string
    article?: ReturnType<typeof articleFor>
  }
  const dialSlots: DialSlot[] = [
    { key: 'subject', number: 1, dial: toggles.person ? DIAL.person : DIAL.subject, label: ui.dials.subject, article: articleFor('subjectIndefinite', toggles.person) },
    { key: 'verb', number: 2, dial: DIAL.verb, label: ui.dials.verb },
    { key: 'modal', number: 3, dial: DIAL.modal, label: ui.dials.modal },
    { key: 'object', number: 4, dial: toggles.objectPronoun ? DIAL.accPronoun : DIAL.object, label: ui.dials.object, title: ui.dialTitles.object, article: articleFor('indefinite', toggles.objectPronoun) },
    { key: 'recipient', number: 5, dial: toggles.dativePronoun ? DIAL.datPronoun : DIAL.recipient, label: ui.dials.recipient, title: ui.dialTitles.recipient, article: articleFor('recipientIndefinite', toggles.dativePronoun) },
    { key: 'adjective', number: 6, dial: DIAL.adjective, label: ui.dials.adjective },
    { key: 'tense', number: 7, dial: DIAL.tense, label: ui.dials.tense },
    { key: 'voice', number: 8, dial: DIAL.voice, label: ui.dials.voice },
    { key: 'satzart', number: 9, dial: DIAL.satzart, label: ui.dials.satzart },
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
  const dimensionToggles = MENU_TOGGLES.slice(0, 7)
  const optionToggles = MENU_TOGGLES.slice(7)

  const renderToggle = ({ key }: (typeof MENU_TOGGLES)[number]) => (
    <label key={key} className="menu-toggle">
      <span>{ui.toggles[key]}</span>
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
        {dialSlots.map(({ key, number, dial: dialIndex, label, title, article }) => {
          const dial = DIALS[dialIndex]
          return (
            <Selector
              key={key}
              label={label}
              labelTitle={title}
              article={article}
              values={dial.values}
              index={state.selection.indices[dialIndex]}
              active={state.active === dialIndex}
              available={dial.values.map((_, valueIndex) => isValueAvailable(dialIndex, valueIndex, toggles))}
              onSelect={(index) => dispatch({ type: 'select', dial: dialIndex, index })}
              onSpin={(direction) => dispatch({ type: 'spin', dial: dialIndex, direction })}
              onActivate={() => dispatch({ type: 'activate', dial: dialIndex })}
              dialNumber={number}
              showAllLabel={ui.showAll}
              lessLabel={ui.less}
            />
          )
        })}
      </div>
      <HistoryFeed entries={state.history} lang={lang} title={ui.history} />
      {/* All configuration lives here: hidden dials and features are opened
          up one by one, so the first impression stays simple. */}
      <div className="settings">
        <button
          type="button"
          className="settings-button menu-button"
          aria-label={ui.settingsAria}
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
                <div className="menu-group-title">{ui.dimensions}</div>
                {dimensionToggles.map(renderToggle)}
              </div>
              <div className="menu-group">
                <div className="menu-group-title">{ui.options}</div>
                {optionToggles.map(renderToggle)}
              </div>
              <div className="menu-group">
                <div className="menu-group-title">{ui.appearance}</div>
                <div className="theme-choice" role="group" aria-label={ui.themeAria}>
                  <button
                    type="button"
                    className={theme === 'light' ? 'theme-current' : ''}
                    aria-pressed={theme === 'light'}
                    onClick={() => chooseTheme('light')}
                  >
                    {ui.light}
                  </button>
                  <button
                    type="button"
                    className={theme === 'dark' ? 'theme-current' : ''}
                    aria-pressed={theme === 'dark'}
                    onClick={() => chooseTheme('dark')}
                  >
                    {ui.dark}
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="about-button"
                onClick={() => {
                  setMenuOpen(false)
                  setAboutOpen(true)
                }}
              >
                {ui.aboutButton}
              </button>
            </div>
          </>
        )}
      </div>
      {aboutOpen && (
        <div className="about-layer" role="presentation">
          <div className="about-backdrop" onClick={() => setAboutOpen(false)} />
          <section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <button type="button" className="about-close" aria-label={ui.closeAria} onClick={() => setAboutOpen(false)}>×</button>
            <div className="about-kicker">{ui.aboutKicker}</div>
            <h2 id="about-title">{ui.aboutTitle}</h2>
            <p>{ui.about[0]}</p>
            <p>{ui.about[1]}</p>
            <p className="about-note">{ui.about[2]}</p>
          </section>
        </div>
      )}
      {/* Translation language, top-right. */}
      <div className="lang">
        <button
          type="button"
          className="settings-button"
          aria-label={ui.languageAria}
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
