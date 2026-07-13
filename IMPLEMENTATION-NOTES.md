# Implementation notes for satz-satz

Working notes for maintainers of the 1.3.0 app. Read `SPEC-DE.md` for product behaviour; this document explains how that behaviour is implemented.

## Ground rules

- **Stack:** Vite, React 18, TypeScript, Vitest, and plain CSS. No UI library or state manager.
- **Runtime composition:** grammar data is bundled and sentences are composed synchronously. The app makes no network requests after initial load.
- **UI language:** German is the learning material. All surrounding interface copy is English or Russian and is selected with the translation picker.
- **Pure state:** the reducer has no effects. Animations only decorate synchronous state updates.
- **Keep the scope small:** morphology, state, and UI have deliberately separate modules.

## Code map

- `src/de/grammar.ts` — morphology tables, declarative word-order frames, `compose(selection)`, `DIALS`, initial state, and availability predicates.
- `src/lib/types.ts` — grammar and UI state types.
- `src/lib/reducer.ts` — pure `spin`, `select`, `activate`, `move-active`, and `toggle` actions; history dedupe and cap.
- `src/lib/diff.ts` — token-level LCS diff.
- `src/lib/navigation.ts` — clamped stepping.
- `src/components/Sentence.tsx` — sentence tokens, diff animation, translation.
- `src/components/Selector.tsx` — a fixed-width selector, wheel accumulator, three-row viewport, and expand button.
- `src/components/HistoryFeed.tsx` — typed newest history entry.
- `src/App.tsx` — UI slot mapping, keyboard handling, EN/RU interface copy, menu, language/theme persistence, and About dialog.
- `src/index.css` — responsive layout and the dark/light CSS-variable themes.

## Grammar and UI slots

`DIALS` has twelve internal data sources: Subject, Person, Verb, Modal, Object, Adjective, Tense, Voice, Sentence type, Recipient, Accusative pronoun, and Dative pronoun (later additions are appended so earlier indices stay stable). Noun and pronoun sources must remain separate internally because their morphology differs.

`App.tsx` maps them to nine stable UI positions. Three positions are noun/pronoun pairs driven by a toggle: position 1 (Subject/Person via `person`), position 4 (Object/Accusative pronoun via `objectPronoun`), and position 5 (Recipient/Dative pronoun via `dativePronoun`). Positions 2–3 and 6–9 are Verb, Modal verb, Adjective, Tense, Voice, and Sentence type. Keep this mapping and the `1`–`9` keyboard shortcuts aligned whenever a dimension changes.

`isDialDisabled` hides feature-gated sources and ensures Subject and Person are mutually exclusive. `isValueAvailable` currently only restricts Tense while a modal is enabled. The reducer resets a turned-off dimension to index zero, snaps unavailable values to the first valid value, and moves the active selector when it disappears.

Article choice is not a dial: three `Toggles` booleans (`subjectIndefinite`, `indefinite`, `recipientIndefinite`) feed the der/ein switches that `App.tsx` places in the selector headers via the Selector `article` prop. A switch is omitted when the phrase has no article (pronoun subject or pronoun object), and `recipientIndefinite` resets together with the dative dimension. The selector value lists keep the definite citation forms regardless of the switch — the sentence is where the article change shows.

## Sentence composition

`compose(selection)` returns `{ de, end, ru, en }`. German output is a role-tagged token array; the roles support precise visual diffs.

Word order is data in `FRAMES` and `MODAL_FRAMES`, not a branch per sentence. The tables cover statement, question, and subordinate-clause word order across tense and voice. Keep special behaviour close to the phrase that owns it:

- `nicht` follows the object or `von` phrase.
- An indefinite negated object uses `kein-` and suppresses `nicht`.
- The dative recipient lives inside `objPhrase`/`vonPhrase`, not in the frames: it precedes an accusative noun, follows an accusative pronoun, and precedes the `von` agent in Passiv. The same branch yields correct pronoun order in all four noun/pronoun combinations (`mir die Tür`, `sie der Frau`, `sie mir`).
- Dative pronouns reuse the Recipient shape (`ein` repeats the base form since a pronoun has no article), so translations and Passiv need no special cases. Accusative pronouns are their own table with nominative forms and Russian gender for Passiv agreement.
- Indefinite subject and recipient forms are data (`ein`, `vonEin` on Subject; `ein` on Recipient); the plural is the bare noun. Pronoun subjects omit the fields and fall back to the definite form.
- A separable prefix is split in main-clause Präsens/Präteritum and fused in a Nebensatz.
- Passiv Perfekt uses `worden`, never `geworden`.

Russian and English are composed from fields in the same morphology tables. They are pedagogical anchors, so prioritise agreement and clear tense distinctions over idiomatic paraphrase.

## Interaction details

- Selector wheel events use a native non-passive listener and a ref-based ~40 px accumulator. Do not step once per `wheel` event.
- Value navigation is clamped, never cyclic. Only active-selector navigation wraps and skips hidden dimensions.
- The normal selector viewport is exactly three values; its start offset follows the selected index. The **show all** button is local component state.
- Sentence animation is replayed by changing token keys with the reducer generation counter. Do not delay state while an animation runs.
- Mouse clicks clear the browser focus ring; `:focus-visible` restores a deliberate focus indicator for keyboard Tab navigation.
- History stores both translations, so changing language redraws all entries without recomposition.

## Language, theme, and About state

`App.tsx` owns the non-grammar UI state:

- `satz-satz-lang` stores `en` or `ru`; the browser locale supplies the initial default.
- `satz-satz-theme` stores `dark` or `light`; otherwise `prefers-color-scheme` supplies the default.
- The `UI` dictionary contains every surrounding English/Russian string, including About, selector expansion labels, and accessibility labels. Add new user-facing chrome to both locales.

The language picker changes translations and UI copy. The theme effect writes `data-theme` on the root element; all visual colours should use the CSS variables in `index.css` so both themes remain coherent.

## Responsive layout

Selector blocks are always 148 px wide. The grid has at most eight columns on wide desktop, four at `max-width: 1370px`, three at `max-width: 700px`, and two at `max-width: 500px`.

At 700 px and below the body scrolls, the sentence is sticky, and its top padding reserves room for the fixed hamburger and language controls. Do not reduce that padding without checking a long sentence at a narrow viewport.

## Tests and verification

There are 98 unit tests: 70 grammar, 19 reducer, 5 diff, and 4 navigation. Run:

```sh
npm test
npm run build
```

For visual verification, test a wide desktop viewport, a 700 px three-column viewport, and a 393 px two-column viewport. Check both languages and themes, the About dialog, feature toggles, keyboard navigation, unavailable tense values with a modal, and a long sentence under the fixed mobile controls.

## Deployment

`.github/workflows/deploy.yml` deploys pushes to `main` to GitHub Pages. It builds with `--base=/satz-satz/`; local Vite development remains rooted at `/`.
