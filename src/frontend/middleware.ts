import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/session-cookie-names';

// Presence-only gate: middleware runs on the Edge runtime with no access to
// the Django SIMPLE_JWT signing key and no /api/me/ to call, so it cannot
// verify the token — it only checks whether one exists. Real authorization
// stays with DRF's permission classes on every request; an expired-but-
// present cookie is caught downstream by the API client's 401->refresh path
// (see lib/api-client.ts), not here.
export function middleware(request: NextRequest) {
    const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);

    if (!hasAccessToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!login|register|reset-password|_next/static|_next/image|assets|favicon.ico).*)'],
};
