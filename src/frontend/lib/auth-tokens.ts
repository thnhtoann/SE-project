import Cookies from 'universal-cookie';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, ROLE_COOKIE, USERNAME_COOKIE, DEVICE_TOKEN_COOKIE } from '@/lib/session-cookie-names';

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, ROLE_COOKIE, USERNAME_COOKIE, DEVICE_TOKEN_COOKIE };

// Not httpOnly: the Django backend is header-based JWT only and never sets
// these cookies itself, so the frontend must write them after login. They
// also need to be readable by middleware.ts (Edge runtime, no localStorage).

// Matches SIMPLE_JWT's ACCESS_TOKEN_LIFETIME (4h) / default refresh lifetime (1d)
const ACCESS_TOKEN_MAX_AGE_SECONDS = 4 * 60 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60;
// Matches REMEMBER_ME_REFRESH_LIFETIME / TRUSTED_DEVICE_TTL_SECONDS in core/views.py.
const REMEMBER_ME_REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const DEVICE_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const cookies = new Cookies();

const cookieOptions = (maxAge: number) => ({
    path: '/',
    maxAge,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
});

export interface SessionTokens {
    access: string;
    refresh: string;
    role: string;
    username: string;
    // Whether this login requested a 30-day refresh token (vs. the default
    // 1-day one) — controls how long the refresh/role/username cookies stick
    // around so they don't get dropped before the token itself expires.
    rememberMe?: boolean;
}

export const setTokens = ({ access, refresh, role, username, rememberMe }: SessionTokens): void => {
    const refreshMaxAge = rememberMe ? REMEMBER_ME_REFRESH_MAX_AGE_SECONDS : REFRESH_TOKEN_MAX_AGE_SECONDS;
    cookies.set(ACCESS_TOKEN_COOKIE, access, cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
    cookies.set(REFRESH_TOKEN_COOKIE, refresh, cookieOptions(refreshMaxAge));
    cookies.set(ROLE_COOKIE, role, cookieOptions(refreshMaxAge));
    cookies.set(USERNAME_COOKIE, username, cookieOptions(refreshMaxAge));
};

export const setAccessToken = (access: string): void => {
    cookies.set(ACCESS_TOKEN_COOKIE, access, cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
};

export const getAccessToken = (): string | undefined => cookies.get(ACCESS_TOKEN_COOKIE);
export const getRefreshToken = (): string | undefined => cookies.get(REFRESH_TOKEN_COOKIE);
export const getSessionRole = (): string | undefined => cookies.get(ROLE_COOKIE);
export const getSessionUsername = (): string | undefined => cookies.get(USERNAME_COOKIE);

export const clearTokens = (): void => {
    cookies.remove(ACCESS_TOKEN_COOKIE, { path: '/' });
    cookies.remove(REFRESH_TOKEN_COOKIE, { path: '/' });
    cookies.remove(ROLE_COOKIE, { path: '/' });
    cookies.remove(USERNAME_COOKIE, { path: '/' });
};

// Device-trust token: kept separate from the session cookies above and never
// cleared by clearTokens()/logout — logging out should not un-trust the
// browser, so the next login from it can still skip the OTP step.
export const getDeviceToken = (): string | undefined => cookies.get(DEVICE_TOKEN_COOKIE);
export const setDeviceToken = (token: string): void => cookies.set(DEVICE_TOKEN_COOKIE, token, cookieOptions(DEVICE_TOKEN_MAX_AGE_SECONDS));
export const clearDeviceToken = (): void => cookies.remove(DEVICE_TOKEN_COOKIE, { path: '/' });
