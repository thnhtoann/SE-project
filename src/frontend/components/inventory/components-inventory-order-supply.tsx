'use client';
import IconBox from '@/components/icon/icon-box';
import IconPlus from '@/components/icon/icon-plus';
import IconRefresh from '@/components/icon/icon-refresh';
import IconSend from '@/components/icon/icon-send';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconX from '@/components/icon/icon-x';
import { PRODUCTS, SUPPLIERS } from '@/data/mock-products';
import { getTranslation } from '@/i18n';
import { getStockStatus, getTotalQuantity, stockStatusBadgeClass, stockStatusKey } from '@/lib/inventory';
import { Product } from '@/types/admin';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const currency = (value: number) => `₫${Math.round(value).toLocaleString('en-US')}`;
const today = () => new Date().toISOString().slice(0, 10);

interface LineItem {
    id: number;
    productId: string;
    quantity: string;
    unitCost: string;
}

const emptyItems: LineItem[] = [{ id: 1, productId: '', quantity: '', unitCost: '' }];

const nextItemId = (items: LineItem[]) => items.reduce((max, i) => Math.max(max, i.id), 0) + 1;

const ComponentsInventoryOrderSupply = () => {
    const { t } = getTranslation();

    const [supplierId, setSupplierId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<LineItem[]>(emptyItems);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const supplier = SUPPLIERS.find((s) => s.supplier_id === Number(supplierId));
    const availableProducts = useMemo(() => PRODUCTS.filter((p) => p.supplier_id === Number(supplierId)), [supplierId]);
    const lowStockCandidates = useMemo(() => availableProducts.filter((p) => getStockStatus(p) !== 'In Stock'), [availableProducts]);

    const productOptions = (rowProductId: string) =>
        availableProducts.filter((p) => String(p.product_id) === rowProductId || !items.some((i) => i.productId === String(p.product_id)));

    const productById = (id: string): Product | undefined => availableProducts.find((p) => String(p.product_id) === id);

    const changeSupplier = (id: string) => {
        setSupplierId(id);
        setItems(emptyItems);
        setError('');
        setSuccessMessage('');
    };

    const changeItem = (id: number, patch: Partial<LineItem>) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    };

    const changeItemProduct = (id: number, productId: string) => {
        const product = productById(productId);
        changeItem(id, { productId, unitCost: product ? String(product.base_price) : '' });
    };

    const addItem = () => {
        if (!supplierId) return;
        setItems((prev) => [...prev, { id: nextItemId(prev), productId: '', quantity: '', unitCost: '' }]);
    };

    const removeItem = (id: number) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const quickAddLowStock = () => {
        const existingIds = new Set(items.map((i) => i.productId));
        const additions: LineItem[] = [];
        let id = nextItemId(items);
        lowStockCandidates.forEach((p) => {
            if (existingIds.has(String(p.product_id))) return;
            const currentQty = getTotalQuantity(p);
            const suggestedQty = Math.max(p.min_threshold * 2 - currentQty, p.min_threshold);
            additions.push({ id: id++, productId: String(p.product_id), quantity: String(suggestedQty), unitCost: String(p.base_price) });
        });
        if (additions.length === 0) return;
        setItems((prev) => [...prev.filter((i) => i.productId), ...additions]);
    };

    const totals = items.reduce(
        (acc, i) => {
            if (!i.productId) return acc;
            const qty = Number(i.quantity) || 0;
            const cost = Number(i.unitCost) || 0;
            return { lineCount: acc.lineCount + 1, quantity: acc.quantity + qty, subtotal: acc.subtotal + qty * cost };
        },
        { lineCount: 0, quantity: 0, subtotal: 0 },
    );

    const resetOrder = () => {
        setSupplierId('');
        setExpectedDate('');
        setNotes('');
        setItems(emptyItems);
        setError('');
        setSuccessMessage('');
    };

    const submitOrder = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!supplierId) return setError(t('error_select_supplier'));
        const validItems = items.filter((i) => i.productId);
        if (validItems.length === 0) return setError(t('error_add_at_least_one_item'));
        if (validItems.some((i) => !i.quantity || Number(i.quantity) <= 0)) return setError(t('error_line_item_incomplete'));

        setSuccessMessage(
            `${t('order_sent_prefix')} ${supplier?.supplier_name ?? ''} — ${totals.lineCount} ${t('items_lowercase')}, ${totals.quantity} ${t('units')}, ${t('total')} ${currency(totals.subtotal)}.`,
        );
        setSupplierId('');
        setExpectedDate('');
        setNotes('');
        setItems(emptyItems);
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/inventory" className="text-primary hover:underline">
                        {t('inventory')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('order_supply')}</span>
                </li>
            </ul>

            <div className="pt-5">
                {successMessage && (
                    <div className="mb-5 flex items-center justify-between rounded border border-success bg-success-light px-4 py-3 text-success dark:bg-success dark:bg-opacity-20">
                        <div>
                            <span className="font-semibold">{t('order_sent_title')}:</span> {successMessage}
                        </div>
                        <button type="button" onClick={() => setSuccessMessage('')} className="shrink-0 hover:opacity-70">
                            <IconX className="h-4 w-4" />
                        </button>
                    </div>
                )}
                {error && <div className="mb-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{error}</div>}

                <form onSubmit={submitOrder} className="flex flex-col gap-5 xl:flex-row">
                    <div className="panel flex-1">
                        <div className="mb-5 flex items-center gap-2">
                            <IconShoppingCart className="h-5 w-5 shrink-0 text-primary" />
                            <h2 className="text-xl">{t('new_supply_order')}</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                            <div>
                                <label htmlFor="supplierId">{t('supplier')}</label>
                                <select id="supplierId" className="form-select" value={supplierId} onChange={(e) => changeSupplier(e.target.value)}>
                                    <option value="">{t('select_supplier')}</option>
                                    {SUPPLIERS.map((s) => (
                                        <option key={s.supplier_id} value={s.supplier_id}>
                                            {s.supplier_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="orderDate">{t('order_date')}</label>
                                <input id="orderDate" type="text" className="form-input" value={today()} disabled />
                            </div>
                            <div>
                                <label htmlFor="expectedDate">{t('expected_delivery_date')}</label>
                                <input
                                    id="expectedDate"
                                    type="date"
                                    className="form-input"
                                    min={today()}
                                    value={expectedDate}
                                    onChange={(e) => setExpectedDate(e.target.value)}
                                    disabled={!supplierId}
                                />
                            </div>
                        </div>

                        <hr className="my-6 border-white-light dark:border-[#1b2e4b]" />

                        {!supplierId ? (
                            <div className="grid place-content-center gap-2 rounded-md border border-dashed border-white-light py-14 text-center text-white-dark dark:border-[#1b2e4b]">
                                <IconBox className="mx-auto h-8 w-8" />
                                <p>{t('choose_supplier_to_begin')}</p>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <h5 className="text-lg font-semibold">{t('order_items')}</h5>
                                    <button type="button" className="btn btn-outline-primary btn-sm gap-2" onClick={quickAddLowStock} disabled={lowStockCandidates.length === 0}>
                                        <IconRefresh className="h-4 w-4" />
                                        {t('quick_add_low_stock')}
                                    </button>
                                </div>
                                {lowStockCandidates.length === 0 && <p className="-mt-3 mb-4 text-sm text-white-dark">{t('quick_add_low_stock_none')}</p>}

                                <div className="table-responsive">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>{t('product_name')}</th>
                                                <th className="w-1">{t('quantity')}</th>
                                                <th className="w-1">{t('unit_cost')}</th>
                                                <th className="w-1">{t('line_total')}</th>
                                                <th className="w-1"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="!text-center font-semibold text-white-dark">
                                                        {t('no_items_added')}
                                                    </td>
                                                </tr>
                                            )}
                                            {items.map((item) => {
                                                const product = productById(item.productId);
                                                const stockStatus = product ? getStockStatus(product) : null;
                                                const qty = Number(item.quantity) || 0;
                                                const cost = Number(item.unitCost) || 0;
                                                return (
                                                    <tr className="align-top" key={item.id}>
                                                        <td>
                                                            <select
                                                                className="form-select min-w-[220px]"
                                                                value={item.productId}
                                                                onChange={(e) => changeItemProduct(item.id, e.target.value)}
                                                            >
                                                                <option value="">{t('select_product')}</option>
                                                                {productOptions(item.productId).map((p) => (
                                                                    <option key={p.product_id} value={p.product_id}>
                                                                        {p.product_name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {product && stockStatus && (
                                                                <div className="mt-2 flex items-center gap-2 text-xs">
                                                                    <span className={`badge ${stockStatusBadgeClass[stockStatus]}`}>{t(stockStatusKey[stockStatus])}</span>
                                                                    <span className="text-white-dark">
                                                                        {t('quantity_on_hand')}: {getTotalQuantity(product)} {product.unit}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-input w-28"
                                                                min={0}
                                                                value={item.quantity}
                                                                onChange={(e) => changeItem(item.id, { quantity: e.target.value })}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-input w-32"
                                                                min={0}
                                                                value={item.unitCost}
                                                                onChange={(e) => changeItem(item.id, { unitCost: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="whitespace-nowrap pt-3 font-semibold">{currency(qty * cost)}</td>
                                                        <td>
                                                            <button type="button" onClick={() => removeItem(item.id)} className="mt-1 hover:text-danger" title={t('remove_item')}>
                                                                <IconTrashLines />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <button type="button" className="btn btn-primary mt-4 gap-2" onClick={addItem}>
                                    <IconPlus />
                                    {t('add_item')}
                                </button>

                                <div className="mt-6">
                                    <label htmlFor="notes">{t('notes_to_supplier')}</label>
                                    <textarea
                                        id="notes"
                                        rows={3}
                                        className="form-textarea resize-none"
                                        placeholder={t('notes_to_supplier_placeholder')}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full xl:w-96">
                        <div className="panel mb-5">
                            <h5 className="mb-4 text-lg font-semibold">{t('order_summary')}</h5>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-white-dark">{t('supplier')}</span>
                                    <span className="font-semibold">{supplier?.supplier_name ?? '—'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white-dark">{t('total_line_items')}</span>
                                    <span className="font-semibold">{totals.lineCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-white-dark">{t('total_quantity')}</span>
                                    <span className="font-semibold">{totals.quantity}</span>
                                </div>
                                <hr className="border-white-light dark:border-[#1b2e4b]" />
                                <div className="flex items-center justify-between text-lg">
                                    <span className="font-semibold">{t('subtotal')}</span>
                                    <span className="font-bold text-primary">{currency(totals.subtotal)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="panel">
                            <div className="grid grid-cols-1 gap-4">
                                <button type="submit" className="btn btn-success w-full gap-2">
                                    <IconSend className="h-4.5 w-4.5 shrink-0" />
                                    {t('submit_order')}
                                </button>
                                <button type="button" className="btn btn-outline-danger w-full gap-2" onClick={resetOrder}>
                                    <IconRefresh className="h-4.5 w-4.5 shrink-0" />
                                    {t('reset_order')}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComponentsInventoryOrderSupply;
