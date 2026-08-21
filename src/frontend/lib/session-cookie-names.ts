// Plain string constants, no dependencies — safe to import from both
// lib/auth-tokens.ts (client/server components) and middleware.ts (Edge
// runtime, which must not pull in universal-cookie's browser-oriented code).
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const ROLE_COOKIE = 'session_role';
export const USERNAME_COOKIE = 'session_username';
