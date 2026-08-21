import Cookies from 'universal-cookie';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, ROLE_COOKIE, USERNAME_COOKIE } from '@/lib/session-cookie-names';

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, ROLE_COOKIE, USERNAME_COOKIE };

// Not httpOnly: the Django backend is header-based JWT only and never sets
// these cookies itself, so the frontend must write them after login. They
// also need to be readable by middleware.ts (Edge runtime, no localStorage).

// Matches SIMPLE_JWT's ACCESS_TOKEN_LIFETIME (4h) / default refresh lifetime (1d)
const ACCESS_TOKEN_MAX_AGE_SECONDS = 4 * 60 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60;

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
}

export const setTokens = ({ access, refresh, role, username }: SessionTokens): void => {
    cookies.set(ACCESS_TOKEN_COOKIE, access, cookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS));
    cookies.set(REFRESH_TOKEN_COOKIE, refresh, cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
    cookies.set(ROLE_COOKIE, role, cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
    cookies.set(USERNAME_COOKIE, username, cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
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
