'use client';
import AdminTable, { AdminTableColumn } from '@/components/datatable/admin-table';
import IconMail from '@/components/icon/icon-mail';
import IconPhone from '@/components/icon/icon-phone';
import IconPlus from '@/components/icon/icon-plus';
import IconSearch from '@/components/icon/icon-search';
import IconX from '@/components/icon/icon-x';
import TierBadge from '@/components/customers/tier-badge';
import { getTranslation } from '@/i18n';
import { apiFetch, ApiError } from '@/lib/api-client';
import { CustomerRecord, CustomerStatus, MembershipTier } from '@/types/admin';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Fragment, useEffect, useMemo, useState } from 'react';

const statusBadgeClass: Record<CustomerStatus, string> = {
    Active: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Inactive: 'bg-white-dark/20 text-white-dark dark:bg-[#1b2e4b]',
};

const statusKey: Record<CustomerStatus, string> = {
    Active: 'customer_status_active',
    Inactive: 'customer_status_inactive',
};

const TIERS: MembershipTier[] = ['Bronze', 'Silver', 'Gold', 'VIP'];

interface FormState {
    name: string;
    email: string;
    phone: string;
    tier: MembershipTier;
}

const emptyForm: FormState = { name: '', email: '', phone: '', tier: 'Bronze' };

const ComponentsCustomersList = () => {
    const { t } = getTranslation();
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const reload = () => {
        setLoading(true);
        apiFetch<CustomerRecord[]>('/customers/')
            .then(setCustomers)
            .catch(() => setCustomers([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        reload();
    }, []);

    const filtered = useMemo(
        () => customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)),
        [customers, search],
    );

    const openAddModal = () => {
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) return setError(t('error_customer_name_required'));

        setSubmitting(true);
        try {
            await apiFetch('/customers/', { method: 'POST', body: form });
            setModalOpen(false);
            reload();
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.body as { detail?: string } | null;
                setError(body?.detail ?? err.message);
            } else {
                setError(t('error_create_customer_failed'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const columns: AdminTableColumn<CustomerRecord>[] = useMemo(
        () => [
            { key: 'name', header: t('customer'), sortable: true, sortValue: (c) => c.name, render: (c) => <div className="font-semibold">{c.name}</div> },
            { key: 'email', header: t('email'), sortable: true, sortValue: (c) => c.email, render: (c) => c.email },
            { key: 'phone', header: t('phone'), sortable: true, sortValue: (c) => c.phone, render: (c) => <span dir="ltr">{c.phone}</span> },
            { key: 'tier', header: t('tier'), sortable: true, sortValue: (c) => c.tier, render: (c) => <TierBadge tier={c.tier} /> },
            {
                key: 'status',
                header: t('status'),
                sortable: true,
                sortValue: (c) => c.status,
                render: (c) => <span className={`badge ${statusBadgeClass[c.status]}`}>{t(statusKey[c.status])}</span>,
            },
            { key: 'lastContacted', header: t('last_contacted'), sortable: true, sortValue: (c) => c.last_contacted_at ?? '', render: (c) => c.last_contacted_at ?? '—' },
            {
                key: 'actions',
                header: t('actions'),
                align: 'center',
                render: (c) => (
                    <div className="mx-auto flex w-max items-center gap-4">
                        <a href={`mailto:${c.email}`} className="flex hover:text-primary" title={t('email')}>
                            <IconMail className="h-4.5 w-4.5" />
                        </a>
                        <a href={`tel:${c.phone}`} className="flex hover:text-primary" title={t('call')}>
                            <IconPhone className="h-4.5 w-4.5" />
                        </a>
                    </div>
                ),
            },
        ],
        [t],
    );

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>{t('admin_portal')}</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('customers')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="panel">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-xl">{t('customer_list')}</h2>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                            <button type="button" className="btn btn-primary gap-2" onClick={openAddModal}>
                                <IconPlus />
                                {t('add_customer')}
                            </button>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('search_customers_placeholder')}
                                    className="peer form-input py-2 ltr:pr-11 rtl:pl-11"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <span className="absolute top-1/2 -translate-y-1/2 peer-focus:text-primary ltr:right-[11px] rtl:left-[11px]">
                                    <IconSearch className="mx-auto" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-10 text-center text-white-dark">{t('loading')}</div>
                    ) : (
                        <AdminTable columns={columns} rows={filtered} rowKey={(c) => c.customer_id} emptyMessage={t('no_customers_found')} />
                    )}
                </div>
            </div>

            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)}>
                    <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-[black]/60" />
                    </TransitionChild>
                    <div className="fixed inset-0 z-[999] overflow-y-auto">
                        <div className="flex min-h-screen items-start justify-center px-4 py-8">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel as="div" className="panel my-8 w-full max-w-lg overflow-hidden rounded-lg border-0 p-0 text-black dark:text-white-dark">
                                    <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                        <div className="text-lg font-bold">{t('add_customer')}</div>
                                        <button type="button" className="text-white-dark hover:text-dark" onClick={() => setModalOpen(false)}>
                                            <IconX />
                                        </button>
                                    </div>
                                    <form onSubmit={submitForm} className="p-5">
                                        {error && <div className="mb-4 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{error}</div>}
                                        <div className="mb-4">
                                            <label htmlFor="name">{t('customer_name')}</label>
                                            <input id="name" type="text" className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="email">{t('email')}</label>
                                            <input id="email" type="email" className="form-input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="phone">{t('phone')}</label>
                                            <input id="phone" type="text" className="form-input" dir="ltr" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="tier">{t('tier')}</label>
                                            <select id="tier" className="form-select" value={form.tier} onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value as MembershipTier }))}>
                                                {TIERS.map((tier) => (
                                                    <option key={tier} value={tier}>
                                                        {tier}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-end gap-4">
                                            <button type="button" className="btn btn-outline-danger" onClick={() => setModalOpen(false)}>
                                                {t('cancel')}
                                            </button>
                                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                                {t('add_customer')}
                                            </button>
                                        </div>
                                    </form>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default ComponentsCustomersList;
