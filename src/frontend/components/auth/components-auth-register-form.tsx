'use client';
import IconLockDots from '@/components/icon/icon-lock-dots';
import IconMail from '@/components/icon/icon-mail';
import IconUser from '@/components/icon/icon-user';
import { getTranslation } from '@/i18n';
import React from 'react';

// No backend endpoint exists for self-service registration — staff accounts
// are created via the Staff API/admin. Form is disabled rather than faking
// a working submit.
const ComponentsAuthRegisterForm = () => {
    const { t } = getTranslation();

    return (
        <form className="space-y-5 dark:text-white" onSubmit={(e) => e.preventDefault()}>
            <div>
                <label htmlFor="Name">{t('name')}</label>
                <div className="relative text-white-dark">
                    <input id="Name" type="text" placeholder={t('enter_name')} className="form-input ps-10 placeholder:text-white-dark" disabled />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconUser fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label htmlFor="Email">{t('email')}</label>
                <div className="relative text-white-dark">
                    <input id="Email" type="email" placeholder={t('enter_email')} className="form-input ps-10 placeholder:text-white-dark" disabled />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>
            <div>
                <label htmlFor="Password">{t('password')}</label>
                <div className="relative text-white-dark">
                    <input id="Password" type="password" placeholder={t('enter_password')} className="form-input ps-10 placeholder:text-white-dark" disabled />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconLockDots fill={true} />
                    </span>
                </div>
            </div>
            <p className="text-white-dark">{t('feature_not_available_yet')}</p>
            <button type="submit" disabled className="btn btn-gradient !mt-6 w-full cursor-not-allowed border-0 uppercase opacity-60 shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                {t('sign_up')}
            </button>
        </form>
    );
};

export default ComponentsAuthRegisterForm;
