# satz-satz — German sentence modulator

## Idea

The phrasal-verb trainer showed the pattern: spin a dial, instantly see what changes. This spec applies it to whole **German sentences**.

The screen shows one German sentence. Below it — a row of **dials** (scrollable pickers, same interaction as the words-words wheels). Each dial controls one grammatical dimension of the sentence: the subject (and thus its gender), the verb (separable or inseparable), the tense, the voice. Spinning any dial regenerates the sentence instantly, and the app **highlights exactly which words changed**.

That last part is the whole point. German grammar is a web of agreements: change the subject's gender and the article changes (`der → die`); switch to Perfekt and the verb splits into auxiliary + participle at the end (`macht auf → hat aufgemacht`); switch to Passiv and the object becomes the subject while the agent moves into a `von`-phrase with dative (`vom Mann → von der Frau`). Reading rules about this is slow; flipping a dial and *watching the sentence rearrange itself* is fast. The user should be able to rattle `↑↓↑↓` and compare variants within seconds.

Primary platform: **desktop** (keyboard + mouse wheel). Touch support comes for free from the existing components but is not the focus.

## Example of one template under all four dials

Template "the door" — subject × verb × tense × voice:

| Dials | Sentence |.ы
|---|---|
| der Mann · aufmachen · Präsens · Aktiv | **Der Mann** **macht** die Tür **auf**. |
| die Frau · aufmachen · Präsens · Aktiv | **Die Frau** macht die Tür auf. |
| der Mann · öffnen · Präsens · Aktiv | Der Mann **öffnet** die Tür. |
| der Mann · aufmachen · Perfekt · Aktiv | Der Mann **hat** die Tür **aufgemacht**. |
| der Mann · aufmachen · Futur I · Aktiv | Der Mann **wird** die Tür **aufmachen**. |
| der Mann · aufmachen · Präsens · Passiv | **Die Tür wird vom Mann aufgemacht.** |
| die Kinder · aufmachen · Perfekt · Passiv | Die Tür ist **von den Kindern** aufgemacht **worden**. |

Bold marks what the diff highlight would flash. Note the pedagogically rich ripples: separable prefix jumping to the end and back, `haben` appearing in Perfekt, subject↔object swap in Passiv, `von + Dativ` agreeing with the chosen subject's gender and number.

## Dimensions (v1 dials)

1. **Subjekt** — `der Mann`, `die Frau`, `das Kind`, `die Kinder`. Covers all three genders plus plural (which also flips verb agreement: `macht → machen`). In Passiv this dial controls the `von`-phrase instead (`vom Mann / von der Frau / vom Kind / von den Kindern`) — dative ripple.
2. **Verb** — a curated set mixing separable and inseparable verbs that all fit the template's object, e.g. for "die Tür": `aufmachen` (sep.), `zumachen` (sep.), `öffnen` (insep.), `schließen` (insep.), `reparieren` (insep.).
3. **Zeitform** — `Präsens`, `Präteritum`, `Perfekt`, `Futur I`.
4. **Genus Verbi** — `Aktiv`, `Passiv` (Vorgangspassiv only in v1).

Not every combination has to exist (e.g., a future template may include an intransitive verb with no Passiv). The navigation reuses the words-words rule: **spinning a dial skips values that don't form a valid variant** with the other dials' current values.

