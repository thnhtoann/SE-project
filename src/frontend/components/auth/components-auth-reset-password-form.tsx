'use client';
import IconEye from '@/components/icon/icon-eye';
import IconEyeOff from '@/components/icon/icon-eye-off';
import IconLockDots from '@/components/icon/icon-lock-dots';
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

const KNOWN_ERROR_CODES = ['missing_identifier', 'otp_missing', 'otp_invalid', 'otp_locked', 'invalid_request'];

const ComponentsAuthResetPasswordForm = () => {
    const { t } = getTranslation();

    const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
            await apiFetch('/password-reset/request-otp/', {
                method: 'POST',
                body: { identifier },
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

    const submitIdentifier = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!identifier) {
            setError(t('error_identifier_required'));
            return;
        }
        await requestOtp();
    };

    const submitReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isOtpExpired) return;
        setError('');

        if (!newPassword) {
            setError(t('error_password_required'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('error_password_mismatch'));
            return;
        }

        setSubmitting(true);
        try {
            await apiFetch('/password-reset/verify-otp/', {
                method: 'POST',
                body: { identifier, otp, new_password: newPassword },
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
                <h5 className="mb-2 text-lg font-semibold text-success">{t('reset_password_success_title')}</h5>
                <p className="text-white-dark">{t('reset_password_success_message')}</p>
                <Link href="/login" className="btn btn-primary mt-6">
                    {t('back_to_login')}
                </Link>
            </div>
        );
    }

    if (step === 'otp') {
        return (
            <form className="space-y-5 dark:text-white" onSubmit={submitReset}>
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
                <div>
                    <label htmlFor="NewPassword">{t('new_password')}</label>
                    <div className="relative text-white-dark">
                        <input
                            id="NewPassword"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder={t('enter_password')}
                            className="form-input ps-10 pe-10 placeholder:text-white-dark"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
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
                    disabled={submitting || isOtpExpired}
                    className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {t('reset_password')}
                </button>
                <button
                    type="button"
                    disabled={submitting}
                    className="w-full text-center text-primary underline disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={requestOtp}
                >
                    {t('resend_code')}
                </button>
                <button type="button" className="w-full text-center text-white-dark underline" onClick={() => setStep('identifier')}>
                    {t('edit_details')}
                </button>
            </form>
        );
    }

    return (
        <form className="space-y-5" onSubmit={submitIdentifier}>
            <div>
                <label htmlFor="Identifier" className="dark:text-white">
                    {t('username_or_email')}
                </label>
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
            {error && <p className="text-danger">{error}</p>}
            <button
                type="submit"
                disabled={submitting}
                className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {t('send_reset_link')}
            </button>
        </form>
    );
};

export default ComponentsAuthResetPasswordForm;
