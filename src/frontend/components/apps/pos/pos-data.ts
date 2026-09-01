// POS cart-only types. Product/order/shift/inventory data itself comes from the real backend
// (core.Product/Order/OrderDetail/Shift/StoreInventory via src/frontend/lib/api-client.ts) --
// see store/posSlice.tsx and the pos/** components for how it's fetched and wired.

export interface CartLineItem {
    productId: number;
    barcode: string;
    name: string;
    unitPrice: number;
    quantity: number;
    subTotal: number;
}

// Matches how the backend aggregates payment methods (core/views.py ShiftViewSet.eod_report
// filters payment_method__iexact against exactly these two strings).
export type PaymentMethod = 'Cash' | 'Bank QR';
