# [satz-satz](https://github.com/formatq/satz-satz)— German sentence modulator

One German sentence, eight fixed-position selectors: **Subjekt · Person · Verb · Objekt · Adjektiv · Zeitform · Genus Verbi · Satzart**. Pick a value, the sentence recomposes instantly, and the words that changed flash with a fading highlight — watch the article agree (`die Tür / den Schrank`), the adjective ending flip (`der alte / ein alter`), the separable prefix jump to the end (and fuse back in the Nebensatz), the object become the subject in Passiv.

Features are **toggleable**, so a learner can start with plain Präsens Aktiv and switch things on one at a time:

- **Zeitform / Genus Verbi / Adjektiv / Satzart** — checkboxes enable or disable the whole dimension (disabled dials pin to Präsens / Aktiv / no adjective / Hauptsatz).
- **Person** — swaps the Subjekt dial for the full conjugation paradigm `ich · du · er · wir · ihr · sie` (`öffne / öffnest / öffnet …`, `von mir / von dir …` in Passiv).
- **trennbar** — adds separable verbs (`aufmachen`, `zumachen`) to the verb list.
- **Pronomen** (on Subjekt and Objekt) — replaces the noun with the matching pronoun to study declension: `er → von ihm`, `der Schrank → ihn → er`.
- **unbestimmt** — indefinite article for the object, switching the adjective to mixed declension (`der alte → ein alter`).


![img.png](img.png)


Sibling of [words-words](https://github.com/formatq/words-words) (English phrasal verbs). 

## Controls

- Click any value to select it; mouse wheel over a selector steps through it (clamped, no wrap)
- `←` / `→` — move between selectors (skips disabled ones), `↑` / `↓` — step the active one
- `1`–`8` — jump straight to a selector

The sentence and selectors stay pinned; the history feed fills the rest of the screen and scrolls on its own.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # grammar golden files, reducer, navigation, diff tests
npm run build      # production build
```

Sentences are composed at runtime by `src/de/grammar.ts` from small hand-encoded morphology tables and one declarative word-order frame per (tense × voice) cell — the v1 pregenerated-JSON approach stopped scaling once object, adjective and pronoun modes multiplied the variant space into the thousands. Still zero network requests after page load. Golden-file tests pin down the pedagogically tricky forms (Passiv Perfekt `… ist … aufgemacht worden`, weak adjective declension, pronoun case ripples).

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup: **Settings → Pages → Source: GitHub Actions** (the first run fails at `configure-pages` until this is set — re-run it after).
