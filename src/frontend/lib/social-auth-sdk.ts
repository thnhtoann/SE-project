// Thin wrappers around the Google Identity Services and Facebook JS SDKs —
// both are loaded lazily (only once a social login button is actually
// clicked) since most sessions never touch them.

interface GoogleTokenResponse {
    access_token?: string;
    error?: string;
}

interface GoogleTokenClient {
    requestAccessToken: () => void;
}

interface FacebookAuthResponse {
    authResponse: { accessToken: string } | null;
    status: 'connected' | 'not_authorized' | 'unknown';
}

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: GoogleTokenResponse) => void;
                        error_callback?: (error: { type: string }) => void;
                    }) => GoogleTokenClient;
                };
            };
        };
        FB?: {
            init: (config: { appId: string; xfbml: boolean; version: string }) => void;
            login: (callback: (response: FacebookAuthResponse) => void, options?: { scope?: string }) => void;
        };
        fbAsyncInit?: () => void;
    }
}

const loadedScripts = new Set<string>();

const loadScript = (src: string): Promise<void> => {
    if (loadedScripts.has(src)) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            loadedScripts.add(src);
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            loadedScripts.add(src);
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
};

// Opens Google's account picker popup and resolves with an OAuth access
// token (verified server-side against GOOGLE_OAUTH_CLIENT_ID in core/views.py).
export const requestGoogleAccessToken = async (clientId: string): Promise<string> => {
    await loadScript('https://accounts.google.com/gsi/client');
    if (!window.google) throw new Error('google_sdk_unavailable');

    return new Promise<string>((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'openid email profile',
            callback: (response) => {
                if (response.access_token) resolve(response.access_token);
                else reject(new Error(response.error || 'google_login_failed'));
            },
            error_callback: (error) => reject(new Error(error.type || 'google_login_failed')),
        });
        client.requestAccessToken();
    });
};

// Opens Facebook's login popup and resolves with an access token (verified
// server-side against FACEBOOK_APP_ID/SECRET in core/views.py).
export const requestFacebookAccessToken = async (appId: string): Promise<string> => {
    await loadScript('https://connect.facebook.net/en_US/sdk.js');

    return new Promise<string>((resolve, reject) => {
        const init = () => {
            window.FB!.init({ appId, xfbml: false, version: 'v19.0' });
            window.FB!.login((response) => {
                if (response.status === 'connected' && response.authResponse) {
                    resolve(response.authResponse.accessToken);
                } else {
                    reject(new Error('facebook_login_cancelled'));
                }
            }, { scope: 'public_profile,email' });
        };

        if (window.FB) {
            init();
        } else {
            window.fbAsyncInit = init;
        }
    });
};
