'use client';
import AdminTable, { AdminTableColumn } from '@/components/datatable/admin-table';
import IconBox from '@/components/icon/icon-box';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconPlus from '@/components/icon/icon-plus';
import IconSearch from '@/components/icon/icon-search';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import { apiFetch } from '@/lib/api-client';
import { currency } from '@/lib/currency';
import { getTranslation } from '@/i18n';
import {
    discountedPrice,
    expiryStatusBadgeClass,
    expiryStatusKey,
    getNearestExpirationDate,
    getProductExpiryStatus,
    getStockStatus,
    getTotalQuantity,
    stockStatusBadgeClass,
    stockStatusKey,
} from '@/lib/inventory';
import {
    BatchApiRecord,
    CategoryRecord,
    ExpiryStatus,
    ForecastProductRow,
    ForecastResponse,
    Product,
    ProductApiRecord,
    StoreInventoryApiRecord,
    StoreRecord,
} from '@/types/admin';
import { assembleProducts } from '@/lib/inventory-assemble';
import { useApi } from '@/lib/hooks/use-api';
import { IRootState } from '@/store';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

type ExpiryFilter = 'all' | ExpiryStatus;

const riskBadgeClass: Record<ForecastProductRow['stockout_risk'], string> = {
    Low: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Medium: 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
    High: 'bg-danger-light text-danger dark:bg-danger dark:text-danger-light',
};

