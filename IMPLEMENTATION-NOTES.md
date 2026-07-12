# Implementation notes for satz-satz

Working notes for whoever touches this code next (human or agent). Originally hand-off notes for building v1 from the words-words patterns; now updated to describe the app as built, plus everything learned the hard way in both projects. Read `SPEC-DE.md` first; this file is the "how", not the "what".

## Ground rules

- **Stack**: Vite + React + TypeScript, vitest, no UI libraries, no state managers, plain CSS. `useReducer` for app state. The app is tiny; keep it that way.
- **Language**: all code, comments, test names, error messages, and UI copy in English. Russian appears ONLY inside translation data (`ru` fields) and the language-picker label.
- **Everything composes at runtime from tables in the bundle.** Zero network requests after page load — this is what makes dial-spinning feel instant.
- **Logic never waits for animation.** Animations are ~120–600 ms; the user can spin faster than that. State updates are synchronous; CSS animations decorate whatever the current state is.
- `.gitignore` from day one: `node_modules/`, `dist/`, `.idea/`, `*.iml`, `.claude/settings.local.json` (the last one WILL get committed by accident otherwise — it happened in words-words).

## Layout of the code

- `src/de/grammar.ts` — the single source of grammatical truth (~700 lines): morphology tables (SUBJECTS, PERSONS, VERBS, MODALS, OBJECTS, ADJECTIVES, HABEN/WERDEN paradigms), the declarative frames, and `compose(selection) → { de, end, ru, en }`. Also all the UI-facing predicates: `DIALS`, `MENU_TOGGLES`, `isDialDisabled`, `isValueAvailable`, `isToggleLocked`, `initialSelection`.
- `src/lib/types.ts` — `Token`/`TokenRole`, `Lang`, `SentenceVariant`, `Toggles`, `Selection`.
- `src/lib/reducer.ts` — pure reducer (`spin / select / activate / move-active / toggle`), history (dedupe, cap 50), diff invocation.
- `src/lib/navigation.ts` — `stepClamped` only.
- `src/lib/diff.ts` — token-level LCS.
- `src/components/` — `Sentence` (tokens + translation), `Selector` (one fixed-position dial), `HistoryFeed` (typewriter).
- `src/App.tsx` — wiring: keyboard, hamburger menu (top-left), language picker (top-right, `localStorage` key `satz-satz-lang`).

## v1 → v2: why the generator died

v1 pregenerated all variants (`scripts/generate-de.mjs` → committed JSON → runtime key lookup) and needed a BFS connectivity validator so skip-invalid navigation couldn't strand the user on an island. Once object, adjective, pronoun, person and modal dimensions arrived, the cross product went from 160 into the thousands and the approach collapsed. v2 composes at runtime from the same kind of tables the generator used; the generator, the JSON, and the connectivity validator are deleted.

The important consequence: **validity is structural now.** Every combination of enabled values composes into a grammatical sentence, so there is no "invalid variant" concept and no island risk. The only value-level restriction is in `isValueAvailable`: with a modal verb, tense is limited to Präsens/Präteritum (avoids C1 double infinitives like `hat aufmachen können`). Whole dials are hidden by `isDialDisabled` (driven by toggles, plus the Subjekt↔Person mutual exclusion).

## Navigation: clamped, not cyclic

words-words' `findNextValid` was cyclic (wrap around the wheel). satz-satz selectors show **all values at fixed positions**, so wrapping reads as a glitch — `stepClamped` in `navigation.ts` stops at the edges and skips unavailable values on the way. Only `move-active` (←/→ between dials) still wraps cyclically, skipping hidden dials. Test the edges: no wrap in either direction, skipping dimmed values, "nothing further available" returns current.

## Frames are data, not code

Word order lives in two lookup tables in `grammar.ts`: `FRAMES` (24 = Hauptsatz/Frage/Nebensatz × 4 tenses × Aktiv/Passiv) and `MODAL_FRAMES` (12 = 3 × Präsens/Präteritum × 2). Each frame is an array of slot functions `(ctx) → Token[]`. Adding a sentence type or tense means adding frames, not branching code. Things that deliberately do NOT live in frames:

- `nicht` placement — it always follows the object/agent phrase, so it's attached inside `objPhrase`/`vonPhrase` slot helpers rather than multiplying every frame by ±negation.
- `kein-` — negation of an indefinite object happens in the article: literally `` `k${einForm}` `` inside the object-phrase builder, and `nicht` is suppressed (`usesKein`).
- Nebensatz separable fusion — the verb-final slot joins prefix + finite form itself.

Conjugation is uniform: every paradigm is a 6-form array (ich·du·er·wir·ihr·sie); noun subjects carry a `person` index (2 for singular, 5 for plural) into the same arrays — no 3sg/plural special-casing anywhere.

## Translation composition

Both translations are per-word fields on the same table rows, composed by `composeRussian`/`composeEnglish`:

- **English**: `enSimple` implements do-support once (questions and negation); Präteritum→`past`, Perfekt→`has/have + part`. `können` is a real modal (`can/cannot/could`); `müssen`/`wollen` are periphrastic composite verbs (`have to / want to`) that reuse do-support — which makes `muss nicht` correctly `does not have to` (not "must not"). `a/an` by vowel heuristic on the next word (adjective if present).
- **Russian**: past tense agrees in gender/number (`past: {m, f, n, pl}` per verb), modal «должен» declines by gender, Nebensatz is «…, потому что …».

Translations are approximate by design; don't chase idiomatic perfection, chase "anchors the meaning".

