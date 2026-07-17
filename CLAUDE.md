# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a Software Engineering course project in its initial scaffolding stage: `src/backend/`, `src/frontend/`, and every `docs/` subfolder currently contain only a `.gitkeep` placeholder — no backend/frontend framework, package manifest, build tooling, linter, or test runner has been chosen yet. There is no build, lint, or test command to run.

When the stack is chosen and real code/tooling is added, update this file (and the placeholder rules below) with the actual commands — don't invent commands that don't exist yet.

## Structure

- `src/backend/` — backend service code (empty)
- `src/frontend/` — frontend app code (empty)
- `docs/analysis and design/` — design docs, diagrams
- `docs/management/` — project/process management artifacts
- `docs/requirements/` — requirements docs
- `docs/test/` — test plans and reports
- `.claude/rules/` — coding standards, auto-loaded: `code-style.md`, `api-conventions.md`, `testing.md` (all currently placeholders pending stack choice)
- `.claude/commands/` — custom slash commands: `/review` (review pending diff against project conventions), `/fix-issue` (investigate + fix a described bug), `/deploy` (pre-deploy checklist; no pipeline configured yet)
- `.claude/agents/` — subagent personas: `code-reviewer` (style/correctness/test-coverage review), `security-auditor` (injection, auth, secrets, unsafe input handling)
- `.claude/skills/` — currently only `example-skill`, a placeholder template for a future auto-invoked workflow

## Conventions

- Follow the rules in `.claude/rules/` (code style, testing, API conventions) for all code changes — fill in the specific stack conventions there as soon as the stack is decided, rather than letting real practice diverge from the placeholders.
- Keep backend and frontend concerns separated under their respective `src/` folders.
- Place new documentation in the matching `docs/` subfolder rather than at the repo root.

## Notes for Claude

- This file is committed and shared with the team — keep it accurate as the project evolves.
- Personal preferences that shouldn't be shared go in `CLAUDE.local.md` (gitignored) instead.
- When conventions here go stale (framework changes, new tooling), update this file as part of the same change.
