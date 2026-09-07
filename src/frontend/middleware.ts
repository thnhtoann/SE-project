import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, ROLE_COOKIE } from '@/lib/session-cookie-names';

// The "Admin Portal" sidebar section (see components/layouts/sidebar.tsx) --
// a Cashier's job is running the POS, not managing staff/inventory/
// suppliers/customers/transactions/reports. Most of these already 403 for a
// Cashier at the API level (IsStoreManager/IsChainManager on Staff/Customer/
// Supplier/dashboard endpoints); this is a UI-level block on top, product
// policy rather than following an existing gap, so a Cashier never lands on
// a page meant for a different role. "/pos" (not "/") is the redirect
// target since that's the one screen this role is actually meant to use.
const ADMIN_PORTAL_PREFIXES = ['/dashboards', '/staff', '/inventory', '/procurement', '/customers', '/transactions'];

// Presence-only auth gate: middleware runs on the Edge runtime with no access
// to the Django SIMPLE_JWT signing key and no /api/me/ to call, so it cannot
// verify the token — it only checks whether one exists. Real authorization
// stays with DRF's permission classes on every request; an expired-but-
// present cookie is caught downstream by the API client's 401->refresh path
// (see lib/api-client.ts), not here. The role check below is coarser still
// (just a role NAME in a plain cookie, trivially spoofable) — it's a UX
// convenience to avoid a broken page, not a security boundary; that boundary
// is, again, the backend permission classes.
export function middleware(request: NextRequest) {
    const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);

    if (request.nextUrl.pathname === '/login') {
        // Already have a session — skip the login form and go straight in.
        return hasAccessToken ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
    }

    if (!hasAccessToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    const role = request.cookies.get(ROLE_COOKIE)?.value;
    if (role === 'Cashier' && ADMIN_PORTAL_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
        return NextResponse.redirect(new URL('/pos', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!register|reset-password|_next/static|_next/image|assets|favicon.ico).*)'],
};