## Toggle mechanics (reducer)

When a toggle turns a dimension off, its dial index is **pinned back to 0** so the hidden dial and the sentence agree. After any toggle, a generic snap loop moves each dial off values that became unavailable, and the active marker relocates if its dial disappeared. `isToggleLocked` greys out menu entries that make no sense in the current state (Adjektiv and unbestimmter Artikel while the object is a pronoun). `withSelection` recomposes, diffs, and pushes history only when the sentence text actually changed — flipping a toggle whose dimension sits at its default is a no-op sentence-wise.

## Testing

75 tests total: 50 grammar golden files, 16 reducer, 5 diff, 4 navigation.

- Grammar tests use a `make(setup)` helper that pins `indefinite: false` and **auto-enables a dimension's toggle when its index is provided** (explicit toggles win). This bit us once: after toggles started defaulting off, 22 tests silently pinned to Präsens/Aktiv while asserting Perfekt sentences.
- Golden-file the pedagogically tricky forms: Passiv Perfekt `… ist … aufgemacht worden` (NOT `geworden` — the single most likely composition bug), weak vs mixed adjective declension, `kein-` vs `nicht`, Nebensatz separable fusion, pronoun case ripples, plural agreement, and the English do-support/modal semantics.
- Reducer tests need a `tensesOn` helper action first, since tense defaults to hidden.
- Index cheat sheet for tests: subject 0–3 (Mann/Frau/Kind/Kinder), person 0–5 (ich…sie), verb 0–3 (öffnen/reparieren/aufmachen/zumachen), modal 0–2 (können/müssen/wollen), object 0–2 (Tür/Schrank/Fenster), adjective 0–2 (alt/neu/kaputt), tense 0–3, voice 0–1, satzart 0–2 (Hauptsatz/Frage/Nebensatz).

## UI mechanics worth knowing (both projects' scar tissue)

- Replaying an enter/fade animation is done by remounting via a changing `key` — Sentence keys changed tokens `g${generation}-${i}`. Sibling keys must stay unique.
- Any state that exists only to drive an animation must be per-component; a shared animation flag makes unrelated components twitch (words-words shipped this bug).
- Mouse wheel events arrive at wildly different rates (trackpad vs discrete wheel). Accumulate `deltaY` in a ref and consume in fixed ~40 px steps; never step once per event.
- `preventDefault()` in React wheel/touch handlers is unreliable (passive listeners); solve scroll leakage declaratively: `touch-action: manipulation` on selectors, `overflow: hidden` on desktop `body`.
- The mobile blue tap flash is killed only by `-webkit-tap-highlight-color: transparent` (on `*`); `user-select: none` alone doesn't do it.
- Selector widths are sized by the longest value (`ch` units) on desktop so the layout never jumps mid-spin — but on a 393 px phone that overflows three-across, so the mobile media query switches to a 3-column grid with `width: auto !important`.
- Mobile layout: page scrolls, `.sentence-block` is sticky on top; its side padding (3.75rem) must clear BOTH fixed corner buttons — 3rem was 2 px short of the hamburger.
- Typewriter: animate only the newest history entry; older entries are plain text. Dedupe consecutive duplicates in the reducer, cap at 50. History entries store both `ru` and `en` so a language switch re-renders the whole feed.
- Keep reducers pure (StrictMode double-invokes them). History-pushing inside the reducer is fine because it's deterministic.
- Umlauts/ß: keep everything UTF-8 and don't uppercase/lowercase German strings programmatically (`ß`/`SS` will bite you).
- Inline SVG data-URI favicon in `index.html`, or you'll chase a phantom 404 during verification.
- TS niggle: `cond && <value>` for an optional prop yields `false`, which is not assignable — use a ternary with `undefined`.

## Verification recipe (works on this machine)

The user's Mac has Chrome; no Playwright browsers are downloaded. `npm i playwright-core` in a scratch dir and launch the **system Chrome**:

```js
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
```

- Collect `console` errors and `pageerror` from the start; a run isn't green with a non-empty error list.
- Drive with `page.keyboard.press(...)` and clicks, assert on `$$eval` text, take screenshots and actually look at them.
- Check mobile at `viewport: { width: 393, height: 852 }` (iPhone-class): Subjekt · Verb · Objekt on one row, corner buttons clear of the sentence.
- Language default is testable via `locale: 'ru-RU'` / `'en-US'` on the context; persistence via reload after clicking the picker.
- `timeout` doesn't exist on macOS shells — poll with a `for`+`sleep` loop instead.
- If the dev server port (5199, `strictPort`) is stuck from a previous session: `lsof -ti :5199 | xargs kill`.

## Deploy recipe (GitHub Pages via Actions)

`.github/workflows/deploy.yml`; every push to `main` deploys to https://formatq.github.io/satz-satz/ in ~1 min.

- Build with `npm run build -- --base=/satz-satz/` **in the workflow only** — keeps local dev at `/`.
- One-time setup (already done for this repo): the first run fails at `actions/configure-pages` until **Settings → Pages → Source: GitHub Actions** is set; re-run after.
- Poll the run via the GitHub API (`gh api` or curl) instead of guessing, then verify the live page the same headless way against the real URL — the `--base` path is exactly the kind of thing that only breaks in production.

## Definition of done for a change

All 75+ unit tests green, `npm run build` clean, headless run with zero console errors on the dev URL (desktop + 393 px), commit, push, deploy workflow green, and the live page verified with a screenshot a human has actually looked at.