const ComponentsInventoryList = () => {
    const { t } = getTranslation();
    const role = useSelector((state: IRootState) => state.session.role);
    const isChainManager = role === 'Chain Manager' || role === 'Admin';

    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [search, setSearch] = useState('');
    const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');

    // Store Manager/Cashier are locked server-side to their own store no matter
    // what's requested here; the ?store= param only ever does something for a
    // Chain Manager/Admin using the store picker below.
    const inventoryPath = isChainManager && selectedStoreId ? `/store-inventories/?store=${selectedStoreId}` : '/store-inventories/';

    const { data: products, mutate: mutateProducts } = useApi<ProductApiRecord[]>('/products/');
    const { data: categories } = useApi<CategoryRecord[]>('/categories/');
    const { data: batches } = useApi<BatchApiRecord[]>('/batches/');
    const { data: inventories } = useApi<StoreInventoryApiRecord[]>(inventoryPath);
    const { data: stores } = useApi<StoreRecord[]>('/stores/');
    // Demand-forecast reorder risk (forecasting/procurement apps) -- Store/Chain-Manager-only,
    // so a Cashier viewing this page degrades gracefully to no risk indicator rather than an error.
    const { data: forecastResponse } = useApi<ForecastResponse>('/procurement/forecast/');

    const loading = !products || !categories || !batches || !inventories || !stores;
    const items = useMemo(
        () => (products && categories && batches && inventories && stores ? assembleProducts(products, categories, batches, inventories, stores) : []),
        [products, categories, batches, inventories, stores],
    );
    const forecastByProduct = useMemo(() => new Map((forecastResponse?.products ?? []).map((p) => [p.product_id, p])), [forecastResponse]);
    const storeList = stores ?? [];

    const filtered = useMemo(
        () =>
            items.filter((product) => {
                const matchesSearch =
                    product.product_name.toLowerCase().includes(search.toLowerCase()) ||
                    product.barcode.includes(search) ||
                    product.category.toLowerCase().includes(search.toLowerCase());
                const matchesExpiry = expiryFilter === 'all' || getProductExpiryStatus(product) === expiryFilter;
                return matchesSearch && matchesExpiry;
            }),
        [items, search, expiryFilter],
    );

    const totalProducts = items.length;
    const lowOrOutOfStock = items.filter((p) => getStockStatus(p) !== 'In Stock').length;
    const expiringSoon = items.filter((p) => getProductExpiryStatus(p) === 'Near Expiry').length;
    const expired = items.filter((p) => getProductExpiryStatus(p) === 'Expired').length;

    const deleteProduct = useCallback(
        (id: number) => {
            if (!window.confirm(t('confirm_delete_product'))) return;
            apiFetch(`/products/${id}/`, { method: 'DELETE' })
                .then(() => mutateProducts((prev) => prev?.filter((p) => p.product_id !== id), { revalidate: false }))
                .catch(() => {
                    // Leave the row in place — most likely a 4xx because the
                    // product is still referenced elsewhere (e.g. an OrderDetail).
                });
        },
        [t, mutateProducts],
    );

    const columns: AdminTableColumn<Product>[] = useMemo(
        () => [
            {
                key: 'product',
                header: t('product_name'),
                sortable: true,
                sortValue: (p) => p.product_name,
                render: (p) => (
                    <div>
                        <div className="font-semibold">{p.product_name}</div>
                        <div className="text-xs text-white-dark">{p.barcode}</div>
                    </div>
                ),
            },
            { key: 'category', header: t('category'), sortable: true, sortValue: (p) => p.category, render: (p) => p.category },
            {
                key: 'stock',
                header: t('stock_status'),
                sortable: true,
                sortValue: (p) => getStockStatus(p),
                render: (p) => <span className={`badge ${stockStatusBadgeClass[getStockStatus(p)]}`}>{t(stockStatusKey[getStockStatus(p)])}</span>,
            },
            {
                key: 'quantity',
                header: t('quantity'),
                sortable: true,
                align: 'right',
                sortValue: (p) => getTotalQuantity(p),
                render: (p) => {
                    const quantity = getTotalQuantity(p);
                    const forecast = forecastByProduct.get(p.product_id);
                    const isLowStock = getStockStatus(p) !== 'In Stock';
                    const hasForecastRisk = forecast?.action_required ?? false;
                    if (!isLowStock && !hasForecastRisk) {
                        return <span>{quantity}</span>;
                    }
                    return (
                        <span className="inline-flex items-center justify-end gap-1.5">
                            {quantity}
                            <span className="group/tip relative inline-flex">
                                <IconInfoCircle className="h-4 w-4 shrink-0 cursor-help text-warning" />
                                <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-64 rounded bg-black/90 p-2 text-left text-xs font-normal normal-case leading-relaxed text-white group-hover/tip:block">
                                    {isLowStock && (
                                        <div>{t('quantity_alert_low_stock').replace('{quantity}', String(quantity)).replace('{threshold}', String(p.min_threshold))}</div>
                                    )}
                                    {hasForecastRisk && forecast && (
                                        <div className={isLowStock ? 'mt-1.5 border-t border-white/20 pt-1.5' : ''}>
                                            {t('restock_risk')}: {forecast.stockout_risk} — {t('reorder')} {forecast.recommended_order_quantity}. {forecast.reasoning}
                                        </div>
                                    )}
                                </span>
                            </span>
                        </span>
                    );
                },
            },
            {
                key: 'expiry',
                header: t('nearest_expiry'),
                sortable: true,
                sortValue: (p) => getNearestExpirationDate(p) ?? '',
                render: (p) => {
                    const status = getProductExpiryStatus(p);
                    const date = getNearestExpirationDate(p);
                    return (
                        <div className="flex flex-col gap-1">
                            <span className={`badge w-fit ${expiryStatusBadgeClass[status]}`}>{t(expiryStatusKey[status])}</span>
                            {date && <span className="text-xs text-white-dark">{date}</span>}
                        </div>
                    );
                },
            },
            {
                key: 'restock_risk',
                header: t('restock_risk'),
                sortable: true,
                sortValue: (p) => forecastByProduct.get(p.product_id)?.stockout_risk ?? '',
                render: (p) => {
                    const forecast = forecastByProduct.get(p.product_id);
                    if (!forecast) return <span className="text-white-dark">—</span>;
                    return (
                        <div className="flex flex-col gap-1" title={forecast.reasoning}>
                            <span className={`badge w-fit ${riskBadgeClass[forecast.stockout_risk]}`}>{forecast.stockout_risk}</span>
                            {forecast.action_required && (
                                <span className="text-xs text-white-dark">
                                    {t('reorder')} {forecast.recommended_order_quantity}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                key: 'price',
                header: t('price'),
                sortable: true,
                align: 'right',
                sortValue: (p) => p.base_price,
                render: (p) =>
                    p.discountPercent ? (
                        <div className="text-right">
                            <div className="font-semibold text-danger">{currency(discountedPrice(p))}</div>
                            <div className="text-xs text-white-dark line-through">{currency(p.base_price)}</div>
                        </div>
                    ) : (
                        <div className="text-right font-semibold">{currency(p.base_price)}</div>
                    ),
            },
            {
                key: 'actions',
                header: t('actions'),
                align: 'center',
                render: (p) => (
                    <div className="mx-auto flex w-max items-center gap-4">
                        <Link href={`/inventory/${p.product_id}`} className="flex hover:text-primary" title={t('view')}>
                            <IconEye />
                        </Link>
                        <Link href={`/inventory/${p.product_id}?focus=discount`} className="flex hover:text-info" title={t('edit')}>
                            <IconEdit className="h-4.5 w-4.5" />
                        </Link>
                        <button type="button" className="flex hover:text-danger" onClick={() => deleteProduct(p.product_id)} title={t('delete')}>
                            <IconTrashLines />
                        </button>
                    </div>
                ),
            },
        ],
        [t, deleteProduct, forecastByProduct],
    );

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>{t('admin_portal')}</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('inventory')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                                <IconBox />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('total_products')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{totalProducts}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-warning-light text-warning dark:bg-warning dark:text-warning-light">
                                <IconTrendingUp />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('low_out_of_stock')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{lowOrOutOfStock}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light">
                                <IconInfoCircle />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('expiring_soon')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{expiringSoon}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-danger-light text-danger dark:bg-danger dark:text-danger-light">
                                <IconTrashLines />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('expiry_expired')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{expired}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-xl">{t('product_list')}</h2>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                            <Link href="/inventory/add" className="btn btn-primary gap-2">
                                <IconPlus />
                                {t('add_product')}
                            </Link>
                            {isChainManager && (
                                <select className="form-select w-auto" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                                    <option value="">{t('all_stores')}</option>
                                    {storeList.map((s) => (
                                        <option key={s.store_id} value={s.store_id}>
                                            {s.store_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <select className="form-select w-auto" value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value as ExpiryFilter)}>
                                <option value="all">{t('all_expiry_statuses')}</option>
                                <option value="Expired">{t('expiry_expired')}</option>
                                <option value="Near Expiry">{t('expiry_near_expiry')}</option>
                                <option value="OK">{t('expiry_ok')}</option>
                            </select>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('search_products_placeholder')}
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
                        <AdminTable columns={columns} rows={filtered} rowKey={(p) => p.product_id} emptyMessage={t('no_products_found')} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComponentsInventoryList;
