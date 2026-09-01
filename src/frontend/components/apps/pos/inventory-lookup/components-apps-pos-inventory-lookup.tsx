'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { useStoreCatalog } from '@/lib/hooks/use-store-catalog';
import PosStatusBadge, { stockStatusBadge } from '@/components/apps/pos/pos-status-badge';
import IconSearch from '@/components/icon/icon-search';
import { getTranslation } from '@/i18n';

// Note: this page deliberately doesn't display the branch name -- core.StoreViewSet is
// IsChainManager-only (even for GET), so a Cashier viewing this Cashier-facing screen
// can't resolve their own store_id to a name without a backend permission change that's
// out of scope here.
const ComponentsAppsPosInventoryLookup = () => {
    const { t } = getTranslation();
    const storeId = useSelector((state: IRootState) => state.session.storeId);
    const { entries, loading } = useStoreCatalog(storeId);
    const [search, setSearch] = useState('');

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entries.filter((e) => !q || e.product.product_name.toLowerCase().includes(q) || e.product.barcode.includes(q));
    }, [entries, search]);

    return (
        <div className="panel">
            <div className="mb-5 text-lg font-bold">{t('inventory_lookup')}</div>

            <div className="relative mb-5 max-w-sm">
                <input
                    type="text"
                    className="form-input ltr:pl-9 rtl:pr-9"
                    placeholder={t('scan_or_search_product')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
                    <IconSearch className="h-4 w-4 text-white-dark" />
                </span>
            </div>

            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>{t('product_name')}</th>
                            <th>Barcode</th>
                            <th>{t('available')}</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="!text-center font-semibold text-white-dark">
                                    No products found
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td colSpan={4} className="!text-center font-semibold text-white-dark">
                                    {t('loading')}
                                </td>
                            </tr>
                        )}
                        {rows.map(({ product, available }) => {
                            const status = stockStatusBadge(available);
                            return (
                                <tr key={product.product_id}>
                                    <td className="font-semibold">{product.product_name}</td>
                                    <td>{product.barcode}</td>
                                    <td>{available}</td>
                                    <td>
                                        <PosStatusBadge label={status.label} color={status.color} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComponentsAppsPosInventoryLookup;
