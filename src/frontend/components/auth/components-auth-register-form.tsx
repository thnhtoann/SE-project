'use client';
import IconEye from '@/components/icon/icon-eye';
import IconEyeOff from '@/components/icon/icon-eye-off';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import IconUser from '@/components/icon/icon-user';
import { apiFetch, ApiError } from '@/lib/api-client';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

const OTP_VALIDITY_MS = 5 * 60 * 1000;

const formatCountdown = (remainingMs: number): string => {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Known error_code values the backend returns for this flow — anything else
// falls back to the raw message/detail from the response body.
const KNOWN_ERROR_CODES = ['otp_missing', 'otp_invalid', 'otp_locked', 'invalid_request'];

const ComponentsAuthRegisterForm = () => {
    const { t } = getTranslation();

    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
    const [, setClockTick] = useState(0);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setClockTick((tick) => tick + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const now = Date.now();
    const isOtpExpired = otpExpiresAt !== null && now >= otpExpiresAt;

    const parseError = (err: unknown, fallbackKey: string): string => {
        if (err instanceof ApiError && err.body && typeof err.body === 'object') {
            const body = err.body as { error?: string; error_code?: string; detail?: string } & Record<string, unknown>;
            if (body.error_code && KNOWN_ERROR_CODES.includes(body.error_code)) {
                return t(`error_${body.error_code}`);
            }
            if (body.error) return body.error;
            if (body.detail) return body.detail;
            const firstFieldError = Object.values(body)[0];
            if (Array.isArray(firstFieldError)) return String(firstFieldError[0]);
        }
        return t(fallbackKey);
    };

    const requestOtp = async () => {
        setError('');
        setSubmitting(true);
        try {
            await apiFetch('/register/request-otp/', {
                method: 'POST',
                body: { username, full_name: fullName, email, password },
            });
            setOtp('');
            setOtpExpiresAt(Date.now() + OTP_VALIDITY_MS);
            setStep('otp');
        } catch (err) {
            setError(parseError(err, 'error_registering'));
        } finally {
            setSubmitting(false);
        }
    };

    const submitDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username) {
            setError(t('error_username_required'));
            return;
        }
        if (!fullName) {
            setError(t('error_full_name_required'));
            return;
        }
        if (!email) {
            setError(t('error_email_required'));
            return;
        }
        if (!password) {
            setError(t('error_password_required'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('error_password_mismatch'));
            return;
        }

        await requestOtp();
    };

    const submitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isOtpExpired) return;
        setError('');
        setSubmitting(true);
        try {
            await apiFetch('/register/verify-otp/', {
                method: 'POST',
                body: { email, otp },
            });
            setSuccess(true);
        } catch (err) {
            setError(parseError(err, 'error_registering'));
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="text-center">
                <h5 className="mb-2 text-lg font-semibold text-success">{t('register_success_title')}</h5>
                <p className="text-white-dark">{t('register_success_message')}</p>
                <Link href="/login" className="btn btn-primary mt-6">
                    {t('back_to_login')}
                </Link>
            </div>
        );
    }

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
                    disabled={submitting || isOtpExpired}
                    className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {t('verify_otp')}
                </button>
                <button
                    type="button"
                    disabled={submitting}
                    className="w-full text-center text-primary underline disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={requestOtp}
                >
                    {t('resend_code')}
                </button>
                <button type="button" className="w-full text-center text-white-dark underline" onClick={() => setStep('details')}>
                    {t('edit_details')}
                </button>
            </form>
        );
    }

    return (
        <form className="space-y-5 dark:text-white" onSubmit={submitDetails}>
            <div>
                <label htmlFor="Username">{t('username')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Username"
                        type="text"
                        autoComplete="username"
                        autoFocus
                        placeholder={t('enter_username')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconUser fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label htmlFor="Name">{t('name')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Name"
                        type="text"
                        placeholder={t('enter_name')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconUser fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label htmlFor="Email">{t('email')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Email"
                        type="email"
                        autoComplete="email"
                        placeholder={t('enter_email')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label htmlFor="Password">{t('password')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
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
            <div>
                <label htmlFor="ConfirmPassword">{t('confirm_password')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="ConfirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t('enter_confirm_password')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <button
                type="submit"
                disabled={submitting}
                className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {t('sign_up')}
            </button>
        </form>
    );
};

export default ComponentsAuthRegisterForm;
