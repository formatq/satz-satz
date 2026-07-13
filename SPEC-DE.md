# satz-satz — German sentence modulator

> Release specification for 1.2.0. `IMPLEMENTATION-NOTES.md` describes the code-level decisions.

## Purpose

satz-satz is a grammar trainer for English- and Russian-speaking beginners of German. It makes grammatical dependency visible: selecting a different value recomposes one complete German sentence and briefly highlights the words that changed.

The app favours experimentation over rule memorisation. A learner can see articles agree with nouns, separable prefixes split and rejoin, the passive object become the subject, and verb position change in a `weil` clause.

The first screen deliberately contains only Subject, Verb, and Object. The rest of the grammar is disclosed one concept at a time through the hamburger menu.

## Grammar model

The UI has nine stable numbered positions. A hidden optional position retains its number; there is never a separate Person column.

1. **Subject** — `der Mann`, `die Frau`, `das Kind`, `die Kinder`; with **Subject as pronoun**, the same slot instead contains `ich`, `du`, `er`, `wir`, `ihr`, `sie`.
2. **Verb** — `öffnen`, `reparieren`, `aufmachen`, `zumachen`.
3. **Modal verb** — `können`, `müssen`, `wollen`.
4. **Accusative** (the direct object) — `die Tür`, `der Schrank`, `das Fenster`. The short case label carries a full hover explanation.
5. **Dative** — `der Frau`, `dem Kind`, `dem Mann`, `den Kindern`. A benefactive dative recipient; the nouns repeat the Subject dial so the learner sees the same words change case.
6. **Adjective** — `alt`, `neu`, `kaputt`.
7. **Tense** — Präsens, Präteritum, Perfekt, Futur I.
8. **Voice** — Aktiv and Vorgangspassiv.
9. **Sentence type** — Hauptsatz, Frage, Nebensatz.

All enabled combinations compose to a valid sentence. Modal verbs restrict tense to Präsens and Präteritum, intentionally avoiding double infinitives such as `hat aufmachen können`.

Each of the three noun phrases — Subject, Accusative, Dative — has a **der/ein switch** to the right of its selector label, choosing the definite or indefinite article independently per phrase. The plural takes the bare noun (`Kinder öffnen …`, `von Kindern`, `Kindern`). The switch hides when the phrase carries no article (pronoun subject, pronoun object). The accusative object defaults to the indefinite article; the other two default to definite.

### Example ripples

| Change | Sentence |
|---|---|
| baseline | Der Mann **öffnet** eine Tür. |
| Verb → aufmachen | Der Mann **macht** eine Tür **auf**. |
| Tense → Perfekt | Der Mann **hat** eine Tür **aufgemacht**. |
| Voice → Passiv | **Eine Tür wird vom Mann aufgemacht.** |
| Subject → die Kinder in Passiv | Eine Tür wird **von den Kindern** aufgemacht. |
| Tense → Perfekt in Passiv | Eine Tür **ist** von den Kindern aufgemacht **worden**. |
| Sentence type → Nebensatz | …, weil die Kinder eine Tür **aufmachen**. |
| Negation with an indefinite object | Der Mann öffnet **keine** Tür. |
| Modal verb → müssen | Der Mann **muss** eine Tür **öffnen**. |
| Dative object → dem Kind | Der Mann öffnet **dem Kind** eine Tür. |
| Object pronoun with a dative object | Der Mann öffnet **sie dem Kind**. |
| Subject article → ein | **Ein** Mann öffnet eine Tür. |
| Plural subject with ein | **Kinder** öffnen eine Tür. |

## Menu features

All configuration is in the top-left hamburger menu.

- **Subject as pronoun**, Modal verb, Dative object, Adjective, Tense, Voice, and Sentence type reveal their corresponding selector.
- **Dative object** adds a recipient in the Mittelfeld: before an accusative noun, after an accusative pronoun, and before the `von` agent in Passiv. Translations render it as a Russian dative (active) or «для …» (passive) and as an English for-phrase.
- Articles are not in the menu: each noun phrase has its own der/ein switch in the selector header. The accusative switch drives adjective endings (weak after der-words, mixed after ein-words) and negation (`kein-` for an indefinite object, `nicht` otherwise).
- **Negation** uses `nicht` after the object or agent phrase, but uses `kein-` for an indefinite object.
- **Object pronoun** changes `der Schrank → ihn` in active voice and `→ er` in passive voice. It locks Adjective and hides the accusative article switch.
- **Appearance** switches between light and dark themes.
- **About** explains the trainer in the selected interface language.

Turning a dimension off resets its value to the default. Values made unavailable by another choice snap to the first allowed value.

## Interaction and layout

- Click a value to choose it. Wheel movement over a selector is accumulated in ~40 px steps.
- `←` / `→` move the active visible selector cyclically; `↑` / `↓` step values without wrapping; `1`–`9` select the associated logical UI position when it is visible.
- Every selector is 148 px wide. It displays a three-row sliding window by default; **show all** expands the complete list.
- The sentence has a fading, token-level diff highlight. The newest history entry types at 18 ms per character; consecutive duplicates are dropped and history is capped at 50.
- On desktop, sentence, selectors, and fixed corner controls remain in place while the history scrolls internally.
- At viewport widths of 1370 px, 700 px, and 500 px, the selector grid uses at most four, three, and two columns respectively. At 700 px and below, the page scrolls and the sentence becomes sticky below the fixed controls.

## Languages, themes, and About

The top-right picker selects English or Russian. It controls the translation line, history translations, interface labels, menu copy, selector expansion labels, and About content. The choice persists as `satz-satz-lang`; Russian is the default only for Russian browser locales, otherwise English is used.

Both translations are composed from the same morphology tables as the German sentence. They are intended as meaning anchors, not as exhaustive grammar instruction.

The menu theme choice persists as `satz-satz-theme`. Before a choice is saved, the app uses the operating system colour preference.

## Engine

There is no pregenerated variant data. `src/de/grammar.ts` composes sentences from small morphology tables and declarative word-order frames. It returns role-tagged German tokens plus Russian and English translations. `useReducer` manages value indices, feature toggles, active selector, diff generation, and history.

The internal grammar model retains separate Subject and Person data sources, but `App.tsx` presents them as the one Subject UI slot. This preserves complete conjugation data without creating a confusing ninth UI dimension.

## Acceptance criteria

- A fresh load shows a grammatical Präsens sentence with an indefinite object article and only Subject, Verb, and Accusative selectors.
- All German grammar combinations produced by enabled controls are valid; Passiv Perfekt uses `worden`, and adjective/article/pronoun agreement is correct.
- Changing a value highlights the changed German tokens without blocking further input.
- Language and theme selections persist across reloads; English and Russian localise the surrounding interface and About content.
- Keyboard, click, and wheel controls work with the stable 1–9 UI positions.
- The responsive selector grid and sticky sentence do not let corner controls cover sentence text.
- The app makes no network requests after it loads, builds successfully, and has 92 passing unit tests.

## Future ideas

- Audio via Web Speech API.
- Quiz mode and spaced repetition.
- Persistent role colouring.
- URL state for sharing a selection.
- PWA support.
- More sentence templates and vocabulary.
