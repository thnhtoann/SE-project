'use client';

import { Dialog, DialogPanel, Tab, Transition, TransitionChild } from '@headlessui/react';
import { forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import IconX from '@/components/icon/icon-x';
import IconCashBanknotes from '@/components/icon/icon-cash-banknotes';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCircleCheck from '@/components/icon/icon-circle-check';
import IconPrinter from '@/components/icon/icon-printer';
import { CartLineItem, PaymentMethod } from '@/components/apps/pos/pos-data';
import { checkoutThunk, clearCart, CheckoutResult } from '@/store/posSlice';
import { showPosToast } from '@/components/apps/pos/pos-toast';
import { currency } from '@/lib/currency';
import { getTranslation } from '@/i18n';
import { apiFetch, ApiError } from '@/lib/api-client';

const QR_POLL_INTERVAL_MS = 3000;

type Phase = 'idle' | 'processing' | 'completed' | 'rejected';

interface ReceiptSnapshot {
    orderId: number;
    timestamp: string;
    lineItems: CartLineItem[];
    total: number;
    paymentMethod: PaymentMethod;
}

export interface PosCheckoutModalHandle {
    switchTab: () => void;
    changeAmount: (direction: 'up' | 'down' | 'left' | 'right') => void;
    attemptComplete: () => void;
}

interface Props {
    open: boolean;
    cart: CartLineItem[];
    total: number;
    discountPercent: number;
    autoPrintInvoice: boolean;
    storeId: number;
    shiftId: number | null;
    onClose: () => void;
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];

const PosCheckoutModal = forwardRef<PosCheckoutModalHandle, Props>(({ open, cart, total, discountPercent, autoPrintInvoice, storeId, shiftId, onClose }, ref) => {
    const { t } = getTranslation();
    const dispatch = useDispatch<any>();
    const [tab, setTab] = useState<PaymentMethod>('Cash');
    const [phase, setPhase] = useState<Phase>('idle');
    const [tendered, setTendered] = useState(0);
    const [shortAmount, setShortAmount] = useState(false);
    const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
    const [receiptPrinted, setReceiptPrinted] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // PayOS VietQR flow state — a real payment link the customer scans and
    // pays for real; the Order itself is only created server-side once
    // PayOSWebhookView confirms payment (see pos/views.py), so there's
    // nothing to "simulate" here anymore.
    const [qrCheckoutUrl, setQrCheckoutUrl] = useState('');
    const [qrError, setQrError] = useState('');
    const [qrRetryToken, setQrRetryToken] = useState(0);
    const qrOrderCodeRef = useRef<number | null>(null);

    // Fresh state every time the modal opens — a half-typed tender amount from a previous
    // sale must not leak into the next one.
    useEffect(() => {
        if (open) {
            setTab('Cash');
            setPhase('idle');
            setTendered(0);
            setShortAmount(false);
            setReceipt(null);
            setReceiptPrinted(false);
            setRejectReason('');
            setQrCheckoutUrl('');
            setQrError('');
            qrOrderCodeRef.current = null;
        }
    }, [open]);

    // Creates a PayOS payment link as soon as the cashier switches to the Bank
    // QR tab, then polls for the webhook-confirmed result. Cleans up (cancels
    // the intent server-side) if the cashier switches tabs/closes the modal
    // before the customer pays.
    useEffect(() => {
        if (!open || tab !== 'Bank QR' || phase === 'completed' || cart.length === 0) return;

        let cancelled = false;
        let pollTimer: ReturnType<typeof setInterval> | null = null;

        const start = async () => {
            setQrError('');
            setQrCheckoutUrl('');
            try {
                const created = await apiFetch<{ order_code: number; checkout_url: string; amount: number; status: string }>('/pos/qr-payments/', {
                    method: 'POST',
                    body: {
                        store: storeId,
                        shift: shiftId,
                        discount_percent: discountPercent,
                        items: cart.map((li) => ({ product: li.productId, quantity: li.quantity, unit_price: li.unitPrice.toFixed(2) })),
                    },
                });
                if (cancelled) return;
                qrOrderCodeRef.current = created.order_code;
                setQrCheckoutUrl(created.checkout_url);

                pollTimer = setInterval(async () => {
                    try {
                        const poll = await apiFetch<{ status: string; order: CheckoutResult | null }>(`/pos/qr-payments/${created.order_code}/`);
                        if (cancelled || poll.status !== 'Paid' || !poll.order) return;
                        if (pollTimer) clearInterval(pollTimer);

                        setReceipt({
                            orderId: poll.order.order_id,
                            timestamp: poll.order.order_date,
                            lineItems: cart,
                            total: Number(poll.order.total_amount),
                            paymentMethod: 'Bank QR',
                        });
                        dispatch(clearCart());
                        if (autoPrintInvoice) {
                            showPosToast(t('receipt_printed'), 'success');
                            setReceiptPrinted(true);
                        }
                        setPhase('completed');
                    } catch {
                        // Transient poll failure — the next tick tries again.
                    }
                }, QR_POLL_INTERVAL_MS);
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof ApiError && err.body && typeof err.body === 'object' ? (err.body as { detail?: string }).detail : undefined;
                setQrError(message || t('error_payos_unavailable'));
            }
        };

        void start();

        return () => {
            cancelled = true;
            if (pollTimer) clearInterval(pollTimer);
            const orderCode = qrOrderCodeRef.current;
            if (orderCode) {
                void apiFetch(`/pos/qr-payments/${orderCode}/`, { method: 'POST' }).catch(() => {});
                qrOrderCodeRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cart/store/shift/discount are fixed for the lifetime of a single checkout attempt
    }, [open, tab, phase, qrRetryToken]);

    const changeDue = Number((tendered - total).toFixed(2));

    const runCompletionSequence = async (paymentMethod: PaymentMethod) => {
        if (!shiftId) {
            setPhase('rejected');
            setRejectReason(t('no_active_shift'));
            return;
        }
        setPhase('processing');
        try {
            // 1. Payment confirmed -> order created + inventory deducted, atomically, on the
            //    backend (POST /api/orders/checkout/ — core/checkout.py::create_pos_order).
            const order = await dispatch(checkoutThunk({ storeId, shiftId, paymentMethod, discountPercent, items: cart })).unwrap();
            setReceipt({
                orderId: order.order_id,
                timestamp: order.order_date,
                lineItems: cart,
                total: Number(order.total_amount),
                paymentMethod,
            });

            // 2. Cash drawer opens ONLY now — never before this point, and never for a QR sale.
            if (paymentMethod === 'Cash') {
                showPosToast(t('cash_drawer_opened'), 'success');
            }

            // 3. Receipt: automatic if the F10 toggle is on, otherwise the cashier prints manually
            //    from the completed panel (both paths satisfy FR-010, one is just cashier-gated).
            if (autoPrintInvoice) {
                showPosToast(t('receipt_printed'), 'success');
                setReceiptPrinted(true);
            }

            setPhase('completed');
        } catch (err) {
            // checkoutThunk's rejectWithValue always carries a string message (see parseError
            // in store/posSlice.tsx), which unwrap() throws directly.
            const message = typeof err === 'string' && err ? err : t('payment_rejected');
            setRejectReason(message);
            setPhase('rejected');
            showPosToast(message, 'error');
        }
    };

    const handleAttemptComplete = () => {
        // Bank QR has no manual "complete" step anymore — it finishes itself
        // once the PayOS webhook confirms payment (see the polling effect above).
        if (cart.length === 0 || phase === 'processing' || phase === 'completed' || tab !== 'Cash') return; // FR-007 guard
        if (tendered < total) {
            setShortAmount(true);
            return;
        }
        setShortAmount(false);
        void runCompletionSequence('Cash');
    };

    const handleSwitchTab = () => {
        if (phase === 'processing' || phase === 'completed') return;
        setTab((cur) => (cur === 'Cash' ? 'Bank QR' : 'Cash'));
        setPhase('idle');
        setShortAmount(false);
    };

    const handleChangeAmount = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (tab !== 'Cash' || phase === 'processing' || phase === 'completed') return;
        const delta = direction === 'up' || direction === 'right' ? 1000 : -1000;
        setTendered((v) => Math.max(0, v + delta));
    };

    useImperativeHandle(ref, () => ({
        switchTab: handleSwitchTab,
        changeAmount: handleChangeAmount,
        attemptComplete: handleAttemptComplete,
    }));

    const handlePrintReceipt = () => {
        showPosToast(t('receipt_printed'), 'success');
        setReceiptPrinted(true);
    };

    const handleNewSale = () => {
        onClose();
    };

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" open={open} onClose={() => phase !== 'processing' && onClose()}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-[black]/60" />
                </TransitionChild>
                <div className="fixed inset-0 z-[999] overflow-y-auto">
                    <div className="flex min-h-screen items-start justify-center px-4 py-8">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel as="div" className="panel my-8 w-full max-w-lg overflow-hidden rounded-lg border-0 p-0 text-black dark:text-white-dark">
                                <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                    <div className="text-lg font-bold">{t('payment')}</div>
                                    {phase !== 'processing' && (
                                        <button type="button" className="text-white-dark hover:text-dark" onClick={onClose}>
                                            <IconX />
                                        </button>
                                    )}
                                </div>

                                <div className="p-5">
                                    {phase === 'completed' && receipt ? (
                                        <div>
                                            <div className="flex flex-col items-center py-4 text-center">
                                                <IconCircleCheck className="h-12 w-12 text-success" />
                                                <div className="mt-2 text-lg font-semibold">{t('complete')}</div>
                                                <div className="text-white-dark">#{receipt.orderId}</div>
                                            </div>
                                            <div className="rounded-md border border-white-light p-4 dark:border-[#1b2e4b]">
                                                <div className="mb-2 flex justify-between text-xs text-white-dark">
                                                    <span>{new Date(receipt.timestamp).toLocaleString()}</span>
                                                    <span>{receipt.paymentMethod === 'Cash' ? t('cash') : t('bank_qr')}</span>
                                                </div>
                                                {receipt.lineItems.map((li) => (
                                                    <div key={li.productId} className="flex justify-between py-1 text-sm">
                                                        <span>
                                                            {li.name} x{li.quantity}
                                                        </span>
                                                        <span>{currency(li.subTotal)}</span>
                                                    </div>
                                                ))}
                                                <div className="mt-2 flex justify-between border-t border-white-light pt-2 font-semibold dark:border-[#1b2e4b]">
                                                    <span>{t('total')}</span>
                                                    <span>{currency(receipt.total)}</span>
                                                </div>
                                            </div>

                                            {!receiptPrinted && (
                                                <button type="button" className="btn btn-outline-primary mt-4 w-full gap-2" onClick={handlePrintReceipt}>
                                                    <IconPrinter className="h-4 w-4" />
                                                    {t('print_receipt')}
                                                </button>
                                            )}
                                            {receiptPrinted && <div className="mt-4 text-center text-sm text-success">{t('receipt_printed')} ✓</div>}

                                            <button type="button" className="btn btn-primary mt-4 w-full" onClick={handleNewSale}>
                                                {t('new_sale')}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-4 text-center text-2xl font-bold">{currency(total)}</div>

                                            <Tab.Group selectedIndex={tab === 'Cash' ? 0 : 1} onChange={() => handleSwitchTab()}>
                                                <Tab.List className="mb-4 flex gap-2 border-b border-white-light dark:border-[#1b2e4b]">
                                                    <Tab as={Fragment}>
                                                        {({ selected }) => (
                                                            <button
                                                                type="button"
                                                                className={`flex items-center gap-2 border-b-2 px-4 py-2 ${selected ? '!border-primary text-primary' : 'border-transparent'}`}
                                                            >
                                                                <IconCashBanknotes className="h-4 w-4" />
                                                                {t('cash')}
                                                            </button>
                                                        )}
                                                    </Tab>
                                                    <Tab as={Fragment}>
                                                        {({ selected }) => (
                                                            <button
                                                                type="button"
                                                                className={`flex items-center gap-2 border-b-2 px-4 py-2 ${selected ? '!border-primary text-primary' : 'border-transparent'}`}
                                                            >
                                                                <IconCreditCard className="h-4 w-4" />
                                                                {t('bank_qr')}
                                                            </button>
                                                        )}
                                                    </Tab>
                                                </Tab.List>
                                            </Tab.Group>

                                            {tab === 'Cash' ? (
                                                <div>
                                                    <label htmlFor="tendered">{t('amount_received')}</label>
                                                    <input
                                                        id="tendered"
                                                        type="number"
                                                        min={0}
                                                        step="1000"
                                                        className="form-input"
                                                        value={tendered}
                                                        onChange={(e) => {
                                                            setShortAmount(false);
                                                            setTendered(Number(e.target.value));
                                                        }}
                                                    />
                                                    <div className="mt-3 grid grid-cols-5 gap-2">
                                                        {QUICK_AMOUNTS.map((amount) => (
                                                            <button
                                                                key={amount}
                                                                type="button"
                                                                className="btn btn-outline-primary"
                                                                onClick={() => {
                                                                    setShortAmount(false);
                                                                    setTendered(amount);
                                                                }}
                                                            >
                                                                {currency(amount)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 flex items-center justify-between text-lg">
                                                        <span>{t('change_due')}</span>
                                                        <span className={`font-semibold ${changeDue < 0 ? 'text-danger' : 'text-success'}`}>{currency(Math.max(0, changeDue))}</span>
                                                    </div>
                                                    {shortAmount && <div className="mt-2 text-sm text-danger">{t('amount_short')}</div>}
                                                    {phase === 'rejected' && <div className="mt-2 text-sm text-danger">{rejectReason}</div>}
                                                    <button type="button" className="btn btn-primary mt-4 w-full" disabled={phase === 'processing'} onClick={handleAttemptComplete}>
                                                        {t('complete')} (F9)
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    {qrError ? (
                                                        <div className="flex w-full flex-col items-center gap-3 py-6">
                                                            <div className="text-center text-sm text-danger">{qrError}</div>
                                                            <button type="button" className="btn btn-outline-primary" onClick={() => setQrRetryToken((n) => n + 1)}>
                                                                {t('try_again')}
                                                            </button>
                                                        </div>
                                                    ) : qrCheckoutUrl ? (
                                                        <>
                                                            <iframe src={qrCheckoutUrl} title="PayOS checkout" className="h-80 w-full rounded-md border border-white-light dark:border-[#1b2e4b]" />
                                                            <div className="mt-3 flex items-center gap-2 text-sm text-white-dark">
                                                                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                                                                {t('waiting_for_payment')}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex w-full flex-col items-center gap-3 py-10">
                                                            <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                            <div className="text-sm text-white-dark">{t('creating_qr_code')}</div>
                                                        </div>
                                                    )}

                                                    <button type="button" className="btn btn-outline-danger mt-4 w-full" onClick={handleSwitchTab}>
                                                        {t('cancel')}
                                                    </button>
                                                </div>
                                            )}

                                            <div className="mt-4 text-center text-xs text-white-dark">
                                                Press Space to switch payment method · Use Arrow keys to change amount
                                            </div>
                                        </>
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
});

PosCheckoutModal.displayName = 'PosCheckoutModal';

export default PosCheckoutModal;
