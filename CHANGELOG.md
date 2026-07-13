# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-07-13

### Added

- Dative pronoun mode: **Dativ als Pronomen** swaps the Dative column to the full personal paradigm `mir / dir / ihm / ihr / uns / euch / ihnen` (`Der Mann öffnet mir die Tür`). The menu entry is locked until the dative dimension is on and resets together with it.
- Pronoun word order falls out of the existing Mittelfeld rule: a pronoun precedes a noun phrase, and with two pronouns the accusative comes first (`öffnet sie mir`, `öffnet sie der Frau`, `öffnet mir die Tür`).

### Changed

- **Object pronoun** reworked into **Accusative as pronoun**: like *Subject as pronoun*, the toggle now swaps the Accusative column to selectable pronouns `ihn / sie / es` instead of deriving the pronoun from the chosen noun. In Passiv the pronoun takes the nominative (`Er wird vom Mann geöffnet`), and the Russian translation agrees in gender (`Он был открыт`).
- Six new unit tests (98 total).

## [1.2.0] - 2026-07-13

### Added

- der/ein article switches in the selector headers of the three noun phrases — Subject, Accusative, and Dative. Each phrase switches independently (`Ein Mann öffnet einer Frau eine Tür`), the plural takes the bare noun (`Kinder`, `von Kindern`), and the passive declines the indefinite agent (`von einem Mann`).
- The switch hides when the phrase carries no article: a pronoun subject or a pronoun object.
- English translations follow the switches (`A man opens a door for a woman`); Russian is unaffected.

### Changed

- Selector labels: **Object** → **Accusative** and **Dative object** → **Dative**, each with a full hover explanation (direct object *wen? was?* / recipient *wem?*).
- The global **Indefinite article** menu toggle is replaced by the accusative header switch; the object still defaults to the indefinite article.
- Seven new unit tests (92 total).

## [1.1.0] - 2026-07-13

### Added

- Dative object: a **Dativobjekt** toggle reveals a recipient selector (`der Frau`, `dem Kind`, `dem Mann`, `den Kindern`). The benefactive dative combines with every verb, object, tense, voice, and sentence type.
- Correct Mittelfeld word order: the dative precedes an accusative noun (`öffnet der Frau die Tür`) but follows an accusative pronoun (`öffnet sie der Frau`); in Passiv it precedes the `von` agent (`Die Tür wird der Frau vom Mann geöffnet`).
- Recipient translations: Russian dative in active clauses (`открывает женщине дверь`) and «для …» in passive ones; an English for-phrase (`opens the door for the woman`).
- Ten new unit tests (85 total).

### Changed

- The UI grows to nine stable positions: the dative object is position 5; Adjective, Tense, Voice, and Sentence type shift to 6–9, and keyboard shortcuts extend to `1`–`9`.

## [1.0.0] - 2026-07-12

### Added

- Interactive runtime composition of German sentences from morphology tables and declarative word-order frames.
- Eight stable learning positions for subject, verb, modal verb, object, adjective, tense, voice, and sentence type; the Subject position can switch to personal pronouns.
- Grammar controls for modal verbs, adjective agreement, four tenses, active/passive voice, questions, subordinate clauses, negation, indefinite articles, and object pronouns.
- Russian and English sentence translations, plus a matching localised interface and About panel.
- Token-level changed-word highlights, a deduplicated typewriter history, mouse-wheel and keyboard navigation, and fixed three-row selector windows.
- Responsive layouts for desktop and mobile, including a sticky mobile sentence block.
- Persisted light and dark themes.
- A 75-test suite covering grammar, reducer state, navigation, and token diffs.

### Changed

- Replaced the original four-dial, pregenerated-variant prototype with runtime sentence composition and progressive feature disclosure.
- Redesigned the interface around fixed-width selector blocks, stable 1–8 UI positions, and beginner-friendly English/Russian chrome.

[Unreleased]: https://github.com/formatq/satz-satz/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/formatq/satz-satz/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/formatq/satz-satz/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/formatq/satz-satz/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/formatq/satz-satz/releases/tag/v1.0.0
