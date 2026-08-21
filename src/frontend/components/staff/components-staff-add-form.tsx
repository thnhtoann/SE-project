'use client';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGithub from '@/components/icon/icon-github';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconTwitter from '@/components/icon/icon-twitter';
import { apiFetch, ApiError } from '@/lib/api-client';
import { RoleRecord, StaffRecord, StaffRole, StoreRecord } from '@/types/admin';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

interface FormState {
    username: string;
    password: string;
    name: string;
    email: string;
    phone: string;
    role: StaffRole | '';
    store: string;
    address: string;
    city: string;
    country: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    github: string;
}

const emptyForm: FormState = {
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: '',
    store: '',
    address: '',
    city: '',
    country: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    github: '',
};

const ComponentsStaffAddForm = () => {
    const { t } = getTranslation();
    const [form, setForm] = useState<FormState>(emptyForm);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [roles, setRoles] = useState<RoleRecord[]>([]);
    const [stores, setStores] = useState<StoreRecord[]>([]);

    useEffect(() => {
        apiFetch<RoleRecord[]>('/roles/')
            .then(setRoles)
            .catch(() => setRoles([]));
        apiFetch<StoreRecord[]>('/stores/')
            .then(setStores)
            .catch(() => setStores([]));
    }, []);

    const changeValue = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm((prev) => ({ ...prev, [id]: value }));
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.username) {
            setError(t('error_username_required'));
            return;
        }
        if (!form.password) {
            setError(t('error_password_required'));
            return;
        }
        if (!form.name) {
            setError(t('error_full_name_required'));
            return;
        }
        if (!form.role) {
            setError(t('error_role_required'));
            return;
        }

        const roleRecord = roles.find((r) => r.role_name === form.role);
        if (!roleRecord) {
            setError(t('error_role_required'));
            return;
        }

        setSubmitting(true);
        try {
            await apiFetch<StaffRecord>('/staff/', {
                method: 'POST',
                body: {
                    username: form.username,
                    password: form.password,
                    full_name: form.name,
                    role: roleRecord.role_id,
                    store: form.store ? Number(form.store) : null,
                    email: form.email || null,
                    phone: form.phone || null,
                    address: form.address || null,
                    city: form.city || null,
                    country: form.country || null,
                    is_active: true,
                    social_links: {
                        linkedin: form.linkedin || undefined,
                        twitter: form.twitter || undefined,
                        facebook: form.facebook || undefined,
                        github: form.github || undefined,
                    },
                },
            });
            setSuccess(true);
        } catch (err) {
            if (err instanceof ApiError && err.body && typeof err.body === 'object') {
                const firstFieldError = Object.values(err.body as Record<string, string[]>)[0];
                setError(Array.isArray(firstFieldError) ? firstFieldError[0] : String(err.message));
            } else {
                setError(t('error_saving_staff'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        const storeName = stores.find((s) => String(s.store_id) === form.store)?.store_name;
        return (
            <div>
                <div className="panel mx-auto mt-10 max-w-lg text-center">
                    <h5 className="mb-2 text-lg font-semibold text-success">{t('staff_account_created')}</h5>
                    <p className="text-white-dark">
                        {form.name} {t('staff_account_created_message')} {form.role} {storeName ? `${t('at_branch')} ${storeName}` : ''}.
                    </p>
                    <Link href="/staff" className="btn btn-primary mt-6">
                        {t('back_to_staff_list')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/staff" className="text-primary hover:underline">
                        {t('staff')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('add_staff')}</span>
                </li>
            </ul>

            <div className="pt-5">
                {error && <div className="mb-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{error}</div>}

                <form onSubmit={submitForm}>
                    <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                        <h6 className="mb-5 text-lg font-bold">{t('account_information')}</h6>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="username">{t('username')}</label>
                                <input id="username" type="text" placeholder={t('enter_username')} className="form-input" value={form.username} onChange={changeValue} required />
                            </div>
                            <div>
                                <label htmlFor="password">{t('password')}</label>
                                <input id="password" type="password" placeholder={t('enter_password')} className="form-input" value={form.password} onChange={changeValue} required />
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                        <h6 className="mb-5 text-lg font-bold">{t('general_information')}</h6>
                        <div className="flex flex-col sm:flex-row">
                            <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                                <img src="/assets/images/user-profile.jpeg" alt="staff photo preview" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32" />
                            </div>
                            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="name">{t('full_name')}</label>
                                    <input id="name" type="text" placeholder={t('enter_full_name')} className="form-input" value={form.name} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="role">{t('role')}</label>
                                    <select id="role" className="form-select" value={form.role} onChange={changeValue} required>
                                        <option value="">{t('select_role')}</option>
                                        <option value="Cashier">{t('role_cashier')}</option>
                                        <option value="Store Manager">{t('role_store_manager')}</option>
                                        <option value="Chain Manager">{t('role_chain_manager')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="store">{t('branch')}</label>
                                    <select id="store" className="form-select" value={form.store} onChange={changeValue}>
                                        <option value="">{t('select_branch')}</option>
                                        {stores.map((s) => (
                                            <option key={s.store_id} value={s.store_id}>
                                                {s.store_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="email">{t('email')}</label>
                                    <input id="email" type="email" placeholder={t('enter_email')} className="form-input" value={form.email} onChange={changeValue} />
                                </div>
                                <div>
                                    <label htmlFor="phone">{t('phone')}</label>
                                    <input id="phone" type="text" placeholder={t('phone_placeholder')} className="form-input" value={form.phone} onChange={changeValue} />
                                </div>
                                <div>
                                    <label htmlFor="country">{t('country')}</label>
                                    <input id="country" type="text" placeholder={t('enter_country')} className="form-input" value={form.country} onChange={changeValue} />
                                </div>
                                <div>
                                    <label htmlFor="city">{t('city')}</label>
                                    <input id="city" type="text" placeholder={t('enter_city')} className="form-input" value={form.city} onChange={changeValue} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="address">{t('address')}</label>
                                    <textarea id="address" rows={2} placeholder={t('enter_address')} className="form-textarea resize-none" value={form.address} onChange={changeValue}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                        <h6 className="mb-5 text-lg font-bold">{t('social_links')}</h6>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconLinkedin className="h-5 w-5" />
                                </div>
                                <input id="linkedin" type="text" placeholder={t('linkedin_handle')} className="form-input" value={form.linkedin} onChange={changeValue} />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconTwitter className="h-5 w-5" />
                                </div>
                                <input id="twitter" type="text" placeholder={t('twitter_handle')} className="form-input" value={form.twitter} onChange={changeValue} />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconFacebook className="h-5 w-5" />
                                </div>
                                <input id="facebook" type="text" placeholder={t('facebook_handle')} className="form-input" value={form.facebook} onChange={changeValue} />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconGithub />
                                </div>
                                <input id="github" type="text" placeholder={t('github_handle')} className="form-input" value={form.github} onChange={changeValue} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4">
                        <Link href="/staff" className="btn btn-outline-danger">
                            {t('cancel')}
                        </Link>
                        <button type="submit" disabled={submitting} className="btn btn-primary">
                            {t('add_staff')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComponentsStaffAddForm;
