---
name: django-app-scaffolder
description: Scaffolds a new Django app under src/backend/ following this project's conventions (mirrors the core/ app), wires it into INSTALLED_APPS and the root URLconf. Use when the user asks to add a new Django app, module, or domain (e.g. "add a users app", "create an orders app").
---

# Django app scaffolder

This project's backend is Django + DRF (`src/backend/`), with one existing app: `core/` (currently just `/api/health/`).

When scaffolding a new app `<name>`:

1. Run `docker compose exec backend python manage.py startapp <name>` (or hand-create the same layout if Docker isn't running) so it lands under `src/backend/<name>/`.
2. Give it `models.py`, `views.py`, `serializers.py`, `urls.py` — mirror `core/`'s structure even if some files start empty.
3. Register it in `src/backend/config/settings.py` → `INSTALLED_APPS` (append after `'core'`).
4. Include its URLs in `src/backend/config/urls.py`:
   ```python
   path('api/', include('<name>.urls')),
   ```
   Keep every app's URLs nested under `/api/` per `.claude/rules/api-conventions.md`.
5. If it needs models, remind the user to run:
   ```
   docker compose exec backend python manage.py makemigrations
   docker compose exec backend python manage.py migrate
   ```
6. Follow `.claude/rules/code-style.md` (PEP 8, snake_case) and add a matching test file per `.claude/rules/testing.md`.
