# [satz-satz](https://github.com/formatq/satz-satz)— German sentence modulator

One German sentence, eight fixed-position selectors: **Subjekt · Person · Verb · Objekt · Adjektiv · Zeitform · Genus Verbi · Satzart**. Pick a value, the sentence recomposes instantly, and the words that changed flash with a fading highlight — watch the article agree (`die Tür / den Schrank`), the adjective ending flip (`der alte / ein alter`), the separable prefix jump to the end (and fuse back in the Nebensatz), the object become the subject in Passiv.

The first impression is deliberately simple — just **Subjekt · Verb · Objekt** and a Präsens sentence. Everything else lives in the **hamburger menu** (top-left) and is opened up one toggle at a time; hidden dimensions don't render at all:

- **Person** — swaps the Subjekt dial for the full conjugation paradigm `ich · du · er · wir · ihr · sie` (`öffne / öffnest / öffnet …`, `von mir / von dir …` in Passiv).
- **Modalverb** — `können / müssen / wollen` take the finite slot and send the main verb to the end as an infinitive (`kann die Tür aufmachen`, Passiv: `muss geöffnet werden`); tense is limited to Präsens/Präteritum to stay out of double-infinitive territory.
- **Adjektiv / Zeitform / Genus Verbi / Satzart** — enable whole dimensions (otherwise pinned to no adjective / Präsens / Aktiv / Hauptsatz).
- **unbestimmter Artikel** (on by default) — `eine Tür / einen Schrank / ein Fenster`; off restores `die / den / das`. Switches the adjective between mixed and weak declension (`ein alter ↔ der alte`).
- **Negation** — `nicht` before the verb cluster (`öffnet die Tür nicht`), switching to `kein-` when the object is indefinite (`öffnet keine Tür`).
- **Pronomen (Objekt)** — replaces the object with the matching pronoun to study declension: `der Schrank → ihn → er`.

The translation line is available in **Russian and English** (picker in the top-right, defaults to the browser language). English keeps Präteritum/Perfekt distinct (`opened / has opened`) and gives questions their do-support (`Does the man open …?`).


![img.png](img.png)


Sibling of [words-words](https://github.com/formatq/words-words) (English phrasal verbs). 

## Controls

- Click any value to select it; mouse wheel over a selector steps through it (clamped, no wrap)
- `←` / `→` — move between selectors (skips disabled ones), `↑` / `↓` — step the active one
- `1`–`9` — jump straight to a selector

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
