'use client';
import AdminTable, { AdminTableColumn } from '@/components/datatable/admin-table';
import IconMail from '@/components/icon/icon-mail';
import IconPhone from '@/components/icon/icon-phone';
import IconSearch from '@/components/icon/icon-search';
import TierBadge from '@/components/customers/tier-badge';
import { CUSTOMERS } from '@/data/mock-customers';
import { getTranslation } from '@/i18n';
import { Customer, CustomerStatus } from '@/types/admin';
import { useEffect, useMemo, useState } from 'react';

const statusBadgeClass: Record<CustomerStatus, string> = {
    Active: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Inactive: 'bg-white-dark/20 text-white-dark dark:bg-[#1b2e4b]',
};

const statusKey: Record<CustomerStatus, string> = {
    Active: 'customer_status_active',
    Inactive: 'customer_status_inactive',
};

const ComponentsCustomersList = () => {
    const { t } = getTranslation();
    const [search, setSearch] = useState('');
    const [filtered, setFiltered] = useState(CUSTOMERS);

    useEffect(() => {
        setFiltered(
            CUSTOMERS.filter(
                (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
            ),
        );
    }, [search]);

    const columns: AdminTableColumn<Customer>[] = useMemo(
        () => [
            {
                key: 'name',
                header: t('customer'),
                sortable: true,
                sortValue: (c) => c.name,
                render: (c) => (
                    <div className="flex items-center font-semibold">
                        <div className="w-max rounded-full bg-white-dark/30 p-0.5 ltr:mr-2 rtl:ml-2">
                            <img className="h-8 w-8 rounded-full object-cover" src={`/assets/images/${c.photo}`} alt={c.name} />
                        </div>
                        <div>{c.name}</div>
                    </div>
                ),
            },
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
            { key: 'lastContacted', header: t('last_contacted'), sortable: true, sortValue: (c) => c.lastContactedAt, render: (c) => c.lastContactedAt },
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

                    <AdminTable columns={columns} rows={filtered} rowKey={(c) => c.id} emptyMessage={t('no_customers_found')} />
                </div>
            </div>
        </div>
    );
};

export default ComponentsCustomersList;
