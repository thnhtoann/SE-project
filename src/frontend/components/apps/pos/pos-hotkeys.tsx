'use client';

import { useEffect, useRef } from 'react';

export interface PosHotkeyHandlers {
    onScanSubmit?: () => void;
    onCustomProduct?: () => void;
    onDiscount?: () => void;
    onCheckoutOrComplete?: () => void;
    onToggleAutoPrint?: () => void;
    onSwitchPaymentTab?: () => void;
    onChangeAmount?: (direction: 'up' | 'down' | 'left' | 'right') => void;
    /** While true, only Space / Arrow keys / F9 are active (the S05 payment modal's own hotkeys). */
    checkoutModalOpen?: boolean;
}

const ARROW_DIRECTIONS: Record<string, 'up' | 'down' | 'left' | 'right'> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
};

/**
 * Global hotkeys for the Sales Cart (S04) + Payment modal (S05) flow, mounted once from the
 * Sales Cart screen only — the other POS screens don't define these F-keys, so there's no
 * cross-screen collision to guard against.
 *
 * A hardware barcode scanner behaves as a keyboard wedge (rapid keystrokes + Enter into
 * whatever input has focus), so barcode scanning has no separate handler here — it's just
 * "Enter fires onScanSubmit while the barcode/search input has focus," identical to a cashier
 * typing a SKU manually. No WebUSB/WebBluetooth permission flow is involved.
 */
export function useGlobalHotkeys(handlers: PosHotkeyHandlers) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const h = handlersRef.current;
            const target = e.target as HTMLElement;
            const isBarcodeInput = target?.dataset?.posBarcodeInput === 'true';
            const isTextInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

            if (isBarcodeInput && e.key === 'Enter') {
                h.onScanSubmit?.();
                return;
            }

            if (h.checkoutModalOpen) {
                // Only these three apply while the payment modal is open — F2/F6/F10 are
                // cart-level actions and are inert once checkout has started.
                if (e.key === ' ') {
                    e.preventDefault();
                    h.onSwitchPaymentTab?.();
                } else if (ARROW_DIRECTIONS[e.key]) {
                    e.preventDefault();
                    h.onChangeAmount?.(ARROW_DIRECTIONS[e.key]);
                } else if (e.key === 'F9') {
                    e.preventDefault();
                    h.onCheckoutOrComplete?.();
                }
                return;
            }

            // F2/F6/F9/F10 fire regardless of the barcode input's focus (they're function keys,
            // never typed as part of a barcode) but are suppressed while focus sits in any OTHER
            // text field (an order note, the F2 custom-product form) so typing there can't
            // accidentally trigger a hotkey.
            if (isTextInput && !isBarcodeInput) return;

            switch (e.key) {
                case 'F2':
                    e.preventDefault();
                    h.onCustomProduct?.();
                    break;
                case 'F6':
                    e.preventDefault();
                    h.onDiscount?.();
                    break;
                case 'F9':
                    e.preventDefault();
                    h.onCheckoutOrComplete?.();
                    break;
                case 'F10':
                    e.preventDefault();
                    h.onToggleAutoPrint?.();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
}
