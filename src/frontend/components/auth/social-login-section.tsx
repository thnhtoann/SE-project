'use client';
import IconFacebookCircle from '@/components/icon/icon-facebook-circle';
import IconGoogle from '@/components/icon/icon-google';
import IconInstagram from '@/components/icon/icon-instagram';
import IconTwitter from '@/components/icon/icon-twitter';
import { getTranslation } from '@/i18n';
import { requestFacebookAccessToken, requestGoogleAccessToken } from '@/lib/social-auth-sdk';
import { loginWithFacebook, loginWithGoogle } from '@/store/sessionSlice';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

const gradientButtonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-full p-0 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60';
const gradientStyle = { background: 'linear-gradient(135deg, rgba(239, 18, 98, 1) 0%, rgba(67, 97, 238, 1) 100%)' };

const SocialLoginSection = () => {
    const { t } = getTranslation();
    const dispatch = useDispatch<any>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [pending, setPending] = useState<'google' | 'facebook' | null>(null);
    const [error, setError] = useState('');

    // Thunks already run their errors through sessionSlice's parseError, so
    // the rejected payload is a translated { message, code } — no re-parsing needed here.
    const rejectionMessage = (payload: unknown, fallbackKey: string): string => {
        const parsed = payload as { message?: string } | undefined;
        return parsed?.message ?? t(fallbackKey);
    };

    const finishLogin = () => {
        router.push(searchParams.get('redirect') || '/');
    };

    const handleGoogle = async () => {
        setError('');
        if (!GOOGLE_CLIENT_ID) {
            setError(t('error_oauth_not_configured'));
            return;
        }
        setPending('google');
        try {
            const accessToken = await requestGoogleAccessToken(GOOGLE_CLIENT_ID);
            const result = await dispatch(loginWithGoogle(accessToken));
            if (loginWithGoogle.fulfilled.match(result)) {
                finishLogin();
            } else {
                setError(rejectionMessage(result.payload, 'error_google_login_failed'));
            }
        } catch {
            // User closed the popup or the SDK failed to load — not worth a scary error message.
        } finally {
            setPending(null);
        }
    };

    const handleFacebook = async () => {
        setError('');
        if (!FACEBOOK_APP_ID) {
            setError(t('error_oauth_not_configured'));
            return;
        }
        setPending('facebook');
        try {
            const accessToken = await requestFacebookAccessToken(FACEBOOK_APP_ID);
            const result = await dispatch(loginWithFacebook(accessToken));
            if (loginWithFacebook.fulfilled.match(result)) {
                finishLogin();
            } else {
                setError(rejectionMessage(result.payload, 'error_facebook_login_failed'));
            }
        } catch {
            // User closed the popup or the SDK failed to load — not worth a scary error message.
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="mb-10 md:mb-[60px]">
            <ul className="flex justify-center gap-3.5 text-white">
                <li>
                    <Link href="#" className={gradientButtonClass} style={gradientStyle}>
                        <IconInstagram />
                    </Link>
                </li>
                <li>
                    <button type="button" aria-label={t('sign_in_with_facebook')} disabled={pending !== null} onClick={handleFacebook} className={gradientButtonClass} style={gradientStyle}>
                        <IconFacebookCircle />
                    </button>
                </li>
                <li>
                    <Link href="#" className={gradientButtonClass} style={gradientStyle}>
                        <IconTwitter fill={true} />
                    </Link>
                </li>
                <li>
                    <button type="button" aria-label={t('sign_in_with_google')} disabled={pending !== null} onClick={handleGoogle} className={gradientButtonClass} style={gradientStyle}>
                        <IconGoogle />
                    </button>
                </li>
            </ul>
            {error && <p className="mt-3 text-center text-xs text-danger">{error}</p>}
        </div>
    );
};

export default SocialLoginSection;
