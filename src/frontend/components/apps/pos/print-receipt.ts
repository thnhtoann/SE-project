// Simulates a physical thermal receipt printer: renders an 80mm-wide receipt
// into a hidden iframe and invokes the browser's print dialog on it (so
// "Save as PDF" works as a stand-in when no real printer is attached, and a
// real thermal/receipt printer picks it up the same way once one exists).
// Receipt text is always English regardless of the app's active locale --
// that's a fixed product requirement, not a translation gap.
import { CartLineItem, PaymentMethod } from './pos-data';
import { currency } from '@/lib/currency';

export interface PrintableReceipt {
    orderId: number;
    timestamp: string;
    storeId: number;
    cashierName: string;
    lineItems: CartLineItem[];
    total: number;
    paymentMethod: PaymentMethod;
}

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const buildReceiptHtml = (receipt: PrintableReceipt): string => {
    const rows = receipt.lineItems
        .map(
            (li) => `<div class="row"><span>${escapeHtml(li.name)} x${li.quantity}</span><span>${currency(li.subTotal)}</span></div>`
        )
        .join('');

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt #${receipt.orderId}</title>
<style>
    @page { size: 80mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 15px; width: 76mm; margin: 0; color: #000; }
    .center { text-align: center; }
    .store-name { font-size: 22px; font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; padding: 3px 0; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; padding-top: 6px; }
    .meta { font-size: 13px; margin-bottom: 3px; }
    .footer { margin-top: 14px; font-size: 13px; }
</style>
</head>
<body>
    <div class="center store-name">MART+</div>
    <div class="center meta">Store #${receipt.storeId}</div>
    <div class="divider"></div>
    <div class="meta">Order #: ${receipt.orderId}</div>
    <div class="meta">Date: ${new Date(receipt.timestamp).toLocaleString('en-US')}</div>
    <div class="meta">Cashier: ${escapeHtml(receipt.cashierName)}</div>
    <div class="meta">Payment method: ${receipt.paymentMethod === 'Cash' ? 'Cash' : 'Bank QR'}</div>
    <div class="divider"></div>
    ${rows}
    <div class="divider"></div>
    <div class="total-row"><span>TOTAL</span><span>${currency(receipt.total)}</span></div>
    <div class="center footer">Thank you for your purchase!</div>
</body>
</html>`;
};

export const printReceipt = (receipt: PrintableReceipt): void => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const cleanup = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        cleanup();
        return;
    }

    doc.open();
    doc.write(buildReceiptHtml(receipt));
    doc.close();

    iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // afterprint doesn't fire reliably across browsers for iframe windows,
        // so fall back to a timeout long enough for the print dialog to open.
        setTimeout(cleanup, 1000);
    };
};
