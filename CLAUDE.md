# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Stack is chosen:

- **Backend**: Django + Django REST Framework (`src/backend/`), Python 3.12, PostgreSQL.
- **Frontend**: Next.js 14 / React 18 (`src/frontend/`, the "Vristo" template), TypeScript, Tailwind CSS.
- Both services and the Postgres database run via Docker Compose (`docker-compose.yml` at repo root). There is no non-Docker local dev path documented — use Compose.

`docs/` subfolders still contain only `.gitkeep` placeholders — no requirements/design/test-plan docs have been written yet.

## Running the project

```
cp .env.example .env        # first time only, adjust values as needed
docker compose up --build
```

- Backend: http://localhost:8000 (health check at `/api/health/`, admin at `/admin/`)
- Frontend: http://localhost:3000
- Postgres: localhost:5432 (credentials from `.env`)

Common commands:

```
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec frontend npm run lint
docker compose down            # stop
docker compose down -v         # stop and wipe the Postgres volume
```

Migrations run automatically on backend container start (see `src/backend/entrypoint.sh`).

## Structure

- `src/backend/` — Django + DRF project.
  - `config/` — project settings, root URLconf, WSGI/ASGI entrypoints.
  - `core/` — first Django app; currently just the `/api/health/` endpoint. Add new apps alongside it.
  - `requirements.txt`, `Dockerfile`, `entrypoint.sh`, `.env.example`
- `src/frontend/` — Next.js app (Vristo template), `Dockerfile`.
- `docker-compose.yml`, `.env.example` — orchestration for backend, frontend, and Postgres.
- `docs/analysis and design/` — design docs, diagrams
- `docs/management/` — project/process management artifacts
- `docs/requirements/` — requirements docs
- `docs/test/` — test plans and reports
- `.claude/rules/` — coding standards, auto-loaded: `code-style.md`, `api-conventions.md`, `testing.md`
- `.claude/commands/` — custom slash commands: `/review` (review pending diff against project conventions), `/fix-issue` (investigate + fix a described bug), `/deploy` (pre-deploy checklist; no pipeline configured yet)
- `.claude/agents/` — subagent personas: `code-reviewer` (style/correctness/test-coverage review), `security-auditor` (injection, auth, secrets, unsafe input handling), `api-contract-auditor` (DRF endpoints vs. `api-conventions.md`), `frontend-reviewer` (Next.js/React vs. `code-style.md` and i18n)
- `.claude/skills/` — auto-invoked workflows: backend (`django-app-scaffolder`, `drf-endpoint`, `django-test-writer`) and frontend (`next-page-scaffolder`, `redux-slice-generator`, `i18n-key-sync`), plus the `example-skill` template and the `speckit-*` skills (see Spec Kit below)
- `.specify/` — [GitHub Spec Kit](https://github.com/github/spec-kit) templates, scripts, and project state (constitution, per-feature spec/plan/tasks templates). Not built/run via Docker — the `specify` CLI runs on the host (`uv tool install specify-cli`).

## Spec-Driven Development (Spec Kit)

This project uses [GitHub Spec Kit](https://github.com/github/spec-kit) for spec-driven development, via Claude Code skills installed under `.claude/skills/speckit-*`: `speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-checklist`, `speckit-tasks`, `speckit-analyze`, `speckit-implement`, `speckit-converge`.

- Each feature gets its own directory (created by `/speckit-specify`) holding `spec.md` (what/why), `plan.md` (tech stack/architecture), and `tasks.md` (dependency-ordered task breakdown).
- **Persistence convention: flow-forward.** Once a feature is implemented, its `spec.md`/`plan.md`/`tasks.md` are frozen as a historical record; new requirements get a new feature directory rather than mutating a completed one. This keeps `docs/requirements/`, `docs/analysis and design/`, and `docs/test/` meaningful as durable per-feature records instead of colliding with Spec Kit's own output.
- The **constitution** (`.specify/memory/constitution.md`, authored via `/speckit-constitution`) is separate from this file: it states product/process principles the spec must hold to, while `CLAUDE.md`/`.claude/rules/` govern how Claude Code behaves in this repo. Keep the two distinct — don't duplicate content between them.
- The constitution has not been authored yet (still the unfilled template) — run `/speckit-constitution` before relying on it.

## Conventions

- Follow the rules in `.claude/rules/` (code style, testing, API conventions) for all code changes.
- Keep backend and frontend concerns separated under their respective `src/` folders.
- New Django apps go under `src/backend/`, get added to `INSTALLED_APPS` in `config/settings.py`, and get their own `urls.py` included from `config/urls.py`.
- Place new documentation in the matching `docs/` subfolder rather than at the repo root.
- Real secrets/config go in `.env` (gitignored) — never commit `.env`, only `.env.example` updates when new variables are introduced.

## Notes for Claude

- This file is committed and shared with the team — keep it accurate as the project evolves.
- Personal preferences that shouldn't be shared go in `CLAUDE.local.md` (gitignored) instead.
- When conventions here go stale (framework changes, new tooling), update this file as part of the same change.

## Karpathy Skills

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

Source: https://github.com/forrestchang/andrej-karpathy-skills
