'use client';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGithub from '@/components/icon/icon-github';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconTwitter from '@/components/icon/icon-twitter';
import { StaffRole } from '@/types/admin';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface FormState {
    name: string;
    email: string;
    phone: string;
    role: StaffRole | '';
    branch: string;
    address: string;
    city: string;
    country: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    github: string;
}

const emptyForm: FormState = {
    name: '',
    email: '',
    phone: '',
    role: '',
    branch: '',
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
    const router = useRouter();
    const [form, setForm] = useState<FormState>(emptyForm);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const changeValue = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm((prev) => ({ ...prev, [id]: value }));
    };

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name) {
            setError(t('error_full_name_required'));
            return;
        }
        if (!form.email) {
            setError(t('error_email_required'));
            return;
        }
        if (!form.phone) {
            setError(t('error_phone_required'));
            return;
        }
        if (!form.role) {
            setError(t('error_role_required'));
            return;
        }
        if (!form.branch) {
            setError(t('error_branch_required'));
            return;
        }

        // No backend yet — this feature is frontend-only for now, so the new
        // staff record isn't persisted into the mock Staff List.
        setSuccess(true);
    };

    if (success) {
        return (
            <div>
                <div className="panel mx-auto mt-10 max-w-lg text-center">
                    <h5 className="mb-2 text-lg font-semibold text-success">{t('staff_account_created')}</h5>
                    <p className="text-white-dark">
                        {form.name} {t('staff_account_created_message')} {form.role} {t('at_branch')} {form.branch}.
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
                        <h6 className="mb-5 text-lg font-bold">{t('general_information')}</h6>
                        <div className="flex flex-col sm:flex-row">
                            <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                                <img src="/assets/images/user-profile.jpeg" alt="staff photo preview" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32" />
                                <input id="photo" type="file" accept="image/*" className="form-input mt-3 p-1 text-xs" />
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
                                    <label htmlFor="branch">{t('branch')}</label>
                                    <input id="branch" type="text" placeholder={t('branch_placeholder')} className="form-input" value={form.branch} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="email">{t('email')}</label>
                                    <input id="email" type="email" placeholder={t('enter_email')} className="form-input" value={form.email} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="phone">{t('phone')}</label>
                                    <input id="phone" type="text" placeholder={t('phone_placeholder')} className="form-input" value={form.phone} onChange={changeValue} required />
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
                        <button type="submit" className="btn btn-primary">
                            {t('add_staff')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComponentsStaffAddForm;
