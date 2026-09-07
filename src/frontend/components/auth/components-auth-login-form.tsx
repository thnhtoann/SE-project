'use client';
import IconEye from '@/components/icon/icon-eye';
import IconEyeOff from '@/components/icon/icon-eye-off';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import { requestOtp, resetToCredentials, verifyOtp } from '@/store/sessionSlice';
import { IRootState } from '@/store';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const OTP_VALIDITY_MS = 5 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const formatCountdown = (remainingMs: number): string => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const ComponentsAuthLoginForm = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch<any>();
    const { step, status, error, errorCode, username } = useSelector((state: IRootState) => state.session);

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
    const [lockedUntil, setLockedUntil] = useState<number | null>(null);
    const [, setClockTick] = useState(0);

    // Drives the OTP-expiry and lockout countdown displays below.
    useEffect(() => {
        const interval = setInterval(() => setClockTick((tick) => tick + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // First time the server reports the account as locked, start a local
    // countdown so the button stays disabled until the lock plausibly lifts.
    useEffect(() => {
        if (errorCode === 'account_locked' && lockedUntil === null) {
            setLockedUntil(Date.now() + LOCKOUT_MS);
        }
    }, [errorCode, lockedUntil]);

    const now = Date.now();
    const isLocked = lockedUntil !== null && now < lockedUntil;
    const isOtpExpired = otpExpiresAt !== null && now >= otpExpiresAt;

    const submitCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLocked) return;
        const result = await dispatch(requestOtp({ identifier, password, remember_me: rememberMe }));
        if (requestOtp.fulfilled.match(result)) {
            if (result.payload.trustedDevice) {
                router.push(searchParams.get('redirect') || '/');
                return;
            }
            setOtp('');
            setOtpExpiresAt(Date.now() + OTP_VALIDITY_MS);
        }
    };

    const resendOtp = async () => {
        const result = await dispatch(requestOtp({ identifier, password, remember_me: rememberMe }));
        if (requestOtp.fulfilled.match(result) && !result.payload.trustedDevice) {
            setOtp('');
            setOtpExpiresAt(Date.now() + OTP_VALIDITY_MS);
        }
    };

    const submitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isOtpExpired) return;
        const result = await dispatch(verifyOtp({ username: username ?? identifier, otp, remember_me: rememberMe }));
        if (verifyOtp.fulfilled.match(result)) {
            router.push(searchParams.get('redirect') || '/');
        }
    };

    if (step === 'otp') {
        return (
            <form className="space-y-5 dark:text-white" onSubmit={submitOtp}>
                <p className="text-white-dark">{t('otp_sent_notice')}</p>
                <div>
                    <label htmlFor="Otp">{t('otp_code')}</label>
                    <div className="relative text-white-dark">
                        <input
                            id="Otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            autoFocus
                            placeholder={t('enter_otp_code')}
                            className="form-input ps-10 placeholder:text-white-dark"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                        />
                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
                            <IconLockDots fill={true} />
                        </span>
                    </div>
                    <p className={`mt-1 text-xs ${isOtpExpired ? 'text-danger' : 'text-white-dark'}`}>
                        {isOtpExpired ? t('otp_expired') : t('otp_expires_in').replace('{time}', formatCountdown(otpExpiresAt! - now))}
                    </p>
                </div>
                {error && <p className="text-danger">{error}</p>}
                <button
                    type="submit"
                    disabled={status === 'loading' || isOtpExpired}
                    className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {t('verify_otp')}
                </button>
                <button
                    type="button"
                    disabled={status === 'loading'}
                    className="w-full text-center text-primary underline disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={resendOtp}
                >
                    {t('resend_code')}
                </button>
                <button type="button" className="w-full text-center text-white-dark underline" onClick={() => dispatch(resetToCredentials())}>
                    {t('back_to_login')}
                </button>
            </form>
        );
    }

    return (
        <form className="space-y-5 dark:text-white" onSubmit={submitCredentials}>
            <div>
                <label htmlFor="Identifier">{t('username_or_email')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Identifier"
                        type="text"
                        autoComplete="username"
                        autoFocus
                        placeholder={t('enter_username_or_email')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconUser fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label htmlFor="Password">{t('password')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder={t('enter_password')}
                        className="form-input ps-10 pe-10 placeholder:text-white-dark"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                    <button
                        type="button"
                        className="absolute end-4 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('hide_password') : t('show_password')}
                    >
                        {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center">
                    <input type="checkbox" className="form-checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span className="text-white-dark ltr:ml-2 rtl:mr-2">{t('remember_me')}</span>
                </label>
                <Link href="/reset-password" className="text-primary underline">
                    {t('forgot_password')}
                </Link>
            </div>
            {error && <p className="text-danger">{error}</p>}
            {isLocked && <p className="text-danger">{t('retry_in').replace('{time}', formatCountdown(lockedUntil! - now))}</p>}
            <button
                type="submit"
                disabled={status === 'loading' || isLocked}
                className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {t('sign_in')}
            </button>
        </form>
    );
};

export default ComponentsAuthLoginForm;
