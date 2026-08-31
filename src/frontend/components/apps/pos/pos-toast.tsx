'use client';

// Small self-built toast used to simulate hardware feedback (receipt printed, drawer opened)
// and validation errors (product not found, out of stock). No external dependency
// (sweetalert2) is installed in this repo, and pulling one in for a handful of toasts isn't
// worth it — this is a module-level pub/sub so any POS component can call showPosToast()
// without provider wiring, then <PosToastContainer /> (mounted once on the POS layout) renders
// whatever's active.

import { useEffect, useState } from 'react';
import IconCircleCheck from '@/components/icon/icon-circle-check';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconX from '@/components/icon/icon-x';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
    id: number;
    message: string;
    variant: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
    listeners.forEach((l) => l(toasts));
}

export function showPosToast(message: string, variant: ToastVariant = 'info') {
    const id = nextId++;
    toasts = [...toasts, { id, message, variant }];
    emit();
    setTimeout(() => {
        toasts = toasts.filter((t) => t.id !== id);
        emit();
    }, 4000);
}

const variantClasses: Record<ToastVariant, string> = {
    success: 'text-success bg-success-light dark:bg-success-dark-light',
    error: 'text-danger bg-danger-light dark:bg-danger-dark-light',
    info: 'text-info bg-info-light dark:bg-info-dark-light',
};

export default function PosToastContainer() {
    const [items, setItems] = useState<ToastItem[]>(toasts);

    useEffect(() => {
        listeners.add(setItems);
        return () => {
            listeners.delete(setItems);
        };
    }, []);

    const dismiss = (id: number) => {
        toasts = toasts.filter((t) => t.id !== id);
        emit();
    };

    if (items.length === 0) return null;

    return (
        <div className="fixed top-5 z-[1000] flex flex-col gap-2 ltr:right-5 rtl:left-5">
            {items.map((t) => (
                <div key={t.id} className={`flex w-72 items-center justify-between rounded-md px-4 py-3 shadow-lg ${variantClasses[t.variant]}`}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        {t.variant === 'error' ? <IconInfoCircle className="h-5 w-5 shrink-0" /> : <IconCircleCheck className="h-5 w-5 shrink-0" />}
                        <span>{t.message}</span>
                    </div>
                    <button type="button" onClick={() => dismiss(t.id)}>
                        <IconX className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
