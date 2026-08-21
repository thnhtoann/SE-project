'use client';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import { requestOtp, resetToCredentials, verifyOtp } from '@/store/sessionSlice';
import { IRootState } from '@/store';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const ComponentsAuthLoginForm = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch<any>();
    const { step, status, error } = useSelector((state: IRootState) => state.session);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');

    const submitCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        await dispatch(requestOtp({ username, password, email }));
    };

    const submitOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await dispatch(verifyOtp({ username, otp }));
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
                            placeholder={t('enter_otp_code')}
                            className="form-input ps-10 placeholder:text-white-dark"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                        <span className="absolute start-4 top-1/2 -translate-y-1/2">
                            <IconLockDots fill={true} />
                        </span>
                    </div>
                </div>
                {error && <p className="text-danger">{error}</p>}
                <button type="submit" disabled={status === 'loading'} className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                    {t('verify_otp')}
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
                <label htmlFor="Username">{t('username')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Username"
                        type="text"
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
                <label htmlFor="Email">{t('email')}</label>
                <div className="relative text-white-dark">
                    <input
                        id="Email"
                        type="email"
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
                        type="password"
                        placeholder={t('enter_password')}
                        className="form-input ps-10 placeholder:text-white-dark"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>
            {error && <p className="text-danger">{error}</p>}
            <button type="submit" disabled={status === 'loading'} className="btn btn-gradient !mt-6 w-full border-0 uppercase shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                {t('sign_in')}
            </button>
        </form>
    );
};

export default ComponentsAuthLoginForm;
