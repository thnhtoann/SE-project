'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { addLineItem, fetchActiveShift, removeLineItem, setDiscountPercent, setLineItemQuantity, toggleAutoPrint } from '@/store/posSlice';
import PosProductSearch from './pos-product-search';
import PosCartLineItemRow from './pos-cart-line-item-row';
import PosCheckoutModal, { PosCheckoutModalHandle } from './pos-checkout-modal';
import PosToastContainer, { showPosToast } from '@/components/apps/pos/pos-toast';
import { useGlobalHotkeys } from '@/components/apps/pos/pos-hotkeys';
import { useStoreCatalog, CatalogEntry } from '@/lib/hooks/use-store-catalog';
import { currency } from '@/lib/currency';
import { getTranslation } from '@/i18n';

const ComponentsAppsPosSalesCart = () => {
    const { t } = getTranslation();
    const dispatch = useDispatch<any>();
    const cart = useSelector((state: IRootState) => state.pos.cart);
    const discountPercent = useSelector((state: IRootState) => state.pos.discountPercent);
    const autoPrintInvoice = useSelector((state: IRootState) => state.pos.autoPrintInvoice);
    const activeShift = useSelector((state: IRootState) => state.pos.activeShift);
    const username = useSelector((state: IRootState) => state.session.username);
    const storeId = useSelector((state: IRootState) => state.session.storeId);

    const { entries, loading: catalogLoading } = useStoreCatalog(storeId);

    const [searchValue, setSearchValue] = useState('');
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const checkoutModalRef = useRef<PosCheckoutModalHandle>(null);

    useEffect(() => {
        if (storeId) dispatch(fetchActiveShift(storeId));
    }, [dispatch, storeId]);

    const subtotal = useMemo(() => Number(cart.reduce((sum, li) => sum + li.subTotal, 0).toFixed(2)), [cart]);
    const discountAmount = Number((subtotal * (discountPercent / 100)).toFixed(2));
    const total = Number((subtotal - discountAmount).toFixed(2));

    const suggestions = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return [];
        return entries.filter((e) => e.product.product_name.toLowerCase().includes(q) || e.product.barcode.includes(q)).slice(0, 6);
    }, [entries, searchValue]);

    const findEntry = (query: string): CatalogEntry | undefined => {
        const trimmed = query.trim();
        const q = trimmed.toLowerCase();
        if (!q) return undefined;
        return (
            entries.find((e) => e.product.barcode === trimmed) ||
            entries.find((e) => e.product.product_name.toLowerCase() === q) ||
            entries.find((e) => e.product.product_name.toLowerCase().includes(q) || e.product.barcode.includes(q))
        );
    };

    const handleAddProduct = (entry: CatalogEntry) => {
        if (entry.available <= 0) {
            showPosToast(`${t('out_of_stock')}: ${entry.product.product_name}`, 'error');
            return;
        }
        dispatch(addLineItem({ product: entry.product, unitPrice: entry.unitPrice }));
        setSearchValue('');
    };

    const handleScanSubmit = () => {
        if (!searchValue.trim()) return;
        const entry = findEntry(searchValue);
        if (!entry) {
            showPosToast(t('product_not_found'), 'error');
            return;
        }
        handleAddProduct(entry);
    };

    const handleDiscount = () => {
        const input = window.prompt(`${t('discount')} (%)`, String(discountPercent));
        if (input === null) return;
        const value = Number(input);
        if (!Number.isNaN(value)) dispatch(setDiscountPercent(value));
    };

    const handleOpenCheckout = () => {
        if (cart.length === 0) {
            showPosToast('Cart is empty', 'error');
            return;
        }
        if (!activeShift) {
            showPosToast(t('no_active_shift'), 'error');
            return;
        }
        setCheckoutOpen(true);
    };

    useGlobalHotkeys({
        onScanSubmit: handleScanSubmit,
        onDiscount: handleDiscount,
        onCheckoutOrComplete: () => {
            if (!checkoutOpen) {
                handleOpenCheckout();
            } else {
                checkoutModalRef.current?.attemptComplete();
            }
        },
        onToggleAutoPrint: () => dispatch(toggleAutoPrint()),
        onSwitchPaymentTab: () => checkoutModalRef.current?.switchTab(),
        onChangeAmount: (direction) => checkoutModalRef.current?.changeAmount(direction),
        checkoutModalOpen: checkoutOpen,
    });

    return (
        <div className="flex flex-col gap-4 xl:flex-row">
            <PosToastContainer />
            <div className="panel flex-1 px-4 py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="text-lg font-bold">{t('sales_cart')}</div>
                        <div className="text-sm text-white-dark">
                            {t('employee')}: {username ?? '—'}
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`btn gap-2 ${autoPrintInvoice ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => dispatch(toggleAutoPrint())}
                    >
                        {t('auto_print_invoice')} (F10): {autoPrintInvoice ? 'On' : 'Off'}
                    </button>
                </div>

                {!activeShift && (
                    <div className="mb-4 rounded-md border border-warning bg-warning-light px-4 py-3 text-sm text-warning dark:bg-warning/10">
                        {t('no_active_shift')}
                    </div>
                )}

                <PosProductSearch value={searchValue} onChange={setSearchValue} suggestions={suggestions} onSelectSuggestion={handleAddProduct} />

                <div className="mt-6 table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th className="w-1">Qty</th>
                                <th className="w-1">Price</th>
                                <th className="w-1">Subtotal</th>
                                <th className="w-1"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="!text-center font-semibold text-white-dark">
                                        {catalogLoading ? t('loading') : 'No items yet — scan a barcode or search above'}
                                    </td>
                                </tr>
                            )}
                            {cart.map((item) => (
                                <PosCartLineItemRow
                                    key={item.productId}
                                    item={item}
                                    onQuantityChange={(productId, quantity) => dispatch(setLineItemQuantity({ productId, quantity }))}
                                    onRemove={(productId) => dispatch(removeLineItem({ productId }))}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="w-full xl:w-96">
                <div className="panel">
                    <div className="flex items-center justify-between py-1">
                        <span>{t('subtotal')} ({cart.length} items)</span>
                        <span>{currency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                        <span>
                            {t('discount')} (F6){discountPercent > 0 ? ` — ${discountPercent}%` : ''}
                        </span>
                        <span>{currency(discountAmount)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-white-light pt-2 text-lg font-bold dark:border-[#1b2e4b]">
                        <span>{t('customer_owes')}</span>
                        <span>{currency(total)}</span>
                    </div>

                    <button type="button" className="btn btn-primary mt-4 w-full" onClick={handleOpenCheckout}>
                        {t('checkout')} (F9)
                    </button>
                </div>
            </div>

            <PosCheckoutModal
                ref={checkoutModalRef}
                open={checkoutOpen}
                cart={cart}
                total={total}
                discountPercent={discountPercent}
                autoPrintInvoice={autoPrintInvoice}
                storeId={storeId ?? 0}
                shiftId={activeShift?.shift_id ?? null}
                onClose={() => setCheckoutOpen(false)}
            />
        </div>
    );
};

export default ComponentsAppsPosSalesCart;
