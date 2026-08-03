---
name: django-test-writer
description: Writes Django/DRF tests for backend code (models, views, serializers) using Django's built-in test runner, per this project's testing conventions. Use when the user asks to add tests, or after scaffolding a new app/endpoint.
---

# Django test writer

This project uses Django's built-in test runner (no pytest configured). Tests run via:

```
docker compose exec backend python manage.py test
```

Conventions:

- Put tests in each app's `tests.py` (or a `tests/` package for larger apps), not a top-level test directory.
- Use `django.test.TestCase` for anything touching the DB, and DRF's `APITestCase` / `APIClient` for endpoint tests.
- For a new endpoint, at minimum cover: happy path (200/201 + expected payload shape), and one failure case (400/404) — match the error shape DRF produces by default, per `.claude/rules/api-conventions.md`.
- No coverage threshold is enforced yet, but every new app/endpoint should ship with at least one test.