## Interface (one screen, desktop-first)

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│         Der Mann hat die Tür aufgemacht.              │  ← the sentence, large;
│                  ~~~         ~~~~~~~~~~               │    changed words flash
│                                                       │    with a fading highlight
│         Мужчина открыл дверь.                         │  ← Russian translation
│                                                       │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌────────┐  │
│  │ die Frau │ │ zumachen  │ │  Präsens  │ │ Passiv │  │  ← neighbors, dimmed
│  │ DER MANN │ │ AUFMACHEN │ │ ▸PERFEKT◂ │ │ AKTIV  │  │  ← active dial highlighted
│  │ das Kind │ │  öffnen   │ │  Futur I  │ │        │  │
│  └──────────┘ └───────────┘ └───────────┘ └────────┘  │
│    Subjekt        Verb        Zeitform   Genus Verbi  │  ← dial labels
│                                                       │
│  ──────────────────── history ──────────────────────  │
│  Der Mann hat die Tür aufgemacht. — Мужчина открыл…   │  ← same typewriter feed
│  Der Mann macht die Tür auf. — Мужчина открывает…     │    as words-words
│                                                       │
└───────────────────────────────────────────────────────┘
```

- **Controls** — identical to words-words, generalized to N dials: `←`/`→` move the active dial, `↑`/`↓` spin it (auto-repeat works), mouse wheel over any dial spins that dial, click activates. Keys `1`–`4` jump straight to a dial (nice on desktop).
- **Diff highlight** — on every change, tokenize the previous and current sentence, compute a word-level diff (LCS), and give changed/inserted words a colored background that fades out over ~600 ms. The two parts of a separable verb (`macht … auf`) share one color so they read as one lexeme.
- **History feed** — reused as-is: newest entry typed out, consecutive duplicates dropped, capped at 50.
- Layout is wider than words-words (sentence needs room); everything still fits one screen without page scroll.

## Data: generated, not hand-written

Unlike phrasal verbs (a flat list you can curate by hand), sentence variants are a cross product: template "die Tür" alone is 4 subjects × 5 verbs × 4 tenses × 2 voices = **160 sentences**. Writing them manually doesn't scale and invites inconsistency. Instead:

**A deterministic generator script** (`scripts/generate-de.mjs`, run manually, output committed) composes every variant from small hand-encoded tables:

```js
// per verb: stem forms, participle, separable prefix, aux, Russian forms
{ lemma: "aufmachen", sep: "auf", stem: "mach",
  praesens3: "macht", praet3: "machte", partizip2: "aufgemacht", aux: "haben",
  ru: { inf: "открывать", past: "открыл", pres3: "открывает", passivPres: "открывается", ... } }

