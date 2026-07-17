# Code style

<<<<<<< HEAD
Placeholder — fill in once the backend/frontend stack is chosen (`src/backend/` and `src/frontend/` are currently empty).

Suggested starting points once code exists:
- Formatter/linter to run before committing (e.g. Prettier/ESLint, Black/Ruff)
- Naming conventions for files, components, and functions
- Import ordering and module boundaries between `src/backend/` and `src/frontend/`
=======
## Backend (`src/backend/`, Django + DRF)

- Standard Django project layout: one app per bounded concern under `src/backend/`, each with its own `models.py`, `views.py`, `urls.py`, `migrations/`.
- Follow PEP 8; 4-space indentation, snake_case for functions/variables, PascalCase for classes.
- Settings/secrets come from environment variables via `os.environ.get(...)` in `config/settings.py` — never hardcode credentials or the secret key.
- No formatter/linter is wired in yet; if one is added (e.g. Black/Ruff), document the run command here.

## Frontend (`src/frontend/`, Next.js + TypeScript)

- ESLint (`.eslintrc.json`) and Prettier (`.prettierrc`) are already configured — run `npm run lint` before committing.
- Components in PascalCase files under `components/` and `app/`; follow the existing Vristo template structure for new pages/components.

## General

- Keep backend and frontend concerns separated under their respective `src/` folders.
- Import ordering / module boundaries: backend code never imports from `src/frontend/` or vice versa; integration happens only over the HTTP API.
>>>>>>> c53e6e32e5f3ea2873a9007e7a141407828084f9
