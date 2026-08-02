# SE-project

A simple project.

## Stack

- **Backend**: Django + Django REST Framework (`src/backend/`), Python 3.12, PostgreSQL
- **Frontend**: Next.js 14 / React 18 (`src/frontend/`), TypeScript, Tailwind CSS
- Everything runs via **Docker Compose** — there is no non-Docker local dev path.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

## Getting started

```bash
cp .env.example .env        # first time only — adjust values if needed
docker compose up --build
```

This builds and starts three services:

| Service    | URL                             | Notes                          |
|------------|----------------------------------|---------------------------------|
| `frontend` | http://localhost:3000            | Next.js dev server, hot reload  |
| `backend`  | http://localhost:8000            | Health check: `/api/health/`, admin: `/admin/` |
| `db`       | localhost:5432                   | PostgreSQL, credentials from `.env` |

Migrations run automatically when the backend container starts (see `src/backend/entrypoint.sh`).

## Common commands

```bash
docker compose up -d              # start in the background
docker compose down                # stop
docker compose down -v             # stop and wipe the Postgres volume

docker compose logs -f backend     # tail logs for one service
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec frontend npm run lint
```

## Project structure

```
src/backend/    Django + DRF project (config/ settings, core/ first app)
src/frontend/   Next.js app
docs/           design, requirements, management, and test docs
docker-compose.yml, .env.example   orchestration for backend, frontend, and Postgres
```

See `CLAUDE.md` for more detail on conventions and repo layout.

## Troubleshooting

- **Backend container restarts in a loop with `entrypoint.sh: ... Illegal option -`**: your local checkout converted `src/backend/entrypoint.sh` to Windows (CRLF) line endings, which breaks `/bin/sh` inside the Linux container. The repo's `.gitattributes` forces this file to LF — re-checkout it with `git checkout -- src/backend/entrypoint.sh` and rebuild.
