---
name: i18n-key-sync
description: Adds new UI text as translation keys in the frontend's i18next locale files instead of hardcoding strings, and flags other locales that need translation. Use when the user adds or edits any user-facing text in the frontend.
---

# i18n key sync

Frontend uses `i18next` / `react-i18next` (`src/frontend/public/locales/`, 16 locale files including `en.json`).

When adding or changing user-facing text:

1. Never hardcode strings directly in JSX — add a key to `public/locales/en.json` and reference it via the existing `useTranslation`/`t()` pattern used elsewhere in the codebase.
2. Use a clear, namespaced key (match the nesting style already present in `en.json`) rather than the raw English string as the key.
3. After adding the key to `en.json`, check whether the other locale files (`ae.json`, `da.json`, `de.json`, `el.json`, `es.json`, `fr.json`, `hu.json`, `it.json`, `ja.json`, `pl.json`, `pt.json`, `ru.json`, `sv.json`, `tr.json`, `zh.json`) need the same key added. If you can't translate confidently, add the English string as a placeholder in each locale file and flag to the user which locales still need real translation — don't leave keys missing entirely, since that breaks the fallback.
