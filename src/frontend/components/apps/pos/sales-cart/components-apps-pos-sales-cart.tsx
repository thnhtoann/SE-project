'use client';

import { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { addLineItem, removeLineItem, setDiscountPercent, setLineItemQuantity, toggleAutoPrint } from '@/store/posSlice';
import { CURRENT_BRANCH, CURRENT_EMPLOYEE, mockProducts, Product } from '@/components/apps/pos/pos-data';
import PosProductSearch from './pos-product-search';
import PosCartLineItemRow from './pos-cart-line-item-row';
import PosCheckoutModal, { PosCheckoutModalHandle } from './pos-checkout-modal';
import PosToastContainer, { showPosToast } from '@/components/apps/pos/pos-toast';
import { useGlobalHotkeys } from '@/components/apps/pos/pos-hotkeys';
import { getTranslation } from '@/i18n';

const ComponentsAppsPosSalesCart = () => {
    const { t } = getTranslation();
    const dispatch = useDispatch();
    const cart = useSelector((state: IRootState) => state.pos.cart);
    const discountPercent = useSelector((state: IRootState) => state.pos.discountPercent);
    const autoPrintInvoice = useSelector((state: IRootState) => state.pos.autoPrintInvoice);
    const inventory = useSelector((state: IRootState) => state.pos.inventory);

    const [searchValue, setSearchValue] = useState('');
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const checkoutModalRef = useRef<PosCheckoutModalHandle>(null);

    const subtotal = useMemo(() => Number(cart.reduce((sum, li) => sum + li.subTotal, 0).toFixed(2)), [cart]);
    const discountAmount = Number((subtotal * (discountPercent / 100)).toFixed(2));
    const total = Number((subtotal - discountAmount).toFixed(2));

    const suggestions = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return [];
        return mockProducts.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q)).slice(0, 6);
    }, [searchValue]);

    const findProduct = (query: string): Product | undefined => {
        const trimmed = query.trim();
        const q = trimmed.toLowerCase();
        if (!q) return undefined;
        return (
            mockProducts.find((p) => p.barcode === trimmed) ||
            mockProducts.find((p) => p.name.toLowerCase() === q) ||
            mockProducts.find((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
        );
    };

    const handleAddProduct = (product: Product) => {
        const inv = inventory.find((r) => r.productId === product.id);
        if (!inv || inv.available <= 0) {
            showPosToast(`${t('out_of_stock')}: ${product.name}`, 'error');
            return;
        }
        dispatch(addLineItem(product));
        setSearchValue('');
    };

    const handleScanSubmit = () => {
        if (!searchValue.trim()) return;
        const product = findProduct(searchValue);
        if (!product) {
            showPosToast(t('product_not_found'), 'error');
            return;
        }
        handleAddProduct(product);
    };

    const handleAddCustomProduct = (name: string, price: number) => {
        const customProduct: Product = {
            id: `custom-${Date.now()}`,
            barcode: '—',
            name,
            basePrice: price,
            category: 'Custom',
            unit: 'item',
        };
        dispatch(addLineItem(customProduct));
        setShowCustomForm(false);
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
        setCheckoutOpen(true);
    };

    useGlobalHotkeys({
        onScanSubmit: handleScanSubmit,
        onCustomProduct: () => setShowCustomForm((v) => !v),
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
                            {t('employee')}: {CURRENT_EMPLOYEE.name} · {CURRENT_BRANCH}
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

                <PosProductSearch
                    value={searchValue}
                    onChange={setSearchValue}
                    suggestions={suggestions}
                    onSelectSuggestion={handleAddProduct}
                    showCustomForm={showCustomForm}
                    onCloseCustomForm={() => setShowCustomForm(false)}
                    onAddCustomProduct={handleAddCustomProduct}
                />

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
                                        No items yet — scan a barcode or search above
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
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                        <span>
                            {t('discount')} (F6){discountPercent > 0 ? ` — ${discountPercent}%` : ''}
                        </span>
                        <span>${discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-white-light pt-2 text-lg font-bold dark:border-[#1b2e4b]">
                        <span>{t('customer_owes')}</span>
                        <span>${total.toFixed(2)}</span>
                    </div>

                    <button type="button" className="btn btn-primary mt-4 w-full" onClick={handleOpenCheckout}>
                        {t('checkout')} (F9)
                    </button>
                    <button type="button" className="btn btn-outline-primary mt-2 w-full" onClick={() => setShowCustomForm((v) => !v)}>
                        {t('custom_product')} (F2)
                    </button>
                </div>
            </div>

            <PosCheckoutModal ref={checkoutModalRef} open={checkoutOpen} cart={cart} total={total} autoPrintInvoice={autoPrintInvoice} onClose={() => setCheckoutOpen(false)} />
        </div>
    );
};

export default ComponentsAppsPosSalesCart;
