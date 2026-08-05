'use client';

import { Dialog, DialogPanel, Tab, Transition, TransitionChild } from '@headlessui/react';
import { forwardRef, Fragment, useEffect, useImperativeHandle, useState } from 'react';
import { useDispatch } from 'react-redux';
import IconX from '@/components/icon/icon-x';
import IconCashBanknotes from '@/components/icon/icon-cash-banknotes';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCircleCheck from '@/components/icon/icon-circle-check';
import IconPrinter from '@/components/icon/icon-printer';
import { CartLineItem, PaymentMethod } from '@/components/apps/pos/pos-data';
import { completeOrder } from '@/store/posSlice';
import { showPosToast } from '@/components/apps/pos/pos-toast';
import { getTranslation } from '@/i18n';

type Phase = 'idle' | 'awaiting_bank_confirm' | 'processing' | 'completed' | 'rejected';

interface ReceiptSnapshot {
    orderId: string;
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
    autoPrintInvoice: boolean;
    onClose: () => void;
}

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

function generateOrderId(): string {
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    return `ORD-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
}

const PosCheckoutModal = forwardRef<PosCheckoutModalHandle, Props>(({ open, cart, total, autoPrintInvoice, onClose }, ref) => {
    const { t } = getTranslation();
    const dispatch = useDispatch();
    const [tab, setTab] = useState<PaymentMethod>('cash');
    const [phase, setPhase] = useState<Phase>('idle');
    const [tendered, setTendered] = useState(0);
    const [shortAmount, setShortAmount] = useState(false);
    const [receipt, setReceipt] = useState<ReceiptSnapshot | null>(null);
    const [receiptPrinted, setReceiptPrinted] = useState(false);

    // Fresh state every time the modal opens — a half-typed tender amount from a previous
    // sale must not leak into the next one.
    useEffect(() => {
        if (open) {
            setTab('cash');
            setPhase('idle');
            setTendered(0);
            setShortAmount(false);
            setReceipt(null);
            setReceiptPrinted(false);
        }
    }, [open]);

    const changeDue = Number((tendered - total).toFixed(2));

    const runCompletionSequence = (paymentMethod: PaymentMethod) => {
        setPhase('processing');
        const orderId = generateOrderId();
        const snapshot: ReceiptSnapshot = {
            orderId,
            timestamp: new Date().toISOString(),
            lineItems: cart,
            total,
            paymentMethod,
        };
        // 1. Payment confirmed -> inventory deducted + order saved (one atomic dispatch).
        dispatch(completeOrder({ paymentMethod, orderId }));
        setReceipt(snapshot);

        // 2. Cash drawer opens ONLY now — never before this point, and never for a QR sale.
        if (paymentMethod === 'cash') {
            showPosToast(t('cash_drawer_opened'), 'success');
        }

        // 3. Receipt: automatic if the F10 toggle is on, otherwise the cashier prints manually
        //    from the completed panel (both paths satisfy FR-010, one is just cashier-gated).
        if (autoPrintInvoice) {
            showPosToast(t('receipt_printed'), 'success');
            setReceiptPrinted(true);
        }

        setPhase('completed');
    };

    const handleAttemptComplete = () => {
        if (cart.length === 0 || phase === 'processing' || phase === 'completed') return; // FR-007 guard
        if (tab === 'cash') {
            if (tendered < total) {
                setShortAmount(true);
                return;
            }
            setShortAmount(false);
            runCompletionSequence('cash');
        } else {
            handleSimulateConfirm();
        }
    };

    const handleSimulateConfirm = () => {
        if (phase === 'processing' || phase === 'completed') return; // FR-007 guard
        runCompletionSequence('bank_qr');
    };

    const handleSimulateReject = () => {
        if (phase === 'processing' || phase === 'completed') return;
        setPhase('rejected');
        showPosToast(t('payment_rejected'), 'error');
    };

    const handleSwitchTab = () => {
        if (phase === 'processing' || phase === 'completed') return;
        setTab((cur) => (cur === 'cash' ? 'bank_qr' : 'cash'));
        setPhase('idle');
        setShortAmount(false);
    };

    const handleChangeAmount = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (tab !== 'cash' || phase === 'processing' || phase === 'completed') return;
        const delta = direction === 'up' || direction === 'right' ? 1 : -1;
        setTendered((v) => Math.max(0, Number((v + delta).toFixed(2))));
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
                                                <div className="text-white-dark">{receipt.orderId}</div>
                                            </div>
                                            <div className="rounded-md border border-white-light p-4 dark:border-[#1b2e4b]">
                                                <div className="mb-2 flex justify-between text-xs text-white-dark">
                                                    <span>{new Date(receipt.timestamp).toLocaleString()}</span>
                                                    <span>{receipt.paymentMethod === 'cash' ? t('cash') : t('bank_qr')}</span>
                                                </div>
                                                {receipt.lineItems.map((li) => (
                                                    <div key={li.productId} className="flex justify-between py-1 text-sm">
                                                        <span>
                                                            {li.name} x{li.quantity}
                                                        </span>
                                                        <span>${li.subTotal.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                                <div className="mt-2 flex justify-between border-t border-white-light pt-2 font-semibold dark:border-[#1b2e4b]">
                                                    <span>{t('total')}</span>
                                                    <span>${receipt.total.toFixed(2)}</span>
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
                                            <div className="mb-4 text-center text-2xl font-bold">${total.toFixed(2)}</div>

                                            <Tab.Group selectedIndex={tab === 'cash' ? 0 : 1} onChange={() => handleSwitchTab()}>
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

                                            {tab === 'cash' ? (
                                                <div>
                                                    <label htmlFor="tendered">{t('amount_received')}</label>
                                                    <input
                                                        id="tendered"
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
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
                                                                ${amount}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="mt-4 flex items-center justify-between text-lg">
                                                        <span>{t('change_due')}</span>
                                                        <span className={`font-semibold ${changeDue < 0 ? 'text-danger' : 'text-success'}`}>
                                                            ${Math.max(0, changeDue).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {shortAmount && <div className="mt-2 text-sm text-danger">{t('amount_short')}</div>}
                                                    <button type="button" className="btn btn-primary mt-4 w-full" onClick={handleAttemptComplete}>
                                                        {t('complete')} (F9)
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    {/* Fake QR placeholder — no real payment webhook exists in this build. */}
                                                    <div className="grid h-40 w-40 grid-cols-8 grid-rows-8 gap-0.5 rounded-md border border-white-light bg-white p-2 dark:border-[#1b2e4b]">
                                                        {Array.from({ length: 64 }).map((_, i) => {
                                                            const row = Math.floor(i / 8);
                                                            const col = i % 8;
                                                            // Deterministic pseudo-random-looking pattern (checkerboard perturbed by the
                                                            // order total) — just a visual stand-in, not a real encoded QR code.
                                                            const on = (row * 3 + col * 5 + Math.round(total * 100)) % 2 === 0;
                                                            return <div key={i} className={on ? 'bg-black' : 'bg-transparent'} />;
                                                        })}
                                                    </div>
                                                    <div className="mt-3 text-center text-sm text-white-dark">Scan to pay ${total.toFixed(2)}</div>

                                                    {phase === 'rejected' && <div className="mt-3 text-sm text-danger">{t('payment_rejected')}</div>}

                                                    <div className="mt-2 text-center text-xs text-white-dark">Demo stand-in — no real payment webhook in this build</div>
                                                    <button type="button" className="btn btn-primary mt-4 w-full" onClick={handleSimulateConfirm}>
                                                        {t('simulate_bank_confirmation')} (F9)
                                                    </button>
                                                    <button type="button" className="btn btn-outline-danger mt-2 w-full" onClick={handleSimulateReject}>
                                                        {t('simulate_rejection')}
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
