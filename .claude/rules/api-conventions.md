# API conventions

<<<<<<< HEAD
Placeholder — define once the backend API surface exists.

Once established, document here:
- Endpoint naming/versioning conventions
- Request/response payload conventions (casing, error shape)
- Auth conventions
=======
- All backend endpoints are namespaced under `/api/` (see `src/backend/config/urls.py`), implemented as Django REST Framework views/viewsets in the relevant app's `views.py` + `urls.py`, mirroring `core/`.
- URL paths: lowercase, hyphen-free, trailing slash (Django default), plural nouns for collections (e.g. `/api/widgets/`, `/api/widgets/<id>/`).
- Request/response bodies: JSON, camelCase is NOT converted — DRF defaults to whatever field names the serializer declares; keep serializer field names in snake_case to match Python/Django convention unless the frontend team asks for camelCase.
- Errors: rely on DRF's default exception handling (4xx/5xx with a JSON body); don't hand-roll ad-hoc error shapes.
- Auth: not yet implemented — `REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES']` is currently `AllowAny` in `config/settings.py`. Tighten this and add an auth scheme (e.g. session or JWT via `djangorestframework-simplejwt`) before any endpoint handles real user data.
- CORS: allowed origins are controlled via the `CORS_ALLOWED_ORIGINS` env var (see `.env.example`), consumed by `django-cors-headers`.
>>>>>>> c53e6e32e5f3ea2873a9007e7a141407828084f9
