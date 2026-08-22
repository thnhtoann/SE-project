'use client';
import AdminTable, { AdminTableColumn } from '@/components/datatable/admin-table';
import IconSearch from '@/components/icon/icon-search';
import { statusBadgeClass } from '@/components/dashboard/components-dashboard-analytics';
import { apiFetch } from '@/lib/api-client';
import { getTranslation } from '@/i18n';
import { OrderRecord, StaffRecord, StoreRecord } from '@/types/admin';
import { useEffect, useMemo, useState } from 'react';

const currency = (value: string) => `₫${Math.round(Number(value)).toLocaleString('en-US')}`;

const defaultBadgeClass = 'bg-white-dark/20 text-white-dark dark:bg-[#1b2e4b]';

// Fixed colors for the channels this project already knows about (matches
// CHANNEL_REVENUE in mock-dashboards.ts); anything else falls back to
// defaultBadgeClass rather than needing a code change to show up.
const channelBadgeClass: Record<string, string> = {
    POS: 'bg-primary-light text-primary dark:bg-primary dark:text-primary-light',
    Lazada: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    GrabMart: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    ShopeeFood: 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
    BeMart: 'bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light',
};

const ComponentsTransactionsList = () => {
    const { t } = getTranslation();
    const [orders, setOrders] = useState<OrderRecord[]>([]);
    const [staffById, setStaffById] = useState<Record<number, string>>({});
    const [storeById, setStoreById] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [channel, setChannel] = useState('all');

    useEffect(() => {
        Promise.all([
            apiFetch<OrderRecord[]>('/orders/'),
            apiFetch<StaffRecord[]>('/staff/'),
            apiFetch<StoreRecord[]>('/stores/'),
        ])
            .then(([orderRows, staffRows, storeRows]) => {
                setOrders(orderRows);
                setStaffById(Object.fromEntries(staffRows.map((s) => [s.staff_id, s.full_name])));
                setStoreById(Object.fromEntries(storeRows.map((s) => [s.store_id, s.store_name])));
            })
            .catch(() => {
                setOrders([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const channels = useMemo(() => Array.from(new Set(orders.map((o) => o.order_type))).sort(), [orders]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return orders.filter((order) => {
            if (channel !== 'all' && order.order_type !== channel) return false;
            if (!q) return true;
            const cashier = order.staff ? (staffById[order.staff] ?? '') : '';
            return (
                String(order.order_id).includes(q) ||
                (order.external_order_id ?? '').toLowerCase().includes(q) ||
                order.order_type.toLowerCase().includes(q) ||
                cashier.toLowerCase().includes(q)
            );
        });
    }, [orders, search, channel, staffById]);

    const columns: AdminTableColumn<OrderRecord>[] = useMemo(
        () => [
            {
                key: 'order_id',
                header: t('transaction_id'),
                sortable: true,
                sortValue: (o) => o.order_id,
                render: (o) => (
                    <div>
                        <span className="font-semibold">#{o.order_id}</span>
                        {o.external_order_id && <div className="text-xs text-white-dark">{o.external_order_id}</div>}
                    </div>
                ),
            },
            {
                key: 'order_type',
                header: t('channel'),
                sortable: true,
                sortValue: (o) => o.order_type,
                render: (o) => <span className={`badge ${channelBadgeClass[o.order_type] ?? defaultBadgeClass}`}>{o.order_type}</span>,
            },
            {
                key: 'store',
                header: t('store'),
                sortable: true,
                sortValue: (o) => storeById[o.store] ?? '',
                render: (o) => storeById[o.store] ?? '—',
            },
            {
                key: 'amount',
                header: t('amount'),
                sortable: true,
                align: 'right',
                sortValue: (o) => Number(o.total_amount),
                render: (o) => <span className="font-semibold">{currency(o.total_amount)}</span>,
            },
            {
                key: 'payment_method',
                header: t('payment_method'),
                sortable: true,
                sortValue: (o) => o.payment_method,
                render: (o) => o.payment_method,
            },
            {
                key: 'cashier',
                header: t('cashier'),
                sortable: true,
                sortValue: (o) => (o.staff ? (staffById[o.staff] ?? '') : ''),
                render: (o) => (o.staff ? (staffById[o.staff] ?? '—') : '—'),
            },
            {
                key: 'status',
                header: t('status'),
                sortable: true,
                sortValue: (o) => o.status,
                render: (o) => <span className={`badge ${statusBadgeClass[o.status] ?? defaultBadgeClass}`}>{o.status}</span>,
            },
            {
                key: 'order_date',
                header: t('date'),
                sortable: true,
                sortValue: (o) => o.order_date,
                render: (o) => new Date(o.order_date).toLocaleString(),
            },
        ],
        [t, staffById, storeById],
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
                        <h2 className="text-xl">{t('transactions')}</h2>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select className="form-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
                                <option value="all">{t('all_channels')}</option>
                                {channels.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
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
                    </div>

                    {loading ? (
                        <div className="py-10 text-center text-white-dark">{t('loading')}</div>
                    ) : (
                        <AdminTable columns={columns} rows={filtered} rowKey={(o) => o.order_id} emptyMessage={t('no_transactions_found')} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComponentsTransactionsList;
