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
import { BatchApiRecord, CategoryRecord, ExpiryStatus, Product, ProductApiRecord, StoreInventoryApiRecord, StoreRecord } from '@/types/admin';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ExpiryFilter = 'all' | ExpiryStatus;

// Assembles core.Product + core.Batch + core.StoreInventory (three separate
// flat endpoints) into the nested Product shape lib/inventory.ts's display
// helpers already expect -- keeps those helpers, and every column below,
// unchanged. There's no real supplier link on core.Product, so supplier_id
// is an unused placeholder and the Supplier column is dropped entirely
// rather than showing fabricated data.
const assembleProducts = (
    products: ProductApiRecord[],
    categories: CategoryRecord[],
    batches: BatchApiRecord[],
    inventories: StoreInventoryApiRecord[],
    stores: StoreRecord[],
): Product[] => {
    const categoryName = Object.fromEntries(categories.map((c) => [c.category_id, c.category_name]));
    const storeName = Object.fromEntries(stores.map((s) => [s.store_id, s.store_name]));

    const inventoriesByBatch = new Map<number, StoreInventoryApiRecord[]>();
    inventories.forEach((inv) => {
        const list = inventoriesByBatch.get(inv.batch) ?? [];
        list.push(inv);
        inventoriesByBatch.set(inv.batch, list);
    });

    const batchesByProduct = new Map<number, BatchApiRecord[]>();
    batches.forEach((b) => {
        const list = batchesByProduct.get(b.product) ?? [];
        list.push(b);
        batchesByProduct.set(b.product, list);
    });

    return products.map((p) => ({
        product_id: p.product_id,
        barcode: p.barcode,
        product_name: p.product_name,
        base_price: Number(p.base_price),
        min_threshold: p.min_threshold,
        category: categoryName[p.category] ?? '—',
        photo: '',
        unit: '',
        tags: [],
        description: '',
        supplier_id: 0,
        discountHistory: [],
        batches: (batchesByProduct.get(p.product_id) ?? []).map((b) => ({
            batch_id: b.batch_id,
            product_id: b.product,
            manufacture_date: b.manufacture_date,
            expiration_date: b.expiration_date,
            storeInventory: (inventoriesByBatch.get(b.batch_id) ?? []).map((inv) => ({
                store: storeName[inv.store] ?? '—',
                quantity: inv.quantity,
            })),
        })),
    }));
};

const ComponentsInventoryList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');

    useEffect(() => {
        Promise.all([
            apiFetch<ProductApiRecord[]>('/products/'),
            apiFetch<CategoryRecord[]>('/categories/'),
            apiFetch<BatchApiRecord[]>('/batches/'),
            apiFetch<StoreInventoryApiRecord[]>('/store-inventories/'),
            apiFetch<StoreRecord[]>('/stores/'),
        ])
            .then(([products, categories, batches, inventories, stores]) => {
                setItems(assembleProducts(products, categories, batches, inventories, stores));
            })
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, []);

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
                .then(() => setItems((prev) => prev.filter((p) => p.product_id !== id)))
                .catch(() => {
                    // Leave the row in place — most likely a 4xx because the
                    // product is still referenced elsewhere (e.g. an OrderDetail).
                });
        },
        [t],
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
            { key: 'quantity', header: t('quantity'), sortable: true, align: 'right', sortValue: (p) => getTotalQuantity(p), render: (p) => getTotalQuantity(p) },
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
        [t, deleteProduct],
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
