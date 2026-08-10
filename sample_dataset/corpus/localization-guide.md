# Localization Guide

Every Lumen playable ships with a minimum language set: English, Spanish, Portuguese, German, French, Japanese and Korean. Clients can add languages, never remove from the minimum set.

Language is auto-detected from the device locale, with English as the fallback when detection fails or the locale is unsupported.

Copy lives in a single strings.json keyed by language code. Hard-coded strings in components are a QA blocker. Fonts must cover the full character set of every shipped language; the QA checklist includes a glyph coverage check for Japanese and Korean.
