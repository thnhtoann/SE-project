---
description: Investigate and fix a described bug or issue
argument-hint: <issue description or ticket ID>
---

Investigate the issue: $ARGUMENTS

1. Reproduce or locate the root cause by reading the relevant code in `src/backend/` or `src/frontend/`.
2. Propose a fix consistent with `.claude/rules/code-style.md`.
3. Implement the fix and add/update a test per `.claude/rules/testing.md`.
4. Summarize the root cause and the fix.
