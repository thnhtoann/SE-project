# Testing

- Backend: Django's built-in test runner. Once tests exist, run via:
  ```
  docker compose exec backend python manage.py test
  ```
- Frontend: no test runner configured yet — add one (e.g. Jest/React Testing Library) when frontend tests are needed, and document the run command here.
- No minimum coverage threshold is enforced yet.
- Test plans/reports live in `docs/test/`.
