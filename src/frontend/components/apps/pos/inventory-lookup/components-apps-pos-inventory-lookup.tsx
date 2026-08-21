'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { CURRENT_BRANCH, mockProducts } from '@/components/apps/pos/pos-data';
import PosStatusBadge, { stockStatusBadge } from '@/components/apps/pos/pos-status-badge';
import IconSearch from '@/components/icon/icon-search';
import { getTranslation } from '@/i18n';

const ComponentsAppsPosInventoryLookup = () => {
    const { t } = getTranslation();
    const inventory = useSelector((state: IRootState) => state.pos.inventory);
    const [search, setSearch] = useState('');

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return mockProducts
            .filter((p) => !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q))
            .map((p) => ({
                product: p,
                inv: inventory.find((r) => r.productId === p.id),
            }));
    }, [inventory, search]);

    return (
        <div className="panel">
            <div className="mb-1 text-lg font-bold">{t('inventory_lookup')}</div>
            <div className="mb-5 text-sm text-white-dark">
                {t('current_branch')}: {CURRENT_BRANCH}
            </div>

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
                            <th>{t('on_hand')}</th>
                            <th>{t('incoming')}</th>
                            <th>{t('available')}</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="!text-center font-semibold text-white-dark">
                                    No products found
                                </td>
                            </tr>
                        )}
                        {rows.map(({ product, inv }) => {
                            const status = stockStatusBadge(inv?.available ?? 0);
                            return (
                                <tr key={product.id}>
                                    <td className="font-semibold">{product.name}</td>
                                    <td>{product.barcode}</td>
                                    <td>{inv?.onHand ?? 0}</td>
                                    <td>{inv?.incoming ?? 0}</td>
                                    <td>{inv?.available ?? 0}</td>
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
