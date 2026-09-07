// POS cart-only types. Product/order/shift/inventory data itself comes from the real backend
// (core.Product/Order/OrderDetail/Shift/StoreInventory via src/frontend/lib/api-client.ts) --
// see store/posSlice.tsx and the pos/** components for how it's fetched and wired.

export type LineDiscountType = 'percent' | 'amount' | null;

export interface CartLineItem {
    productId: number;
    barcode: string;
    name: string;
    unitPrice: number;
    quantity: number;
    // A per-line discount the cashier chose at checkout time -- independent
    // of the whole-cart discountPercent in store/posSlice.tsx. subTotal
    // always reflects it already (see computeLineSubtotal).
    discountType: LineDiscountType;
    discountValue: number;
    subTotal: number;
}

// Mirrors core/checkout.py::calculate_line_subtotal -- keep the two in sync,
// since the backend is the source of truth for what's actually billed but
// the cart needs to show the same number before checkout happens.
export const computeLineSubtotal = (unitPrice: number, quantity: number, discountType: LineDiscountType, discountValue: number): number => {
    const lineTotal = unitPrice * quantity;
    let discount = 0;
    if (discountType === 'percent') discount = lineTotal * (discountValue / 100);
    else if (discountType === 'amount') discount = discountValue;
    discount = Math.min(Math.max(discount, 0), lineTotal);
    return Number((lineTotal - discount).toFixed(2));
};

// Matches how the backend aggregates payment methods (core/views.py ShiftViewSet.eod_report
// filters payment_method__iexact against exactly these two strings).
export type PaymentMethod = 'Cash' | 'Bank QR';
