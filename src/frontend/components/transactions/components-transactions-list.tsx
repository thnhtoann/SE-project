'use client';
import AdminTable, { AdminTableColumn } from '@/components/datatable/admin-table';
import IconSearch from '@/components/icon/icon-search';
import { statusBadgeClass } from '@/components/dashboard/components-dashboard-analytics';
import { POS_TRANSACTIONS } from '@/data/mock-transactions';
import { getTranslation } from '@/i18n';
import { PaymentMethod, PosTransaction } from '@/types/admin';
import { useEffect, useMemo, useState } from 'react';

const currency = (value: number) => `₫${Math.round(value).toLocaleString('en-US')}`;

const paymentMethodBadgeClass: Record<PaymentMethod, string> = {
    Card: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    MoMo: 'bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light',
    Cash: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    'Online Banking': 'bg-primary-light text-primary dark:bg-primary dark:text-primary-light',
};

const paymentMethodKey: Record<PaymentMethod, string> = {
    Card: 'payment_method_card',
    MoMo: 'payment_method_momo',
    Cash: 'cash',
    'Online Banking': 'payment_method_online_banking',
};

const statusKey: Record<PosTransaction['status'], string> = {
    Completed: 'transaction_status_completed',
    Pending: 'transaction_status_pending',
    Canceled: 'transaction_status_canceled',
};

const ComponentsTransactionsList = () => {
    const { t } = getTranslation();
    const [search, setSearch] = useState('');
    const [filtered, setFiltered] = useState(POS_TRANSACTIONS);

    useEffect(() => {
        setFiltered(
            POS_TRANSACTIONS.filter(
                (tx) =>
                    tx.id.toLowerCase().includes(search.toLowerCase()) ||
                    tx.customer.toLowerCase().includes(search.toLowerCase()) ||
                    tx.cashier.toLowerCase().includes(search.toLowerCase()),
            ),
        );
    }, [search]);

    const columns: AdminTableColumn<PosTransaction>[] = useMemo(
        () => [
            {
                key: 'id',
                header: t('transaction_id'),
                sortable: true,
                sortValue: (tx) => tx.id,
                render: (tx) => <span className="font-semibold">#{tx.id}</span>,
            },
            { key: 'customer', header: t('customer'), sortable: true, sortValue: (tx) => tx.customer, render: (tx) => tx.customer },
            { key: 'amount', header: t('amount'), sortable: true, align: 'right', sortValue: (tx) => tx.amount, render: (tx) => <span className="font-semibold">{currency(tx.amount)}</span> },
            {
                key: 'paymentMethod',
                header: t('payment_method'),
                sortable: true,
                sortValue: (tx) => tx.paymentMethod,
                render: (tx) => <span className={`badge ${paymentMethodBadgeClass[tx.paymentMethod]}`}>{t(paymentMethodKey[tx.paymentMethod])}</span>,
            },
            { key: 'cashier', header: t('cashier'), sortable: true, sortValue: (tx) => tx.cashier, render: (tx) => tx.cashier },
            {
                key: 'status',
                header: t('status'),
                sortable: true,
                sortValue: (tx) => tx.status,
                render: (tx) => <span className={`badge ${statusBadgeClass[tx.status]}`}>{t(statusKey[tx.status])}</span>,
            },
            { key: 'date', header: t('date'), sortable: true, sortValue: (tx) => tx.date, render: (tx) => tx.date },
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
                    <span>{t('transactions')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="panel">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-xl">{t('pos_transactions')}</h2>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('search_transactions_placeholder')}
                                className="peer form-input py-2 ltr:pr-11 rtl:pl-11"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 peer-focus:text-primary ltr:right-[11px] rtl:left-[11px]">
                                <IconSearch className="mx-auto" />
                            </span>
                        </div>
                    </div>

                    <AdminTable columns={columns} rows={filtered} rowKey={(tx) => tx.id} emptyMessage={t('no_transactions_found')} />
                </div>
            </div>
        </div>
    );
};

export default ComponentsTransactionsList;
