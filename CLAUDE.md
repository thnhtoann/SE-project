# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

<<<<<<< HEAD
This is a Software Engineering course project in its initial scaffolding stage: `src/backend/`, `src/frontend/`, and every `docs/` subfolder currently contain only a `.gitkeep` placeholder — no backend/frontend framework, package manifest, build tooling, linter, or test runner has been chosen yet. There is no build, lint, or test command to run.

When the stack is chosen and real code/tooling is added, update this file (and the placeholder rules below) with the actual commands — don't invent commands that don't exist yet.

## Structure

- `src/backend/` — backend service code (empty)
- `src/frontend/` — frontend app code (empty)
=======
Stack is chosen and scaffolded:

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
>>>>>>> c53e6e32e5f3ea2873a9007e7a141407828084f9
- `docs/analysis and design/` — design docs, diagrams
- `docs/management/` — project/process management artifacts
- `docs/requirements/` — requirements docs
- `docs/test/` — test plans and reports
<<<<<<< HEAD
- `.claude/rules/` — coding standards, auto-loaded: `code-style.md`, `api-conventions.md`, `testing.md` (all currently placeholders pending stack choice)
=======
- `.claude/rules/` — coding standards, auto-loaded: `code-style.md`, `api-conventions.md`, `testing.md`
>>>>>>> c53e6e32e5f3ea2873a9007e7a141407828084f9
- `.claude/commands/` — custom slash commands: `/review` (review pending diff against project conventions), `/fix-issue` (investigate + fix a described bug), `/deploy` (pre-deploy checklist; no pipeline configured yet)
- `.claude/agents/` — subagent personas: `code-reviewer` (style/correctness/test-coverage review), `security-auditor` (injection, auth, secrets, unsafe input handling)
- `.claude/skills/` — currently only `example-skill`, a placeholder template for a future auto-invoked workflow

## Conventions

<<<<<<< HEAD
- Follow the rules in `.claude/rules/` (code style, testing, API conventions) for all code changes — fill in the specific stack conventions there as soon as the stack is decided, rather than letting real practice diverge from the placeholders.
- Keep backend and frontend concerns separated under their respective `src/` folders.
- Place new documentation in the matching `docs/` subfolder rather than at the repo root.
=======
- Follow the rules in `.claude/rules/` (code style, testing, API conventions) for all code changes.
- Keep backend and frontend concerns separated under their respective `src/` folders.
- New Django apps go under `src/backend/`, get added to `INSTALLED_APPS` in `config/settings.py`, and get their own `urls.py` included from `config/urls.py`.
- Place new documentation in the matching `docs/` subfolder rather than at the repo root.
- Real secrets/config go in `.env` (gitignored) — never commit `.env`, only `.env.example` updates when new variables are introduced.
>>>>>>> c53e6e32e5f3ea2873a9007e7a141407828084f9

## Notes for Claude

- This file is committed and shared with the team — keep it accurate as the project evolves.
- Personal preferences that shouldn't be shared go in `CLAUDE.local.md` (gitignored) instead.
- When conventions here go stale (framework changes, new tooling), update this file as part of the same change.
