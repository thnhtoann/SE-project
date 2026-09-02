'use client';
import IconRefresh from '@/components/icon/icon-refresh';
import { getTranslation } from '@/i18n';
import { apiFetch } from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { currency } from '@/lib/currency';
import { ShipmentRecord, StoreRecord } from '@/types/admin';
import { IRootState } from '@/store';
import { useState } from 'react';
import { useSelector } from 'react-redux';

const statusBadgeClass: Record<ShipmentRecord['status'], string> = {
    Preparing: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    Delivered: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Delayed: 'bg-danger-light text-danger dark:bg-danger dark:text-danger-light',
};

const ComponentsInventoryPurchaseOrders = () => {
    const { t } = getTranslation();
    const role = useSelector((state: IRootState) => state.session.role);
    const isChainManager = role === 'Chain Manager' || role === 'Admin';
    const { data: stores } = useApi<StoreRecord[]>('/stores/');

    const [selectedStoreId, setSelectedStoreId] = useState('');
    const storeQuery = isChainManager && selectedStoreId ? `?store=${selectedStoreId}` : '';
    const { data, isLoading: loading, mutate: reload } = useApi<ShipmentRecord[]>(`/shipments/${storeQuery}`);
    const orders = data ?? [];
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [sweeping, setSweeping] = useState(false);

    const markDelivered = (poId: number) => {
        setUpdatingId(poId);
        apiFetch(`/purchase-orders/${poId}/status/`, { method: 'PATCH', body: { status: 'Delivered' } })
            .then(() => reload())
            .finally(() => setUpdatingId(null));
    };

    const checkOverdue = () => {
        setSweeping(true);
        apiFetch('/shipments/check-overdue/', { method: 'POST' })
            .then(() => reload())
            .finally(() => setSweeping(false));
    };

    return (
        <div className="panel">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl">{t('purchase_orders')}</h2>
                <div className="flex items-center gap-3">
                    {isChainManager && (
                        <select className="form-select w-auto" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                            <option value="">{t('all_stores')}</option>
                            {(stores ?? []).map((s) => (
                                <option key={s.store_id} value={s.store_id}>
                                    {s.store_name}
                                </option>
                            ))}
                        </select>
                    )}
                    <button type="button" className="btn btn-outline-primary btn-sm gap-2" onClick={checkOverdue} disabled={sweeping}>
                        <IconRefresh className="h-4 w-4" />
                        {t('check_overdue')}
                    </button>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table-hover">
                    <thead>
                        <tr>
                            <th>{t('order_code')}</th>
                            <th>{t('branch')}</th>
                            <th>{t('supplier')}</th>
                            <th>{t('order_date')}</th>
                            <th>{t('expected_delivery_date')}</th>
                            <th className="text-right">{t('total')}</th>
                            <th>{t('status')}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={8} className="!text-center font-semibold text-white-dark">
                                    {t('loading')}
                                </td>
                            </tr>
                        )}
                        {!loading && orders.length === 0 && (
                            <tr>
                                <td colSpan={8} className="!text-center font-semibold text-white-dark">
                                    {t('no_purchase_orders_found')}
                                </td>
                            </tr>
                        )}
                        {orders.map((po) => (
                            <tr key={po.po_id}>
                                <td className="font-semibold">#{po.po_id}</td>
                                <td>{po.store_name ?? '—'}</td>
                                <td>{po.supplier_name}</td>
                                <td>{po.order_date}</td>
                                <td>{po.expected_delivery_date ?? '—'}</td>
                                <td className="text-right">{currency(po.total_amount)}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <span className={`badge ${statusBadgeClass[po.status]}`}>{po.status}</span>
                                        {po.is_overdue && <span className="badge bg-danger-light text-danger dark:bg-danger dark:text-danger-light">{t('overdue')}</span>}
                                    </div>
                                </td>
                                <td>
                                    {po.status === 'Preparing' && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-success btn-sm"
                                            disabled={updatingId === po.po_id}
                                            onClick={() => markDelivered(po.po_id)}
                                        >
                                            {t('mark_delivered')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComponentsInventoryPurchaseOrders;
