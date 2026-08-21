'use client';
import IconMail from '@/components/icon/icon-mail';
import { getTranslation } from '@/i18n';
import React from 'react';

// No backend endpoint exists for password reset — form is disabled rather
// than faking a working submit.
const ComponentsAuthResetPasswordForm = () => {
    const { t } = getTranslation();

    return (
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div>
                <label htmlFor="Email" className="dark:text-white">
                    {t('email')}
                </label>
                <div className="relative text-white-dark">
                    <input id="Email" type="email" placeholder={t('enter_email')} className="form-input ps-10 placeholder:text-white-dark" disabled />
                    <span className="absolute start-4 top-1/2 -translate-y-1/2">
                        <IconMail fill={true} />
                    </span>
                </div>
            </div>
            <p className="text-white-dark">{t('feature_not_available_yet')}</p>
            <button type="submit" disabled className="btn btn-gradient !mt-6 w-full cursor-not-allowed border-0 uppercase opacity-60 shadow-[0_10px_20px_-10px_rgba(67,97,238,0.44)]">
                {t('send_reset_link')}
            </button>
        </form>
    );
};

export default ComponentsAuthResetPasswordForm;
