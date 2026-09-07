import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from '@/lib/auth-tokens';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// These don't take/need an access token yet, so never attach one or try to
// refresh on their 401s (that would loop).
const UNAUTHENTICATED_PATHS = [
    '/login/request-otp/',
    '/login/verify-otp/',
    '/token/refresh/',
    '/register/request-otp/',
    '/register/verify-otp/',
    '/password-reset/request-otp/',
    '/password-reset/verify-otp/',
    '/auth/google/',
    '/auth/facebook/',
];

export class ApiError extends Error {
    status: number;
    // Raw DRF error body — {field: [messages]} or {error: "..."} or {detail: "..."}.
    // Callers map this directly rather than this file inventing its own shape,
    // per this repo's api-conventions.md ("don't hand-roll ad-hoc error shapes").
    body: unknown;

    constructor(status: number, body: unknown) {
        super(typeof body === 'object' && body !== null && 'detail' in body ? String((body as { detail: unknown }).detail) : `Request failed with status ${status}`);
        this.status = status;
        this.body = body;
    }
}

const isUnauthenticatedPath = (path: string): boolean => UNAUTHENTICATED_PATHS.some((p) => path.startsWith(p));

const parseBody = async (response: Response): Promise<unknown> => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
    // Coalesce concurrent 401s into a single refresh call rather than firing
    // one refresh request per failed request.
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const refresh = getRefreshToken();
        if (!refresh) return null;

        const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (!response.ok) return null;

        const body = (await parseBody(response)) as { access?: string } | null;
        if (!body?.access) return null;

        setAccessToken(body.access);
        return body.access;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
};

const redirectToLogin = (): void => {
    clearTokens();
    if (typeof window !== 'undefined') {
        window.location.assign('/login');
    }
};

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
}

export const apiFetch = async <T>(path: string, options: ApiFetchOptions = {}): Promise<T> => {
    const { body, headers, ...rest } = options;
    const authenticated = !isUnauthenticatedPath(path);

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    const doFetch = async (): Promise<Response> => {
        const requestHeaders: Record<string, string> = {
            // Omit Content-Type for FormData — the browser must set it itself
            // (multipart/form-data with the correct boundary).
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(headers as Record<string, string> | undefined),
        };

        if (authenticated) {
            const access = getAccessToken();
            if (access) requestHeaders['Authorization'] = `Bearer ${access}`;
        }

        return fetch(`${API_BASE_URL}${path}`, {
            ...rest,
            headers: requestHeaders,
            body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
        });
    };

    let response = await doFetch();

    if (response.status === 401 && authenticated) {
        const newAccess = await refreshAccessToken();
        if (!newAccess) {
            redirectToLogin();
            throw new ApiError(401, { detail: 'Session expired' });
        }
        response = await doFetch();
    }

    if (!response.ok) {
        const parsedBody = await parseBody(response);
        throw new ApiError(response.status, parsedBody);
    }

    if (response.status === 204) return undefined as T;
    return (await parseBody(response)) as T;
};