// per subject: article forms per case, noun, number
{ de: "der Mann", von: "vom Mann", plural: false, ru: "мужчина", ruInstr: "мужчиной" }
```

plus one word-order frame per (tense × voice) cell — 8 frames, each a token pattern like `Perfekt/Aktiv: [subj] [aux-präsens] [obj] [partizip2] .` The Russian translation is composed the same way from the per-verb Russian forms (approximate by design; good enough for "see the difference", flagged for later proofreading).

The generator emits one static JSON per template, in the app's consumption format:

```json
{
  "id": "tuer",
  "label": "die Tür",
  "dimensions": [
    { "id": "subject", "label": "Subjekt",     "values": ["der Mann", "die Frau", "das Kind", "die Kinder"] },
    { "id": "verb",    "label": "Verb",        "values": ["aufmachen", "zumachen", "öffnen", "schließen", "reparieren"] },
    { "id": "tense",   "label": "Zeitform",    "values": ["Präsens", "Präteritum", "Perfekt", "Futur I"] },
    { "id": "voice",   "label": "Genus Verbi", "values": ["Aktiv", "Passiv"] }
  ],
  "variants": {
    "der Mann|aufmachen|Perfekt|Aktiv": {
      "de": [["Der", "art"], ["Mann", "subj"], ["hat", "aux"], ["die", "art"], ["Tür", "obj"], ["aufgemacht", "verb"]],
      "ru": "Мужчина открыл дверь."
    }
  }
}
```

`de` is a token array with role tags (`subj`, `verb`, `prefix`, `aux`, `art`, `obj`, `other`) — this powers both the separable-verb pairing in the diff highlight and an optional role-coloring mode later. The app renders tokens joined by spaces plus a final period.

Correctness lives in the tables and frames — reviewing ~10 table rows and 8 frames is tractable, unlike proofreading 160 sentences. Generated output is still committed (the app never generates at runtime; everything stays a static instant lookup, zero network requests after load).

## Engine changes (generalize words-words from 2 wheels to N dials)

The words-words core almost fits; it needs three generalizations, all in the logic layer:

1. **State** — `verbIndex`/`particleIndex` becomes `indices: number[]` (one per dimension), `active: number`.
2. **`nextValidIndex(dim, state, direction)`** — same cyclic skip-invalid search, but validity = "key built from `indices` with dimension `dim` replaced exists in `variants`". `findNextValid` (the pure function) is reused unchanged.
3. **Connectivity invariant** — new, and important with N dimensions: skip-invalid navigation can strand the user on an "island" of variants unreachable from other variants by single-dial moves. The validator must BFS the variant graph (edges = single-dimension valid moves) from the initial variant and fail if any valid variant is unreachable. Checked by a unit test and at startup in dev mode, like the existing invariants (plus the old ones: every key well-formed, every dimension value used by ≥1 variant, no empty translations).

`Wheel.tsx` is reused as the dial component (values are longer strings — width/font tweaks only, plus a label under it). `HistoryFeed`, keyboard/wheel/touch controls carry over with the N-dial extension of `←`/`→`.

## Where it lives

A **standalone repo** (`satz-satz`), started from scratch with the same stack. Do not import words-words as a dependency — copy the patterns (and freely crib from the code at https://github.com/formatq/words-words), but keep the projects independent: the shared logic is ~100 lines and will diverge once N-dimensional. See `IMPLEMENTATION-NOTES.md` for everything the words-words iteration already learned the hard way.

## Work plan (first iteration)

1. **Generalize the core**: N-dimensional state + `nextValidIndex`, connectivity validator, unit tests (including a synthetic island fixture that must fail validation). Extract shared components/lib so both entry points use them.
2. **Generator script** for template "die Tür": tables for 5 verbs / 4 subjects, 8 tense×voice frames, Russian composition; emit `src/de/data/tuer.json`; invariant + connectivity tests run against the committed output.
3. **UI**: sentence view with role-tagged tokens, 4 dials with labels, translation, history feed. Keyboard (`←→↑↓`, `1`–`4`), mouse wheel.
4. **Diff highlight**: token-level LCS against the previous variant, fading background on changed tokens, separable-verb pairing via role tags.
5. **Deploy**: GitHub Pages via Actions, same workflow as words-words (see the deploy recipe in `IMPLEMENTATION-NOTES.md`).
6. Polish: wide desktop layout, dark theme parity, verify touch still works.

## Acceptance criteria

- Holding `↓` on the Zeitform dial cycles the sentence through all four tenses fluidly; each stop is a grammatical German sentence with a translation.
- Switching Subjekt in Passiv changes the `von`-phrase with correct dative forms (`vom Mann`, `von der Frau`, `vom Kind`, `von den Kindern`).
- Separable verbs split in Präsens/Präteritum (`macht … auf`) and fuse in Perfekt/Futur (`aufgemacht`, `aufmachen`); the diff highlight marks both parts.
- Every dial change highlights exactly the words that differ, and the highlight fades without blocking further spinning (logic never waits for animation).
- Connectivity test proves every variant of the template is reachable from the initial one by single-dial moves.
- Zero network requests after page load; no console errors.

## Future ideas (not in v1)

- **More templates**: dative + accusative objects (`X gibt dem Nachbarn einen Schlüssel` — two case ripples), adjective before the noun (adjective-ending dial: `der alte Mann / ein alter Mann`), Wechselpräpositionen (`in den / im`).
- **Person dial**: `ich / du / er / wir / ihr / sie` — full conjugation ripple.
- **Satzart dial**: Hauptsatz / Nebensatz (`…, weil der Mann die Tür aufmacht`) / Frage — the verb-position ripple, arguably the most German thing there is.
- **Negation toggle**: `nicht` / `kein-` placement.
- **Zustandspassiv** vs Vorgangspassiv (`ist geöffnet` vs `wird geöffnet`), Konjunktiv II, modal verbs (`kann die Tür aufmachen`).
- **Role coloring mode**: persistent color per grammatical role instead of diff-only highlighting.
- **Runtime morphology engine**: replace pre-generated variants with in-browser composition from the same tables — enables free noun/verb substitution beyond curated sets.
- **Audio** (Web Speech API has decent German voices), quiz mode ("dial in the sentence matching this translation"), spaced repetition — same list as the English side.
