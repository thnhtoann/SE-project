---
name: redux-slice-generator
description: Scaffolds a new Redux Toolkit slice for the Next.js frontend, following the existing store/themeConfigSlice.tsx pattern, and wires it into store/index.tsx. Use when the user asks to add frontend global/shared state.
---

# Redux slice generator

State management is Redux Toolkit (`@reduxjs/toolkit` + `react-redux`), with the store at `src/frontend/store/`.

Steps for a new slice `<name>Slice`:

1. Create `store/<name>Slice.tsx` using `createSlice`, mirroring the shape of `store/themeConfigSlice.tsx` (initial state, reducers, exported actions).
2. Register the reducer in `store/index.tsx`'s `configureStore` call.
3. In components, read state with the typed `useSelector`/`useDispatch` hooks already used elsewhere in the codebase — don't introduce a second state library or React Context for the same data.
4. Keep slice state serializable (no class instances, functions, or DOM refs) — Redux Toolkit's default middleware will warn/error otherwise.
