# satz-satz — German sentence modulator

> Living spec, kept in sync with the shipped app (https://formatq.github.io/satz-satz/).
> The original v1 spec described four scroll-wheel dials over pregenerated JSON;
> the app has since moved to nine fixed-position selectors composed at runtime.
> `IMPLEMENTATION-NOTES.md` covers the "how".

## Idea

The phrasal-verb trainer (words-words) showed the pattern: spin a dial, instantly see what changes. satz-satz applies it to whole **German sentences**.

The screen shows one German sentence with a translation under it. Below — a row of **fixed-position selectors**, one per grammatical dimension. Picking any value recomposes the sentence instantly, and the app **highlights exactly which words changed**.

That last part is the whole point. German grammar is a web of agreements: change the subject's gender and the article changes (`der → die`); switch to Perfekt and the verb splits into auxiliary + participle at the end (`macht auf → hat aufgemacht`); switch to Passiv and the object becomes the subject while the agent moves into a `von`-phrase with dative (`vom Mann → von der Frau`); wrap the sentence in `weil …` and the finite verb walks to the end, fusing with its separable prefix. Reading rules about this is slow; flipping a dial and *watching the sentence rearrange itself* is fast.

The second design idea is **progressive disclosure**: the first impression is deliberately simple — just Subjekt · Verb · Objekt and a Präsens sentence. Every further dimension and feature lives in a hamburger menu and is opened up one toggle at a time; hidden dimensions don't render at all. A learner grows the app as they progress.

Primary platform: desktop (keyboard + mouse wheel). Mobile is a first-class minimal adaptation (it is actually used on a phone), not an afterthought.

## Example ripples

| Change | Sentence |
|---|---|
| baseline | Der Mann **öffnet** eine Tür. |
| Verb → aufmachen | Der Mann **macht** eine Tür **auf**. |
| Zeitform → Perfekt | Der Mann **hat** eine Tür **aufgemacht**. |
| Genus Verbi → Passiv | **Eine Tür wird vom Mann aufgemacht.** |
| Subjekt → die Kinder (still Passiv) | Eine Tür wird **von den Kindern** aufgemacht. |
| Zeitform → Perfekt (still Passiv) | Eine Tür **ist** von den Kindern aufgemacht **worden**. |
| Satzart → Nebensatz | …, weil die Kinder eine Tür **aufmachen**. |
| Negation on (indefinite object) | Der Mann öffnet **keine** Tür. |
| Modalverb → müssen | Der Mann **muss** eine Tür **öffnen**. |

Bold marks what the diff highlight flashes.

## Dimensions (nine dials)

In `DIALS` order (keys `1`–`9` jump to them):

1. **Subjekt** — `der Mann · die Frau · das Kind · die Kinder`: three genders plus plural (verb agreement flips). In Passiv this dial drives the `von`-phrase (`vom Mann / von der Frau / vom Kind / von den Kindern`).
2. **Person** — `ich · du · er · wir · ihr · sie`: the full conjugation paradigm. Replaces the Subjekt dial when enabled (exactly one of the two drives the sentence).
3. **Verb** — `öffnen · reparieren · aufmachen · zumachen`: two inseparable, two separable, all transitive and compatible with every object.
4. **Modalverb** — `können · müssen · wollen`: takes the finite slot, sends the main verb to the end as an infinitive (`kann die Tür aufmachen`; Passiv: `muss geöffnet werden`).
5. **Objekt** — `die Tür (f) · der Schrank (m) · das Fenster (n)`: Akkusativ ripple (`der → den` for the masculine), and the Passiv subject.
6. **Adjektiv** — `alt · neu · kaputt`: attributive adjective in the object phrase, weak vs mixed declension depending on the article (`die alte Tür / eine alte Tür / der alte Schrank / ein alter Schrank`).
7. **Zeitform** — `Präsens · Präteritum · Perfekt · Futur I`.
8. **Genus Verbi** — `Aktiv · Passiv` (Vorgangspassiv).
9. **Satzart** — `Hauptsatz · Frage · Nebensatz`: verb-first question, verb-final `…, weil`-clause — the verb-position ripple.

Every combination of enabled values composes into a valid sentence; there is no variant lookup to miss. The only availability restriction: with a modal verb, Zeitform is limited to Präsens/Präteritum (unavailable values render dimmed) — this deliberately stays out of C1 double-infinitive territory (`hat aufmachen können`).

## Feature toggles (hamburger menu, top-left)

All configuration lives in one menu; a toggle either reveals a dial or switches a feature. Everything starts **off** except the indefinite article:

- **Person** — swaps the Subjekt dial for the Person dial.
- **Modalverb / Adjektiv / Zeitform / Genus Verbi / Satzart** — reveal their dials (otherwise pinned to no modal / no adjective / Präsens / Aktiv / Hauptsatz).
- **unbestimmter Artikel** (on by default) — `eine Tür / einen Schrank / ein Fenster`; off restores `die / den / das`. Also switches the adjective between mixed and weak declension.
- **Negation** — `nicht` after the object/agent phrase (`öffnet die Tür nicht`), switching to `kein-` when the object is indefinite (`öffnet keine Tür`).
- **Pronomen (Objekt)** — the object renders as a pronoun to study case: `der Schrank → ihn` (and `→ er` as Passiv subject). While on, the Adjektiv and unbestimmter-Artikel entries are locked (a pronoun takes neither).

Turning a dimension off pins its dial back to the default value, so the hidden dial and the sentence always agree; values made unavailable snap to the first available one.

## Interface

```
 ☰                                                 RU ▾   ← hamburger / language picker
┌───────────────────────────────────────────────────────┐
│         Der Mann hat eine Tür aufgemacht.              │  ← sentence pinned on top;
│                  ~~~          ~~~~~~~~~~               │    changed words flash with
│         Мужчина открыл дверь.                          │    a fading highlight (600 ms)
│                                                       │
│  ┌──────────┐ ┌────────────┐ ┌─────────────┐ ┌──────┐ │
│  │ DER MANN │ │  öffnen    │ │  DIE TÜR    │ │ ...  │ │  ← fixed-position selectors:
│  │ die Frau │ │ reparieren │ │ der Schrank │ │      │ │    all values visible, current
│  │ das Kind │ │ AUFMACHEN  │ │ das Fenster │ │      │ │    one highlighted; disabled
│  │ d. Kinder│ │  zumachen  │ │             │ │      │ │    dials don't render at all
│  └──────────┘ └────────────┘ └─────────────┘ └──────┘ │
│    Subjekt        Verb           Objekt                │
│  ──────────────────── history ───────────────────────  │
│  Der Mann hat eine Tür aufgemacht. — Мужчина открыл…   │  ← typewriter feed, dedup,
│  Der Mann macht eine Tür auf. — Мужчина открывает…     │    cap 50, scrolls on its own
└───────────────────────────────────────────────────────┘
```

- **Controls** — click any value to select it; mouse wheel over a selector steps it (accumulated deltaY, ~40 px per step). `←`/`→` move the active selector (cyclic, skips hidden ones), `↑`/`↓` step it (**clamped, no wrap** — the selector has fixed positions), `1`–`9` jump straight to a dial.
- **Diff highlight** — token-level LCS between the previous and current token arrays; changed tokens get a background fading over ~600 ms (replayed by keyed remount, interrupted cleanly by fresh input). The two parts of a separable verb (`macht … auf`) are paired via role tags.
- **Sentence pinned** — the sentence and selectors never move; only the history feed scrolls, inside its own block.
- **History feed** — newest entry typed out (18 ms/char), consecutive duplicates dropped, capped at 50; each entry stores both translations.

## Translations (Russian + English)

A picker in the top-right corner (RU/EN) switches the translation line and the entire history feed. The choice persists in `localStorage` (`satz-satz-lang`) and defaults from `navigator.language` (Russian browsers → RU, everything else → EN).

Both translations are composed at runtime from per-word fields in the same tables:

- **Russian** — gender/person agreement in past tense, «не» for negation, «…, потому что …» for the Nebensatz, modal «должен/должна/должно/должны» by gender.
- **English** — Präteritum and Perfekt stay distinct (`opened / has opened`); questions and negation get do-support (`Does the man open …? / does not open`); `können` maps to the true modal `can/cannot/could` while `müssen/wollen` become periphrastic (`has to / wants to` — so `muss nicht` correctly yields `does not have to`); the indefinite article picks `a/an` by the following word (`a door / an old door`).

Translations are approximate by design — good enough to anchor meaning while the German does the teaching.

## Mobile (≤ 700 px)

- The page scrolls, but the sentence block is `position: sticky` at the top — always visible while reaching wrapped selectors and the history.
- Selectors form a 3-column grid so Subjekt · Verb · Objekt share the first row on an iPhone; enabled extras fill following rows.
- Corner buttons (☰ and RU/EN) are `position: fixed`; the sentence block's side padding keeps the text clear of both.
- Tap targets are finger-sized; the default blue tap flash is suppressed (`-webkit-tap-highlight-color: transparent`).

## Engine

No pregenerated data. Sentences are composed at runtime by `src/de/grammar.ts` from small hand-encoded morphology tables (subjects, persons, verbs with six-form paradigms, modals, objects with per-case article/pronoun forms, adjectives) and **declarative word-order frames** — one slot-function array per `(Satzart × Zeitform × Genus Verbi)` cell: 24 plain frames plus 12 modal frames. `compose(selection)` returns role-tagged German tokens (`subj · verb · prefix · aux · art · adj · obj · other`) plus both translations. Zero network requests after page load.

The v1 pregenerated-JSON approach (generator script, committed variants, connectivity validator) was retired when object, adjective, pronoun and person modes multiplied the variant space into the thousands; with runtime composition, correctness lives in the tables and frames, and validity is structural rather than a lookup.

State is a pure `useReducer`: `indices: number[]` (one per dial) + `toggles`, with actions `spin / select / activate / move-active / toggle`.

## Acceptance criteria (all shipped and verified)

- Fresh load shows only Subjekt · Verb · Objekt and a valid Präsens sentence with an indefinite article; every further dimension appears only via the hamburger.
- Stepping Zeitform cycles through all four tenses; each stop is a grammatical German sentence with a translation in the chosen language.
- Switching Subjekt in Passiv changes the `von`-phrase with correct dative forms; switching Objekt in Passiv changes the sentence subject.
- Separable verbs split in Präsens/Präteritum, fuse in Perfekt/Futur and in the Nebensatz; the diff highlight marks both parts.
- Passiv Perfekt uses `worden` (not `geworden`); adjective endings follow weak/mixed declension per article; `kein-` replaces `nicht` exactly when the object is indefinite.
- Every change highlights exactly the words that differ, without blocking further spinning (logic never waits for animation).
- Language switch re-renders the translation line and the whole history; the choice survives a reload.
- On a 393 px viewport, Subjekt · Verb · Objekt share one row and the corner buttons don't overlap the sentence.
- Zero network requests after page load; no console errors; 75 unit tests green.

## Future ideas (not built)

- **Audio** — Web Speech API has decent German voices; speak the sentence on demand.
- **Quiz mode** — "dial in the sentence matching this translation"; spaced repetition.
- **Role coloring mode** — persistent color per grammatical role instead of diff-only highlighting.
- **State in the URL** — shareable links to a specific sentence/configuration.
- **PWA manifest** — installable, offline-first (the app already needs no network).
- **More vocabulary / templates** — dative objects (`gibt dem Nachbarn einen Schlüssel`), Wechselpräpositionen (`in den / im`), Zustandspassiv (`ist geöffnet`), Konjunktiv II.
