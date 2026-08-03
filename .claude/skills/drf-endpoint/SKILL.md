---
name: drf-endpoint
description: Adds a new DRF endpoint (serializer + view + URL) to an existing Django app, following this project's API conventions. Use when the user asks to add an API endpoint, resource, or route to the backend.
---

# DRF endpoint

Follow `.claude/rules/api-conventions.md`:

- URLs live under `/api/`, lowercase, hyphen-free, trailing slash, plural nouns for collections (e.g. `/api/widgets/`, `/api/widgets/<id>/`).
- Serializer field names stay snake_case (matching Python/Django convention) unless the frontend team has explicitly asked for camelCase.
- Auth is currently `AllowAny` (`REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES']` in `config/settings.py`) — flag to the user if the new endpoint handles real user data, since that needs tightening before it ships.
- Errors: rely on DRF's default exception handling — don't hand-roll error shapes.

Steps for a new endpoint on app `<app>`:

1. Add/extend `<app>/serializers.py` with a `ModelSerializer` or plain `Serializer`.
2. Add a view in `<app>/views.py` — prefer `APIView` (matches `core/views.py`'s `HealthCheckView`) for simple endpoints, or a DRF `ViewSet`/`GenericAPIView` for full CRUD on a model.
3. Wire it into `<app>/urls.py`, then confirm it's included from `config/urls.py` under `/api/`.
4. Write a test per `.claude/rules/testing.md` (`docker compose exec backend python manage.py test`).
