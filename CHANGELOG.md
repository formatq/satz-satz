# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/formatq/satz-satz/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/formatq/satz-satz/releases/tag/v1.0.0
