# Implementation notes for satz-satz

Hand-off notes for the agent implementing `SPEC-DE.md` from scratch. Everything here was learned (some of it the hard way) while building words-words — the English phrasal-verb predecessor at https://github.com/formatq/words-words. Read the spec first; this file is the "how", not the "what".

## Ground rules

- **Stack**: Vite + React + TypeScript, vitest, no UI libraries, no state managers, plain CSS. `useReducer` for app state. The app is tiny; keep it that way.
- **Language**: all code, comments, test names, error messages, and UI copy in English. Russian appears ONLY inside translation data (`ru` fields).
- **All data is static and imported into the bundle** (JSON import, not fetch). Zero network requests after page load — this is what makes dial-spinning feel instant.
- **Logic never waits for animation.** Animations are ~120–600 ms; the user can spin faster than that. State updates are synchronous; CSS animations decorate whatever the current state is.
- `.gitignore` from day one: `node_modules/`, `dist/`, `.idea/`, `*.iml`, `.claude/settings.local.json` (the last one WILL get committed by accident otherwise — it happened in words-words).

## Build order that worked

Logic first, UI second. Concretely:

1. Pure navigation core + validator + unit tests (no DOM, no React).
2. Data (for satz-satz: the generator script + committed JSON) + invariant tests against the real data.
3. UI on top, keyboard controls first (fastest to verify), then mouse wheel, then touch.
4. Verify in a headless browser (recipe below), then deploy.

The core must be a **pure function with an injected validity predicate**:

```ts
// The words-words version — reuse as-is, it already handles every edge case:
// cyclic wrap, skipping invalid, "only current is valid", "nothing is valid".
function findNextValid(length: number, current: number, direction: 1 | -1,
                       isOk: (index: number) => boolean): number {
  for (let step = 1; step <= length; step++) {
    const index = (((current + direction * step) % length) + length) % length
    if (isOk(index)) return index
  }
  return current
}
```

Note the double-modulo for negative direction — a classic off-by-one source. Test exactly these cases: wrap-around both directions, skipping, single-valid, none-valid.

## Dataset invariants: test the committed artifact

words-words validates its JSON in a unit test AND at startup in dev mode (`import.meta.env.DEV` → `console.error` on violations). Do both. For satz-satz add the **connectivity check** from the spec (BFS over single-dial moves from the initial variant; every variant must be reachable). Write a synthetic fixture with a deliberate island and assert the validator catches it — a validator that never fails a test is untested.

Also test the generator itself: golden-file a handful of expected sentences (`der Mann|aufmachen|Perfekt|Aktiv` → `Der Mann hat die Tür aufgemacht.`) including at least one Passiv Perfekt (`… ist … aufgemacht worden` — NOT `geworden`; this is the most likely generator bug) and one plural subject (verb agreement).

## The two real bugs words-words shipped, so you don't

1. **Global animation state made unrelated components twitch.** The spin direction was stored once in app state and passed to both wheels; spinning wheel A flipped wheel B's CSS animation class (`slide-from-below` ↔ `slide-from-above`), and *changing an animation class restarts the animation* even if the element's content didn't change. Rule: any state that exists only to drive an animation must be **per-component** (per-dial), and an animation must be triggered only by that component's own value changing. With 4 dials this bug would be 4× more visible.
2. **Threshold-only swipes feel broken.** The first touch implementation committed a step every 60 px but nothing moved in between — users perceive it as "abrupt teleporting". The fix: while dragging, translate the dial's content with the finger (with a resistance factor ~0.5), commit a step at the threshold, spring back on release (`transition: transform 0.18s` when not dragging, `none` while dragging). Desktop is the priority for satz-satz, but keep this if you take the touch code.

Related React/CSS mechanics worth knowing:

- Replaying an enter-animation is done by remounting via `key={value}`. Corollary: sibling keys must be unique — when a dial has only two valid values, `prev` and `next` are the SAME string; prefix the keys (`prev-${v}`, `next-${v}`) or React will throw.
- `preventDefault()` in React touch/wheel handlers is unreliable (passive listeners). Don't fight it: `touch-action: none` on the dial element and `overflow: hidden` on `body` solve page-scroll leakage declaratively. Viewport meta: `maximum-scale=1.0, user-scalable=no` stops double-tap zoom.
- Mouse wheel events arrive at wildly different rates (trackpad vs. discrete wheel). Accumulate `deltaY` in a ref and consume it in fixed steps (~40 px per position); never spin once per event.
- Typewriter effect: animate only the newest history entry (interval advancing a char counter); render older entries as plain text. Dedupe consecutive duplicates in the reducer, cap at 50.
- Keep reducers pure (StrictMode double-invokes them). History-pushing inside the reducer is fine because it's deterministic.
- Add an inline SVG data-URI favicon in `index.html`, or you'll chase a phantom 404 in the console during verification.

## satz-satz-specific advice

- **Frames are data, not code.** The 8 (tense × voice) word-order frames should be declarative token patterns the generator interprets — not eight branches of string concatenation. When Nebensatz/questions arrive (future ideas), they become new frames instead of new code paths.
- **Umlauts/ß**: keep everything UTF-8 and don't uppercase/lowercase German strings programmatically (`ß`/`SS` will bite you). Dial values display as authored.
- **Diff highlighting**: diff on the token arrays (which you already have, with role tags), not on rendered strings — then "both parts of a separable verb share a color" is just `role === 'verb' || role === 'prefix'`, no string matching. A plain LCS over ≤10 tokens needs no library. Trigger the fade by remounting the token span with a changing key; fade duration ~600 ms, and new input must interrupt it cleanly (it will, if logic never waits for animation).
- **Dial widths**: values like `Präteritum` and `reparieren` are wider than words-words' verbs; size dials by their longest value (`ch` units or measure once), or the layout will jump on every spin — which reads as yet another twitch.
- **First variant**: derive the initial dial positions from the first key present in `variants`, don't assume index 0 of every dimension combines validly.

## Verification recipe (works on this machine)

The user's Mac has Chrome; no Playwright browsers are downloaded. `npm i playwright-core` in a scratch dir and launch the **system Chrome**:

```js
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
```

- Collect `console` errors and `pageerror` from the start; a run isn't green with a non-empty error list.
- Drive with `page.keyboard.press('ArrowDown')` etc., assert on `$$eval` text, take screenshots and actually look at them.
- Touch swipes can be simulated via CDP: `page.context().newCDPSession(page)` → `Input.dispatchTouchEvent` (needs `hasTouch: true` on the page). Synthetic moves get coalesced — don't assert exact step counts, assert direction and that the inactive dials' transforms stay at zero.
- `timeout` doesn't exist on macOS shells — poll with a `for`+`sleep` loop instead.

## Deploy recipe (GitHub Pages via Actions)

Copy `.github/workflows/deploy.yml` from words-words verbatim, then:

- Build with `npm run build -- --base=/satz-satz/` **in the workflow only** — keeps local dev at `/`.
- The first run WILL fail at `actions/configure-pages`: the workflow token can't create the Pages site. The repo owner must once set **Settings → Pages → Source: GitHub Actions**, then re-run (an empty commit works). Every push to `main` after that deploys automatically (~1 min).
- Verify the live page the same headless way, against the real URL — the `--base` path is exactly the kind of thing that only breaks in production.

## Definition of done for the first iteration

The spec's acceptance criteria, plus: all unit tests green (navigation edge cases, generator golden files, invariants + connectivity on real data), `npm run build` clean, headless run with zero console errors on both dev and deployed URLs, and a screenshot that a human has actually looked at.
