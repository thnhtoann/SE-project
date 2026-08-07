# Commit messages

- Format: `<type>(<scope>): <summary>`, imperative mood, no trailing period, summary line ≤ 72 chars.
  - `type`: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build` (Docker/CI/deps).
  - `scope`: the app or area touched — `backend`, `frontend`, `db`, `docs`, or an app name once one exists (e.g. `orders`). Omit only when a change is truly repo-wide.
  - Examples: `feat(backend): add orders app with CRUD endpoints`, `fix(frontend): correct locale key for checkout button`.
- Body (optional, blank line after summary): explain *why*, not *what* — the diff already shows what changed. Wrap at ~72 chars.
- One logical change per commit. Don't bundle unrelated backend and frontend changes into a single commit.
- Reference issues/PRs in the body when relevant (e.g. `Refs #12`), not in the summary line.
