# Testing

<<<<<<< HEAD
Placeholder — no test framework is set up yet.

Once established, document here:
- How to run the test suite (command)
- Minimum coverage expectations for new code
- Where test plans/reports live (`docs/test/`)
=======
- Backend: Django's built-in test runner. Once tests exist, run via:
  ```
  docker compose exec backend python manage.py test
  ```
- Frontend: no test runner configured yet — add one (e.g. Jest/React Testing Library) when frontend tests are needed, and document the run command here.
- No minimum coverage threshold is enforced yet.
- Test plans/reports live in `docs/test/`.
>>>>>>> c53e6e32e5f3ea2873a9007e7a141407828084f9
