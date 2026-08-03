---
name: next-page-scaffolder
description: Scaffolds a new page/route in the Next.js 14 App Router frontend (src/frontend/app/), correctly placed in the (auth) or (defaults) route group with TypeScript typing. Use when the user asks to add a new page, screen, or route to the frontend.
---

# Next.js page scaffolder

Frontend is Next.js 14 (App Router) + React 18 + TypeScript, Tailwind CSS (`src/frontend/`, the Vristo template).

Steps for a new route:

1. Decide the route group: `app/(auth)/` for login/register/password-reset style pages (uses `app/(auth)/layout.tsx`), `app/(defaults)/` for everything inside the authenticated dashboard shell (uses `app/(defaults)/layout.tsx`).
2. Create `app/(group)/<route>/page.tsx` as a typed React functional component (default export), following the existing `app/(defaults)/page.tsx` pattern.
3. Style with Tailwind utility classes only — no ad-hoc CSS files. Reuse existing `components/` (e.g. `components/layouts/*`, `components/icon/*`) instead of duplicating markup.
4. If the page needs global state, use a Redux slice (see the `redux-slice-generator` skill) rather than local-only state for anything shared across pages.
5. If the page adds a sidebar entry, also update `components/layouts/sidebar.tsx` and add/reuse an icon in `components/icon/menu/`.
6. Run `npm run lint` (ESLint + Prettier w/ `prettier-plugin-tailwindcss`, already configured) before considering the page done.
