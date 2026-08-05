import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    CartLineItem,
    CURRENT_BRANCH,
    CURRENT_EMPLOYEE,
    InventoryRecord,
    mockInventory,
    mockOrders,
    mockShifts,
    Order,
    PaymentMethod,
    Product,
    Shift,
} from '@/components/apps/pos/pos-data';

interface PosState {
    cart: CartLineItem[];
    discountPercent: number;
    autoPrintInvoice: boolean;
    orders: Order[];
    inventory: InventoryRecord[];
    shifts: Shift[];
    activeShift: Shift | null;
}

const initialState: PosState = {
    cart: [],
    discountPercent: 0,
    autoPrintInvoice: false,
    orders: mockOrders,
    inventory: mockInventory,
    shifts: mockShifts,
    activeShift: mockShifts.find((s) => s.status === 'open') ?? null,
};

function generateId(prefix: string): string {
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    return `${prefix}-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
}

function cartSubtotal(cart: CartLineItem[]): number {
    return Number(cart.reduce((sum, li) => sum + li.subTotal, 0).toFixed(2));
}

const posSlice = createSlice({
    name: 'pos',
    initialState,
    reducers: {
        addLineItem(state, { payload }: PayloadAction<Product>) {
            const unitPrice = payload.discountedPrice ?? payload.basePrice;
            const existing = state.cart.find((li) => li.productId === payload.id);
            if (existing) {
                existing.quantity += 1;
                existing.subTotal = Number((existing.quantity * existing.unitPrice).toFixed(2));
            } else {
                state.cart.push({
                    productId: payload.id,
                    barcode: payload.barcode,
                    name: payload.name,
                    unitPrice,
                    quantity: 1,
                    subTotal: unitPrice,
                });
            }
        },
        setLineItemQuantity(state, { payload }: PayloadAction<{ productId: string; quantity: number }>) {
            if (payload.quantity <= 0) {
                state.cart = state.cart.filter((li) => li.productId !== payload.productId);
                return;
            }
            const line = state.cart.find((li) => li.productId === payload.productId);
            if (line) {
                line.quantity = payload.quantity;
                line.subTotal = Number((line.quantity * line.unitPrice).toFixed(2));
            }
        },
        removeLineItem(state, { payload }: PayloadAction<{ productId: string }>) {
            state.cart = state.cart.filter((li) => li.productId !== payload.productId);
        },
        setDiscountPercent(state, { payload }: PayloadAction<number>) {
            state.discountPercent = Math.min(100, Math.max(0, payload));
        },
        toggleAutoPrint(state) {
            state.autoPrintInvoice = !state.autoPrintInvoice;
        },
        clearCart(state) {
            state.cart = [];
            state.discountPercent = 0;
        },
        /**
         * The single atomic "payment confirmed" transition: records the order, deducts
         * inventory, and clears the cart together so no partial state is ever visible —
         * mirrors the backend's required atomic write (Constitution Principle III) even
         * though this is only an in-memory reducer for this frontend-only pass.
         */
        completeOrder(state, { payload }: PayloadAction<{ paymentMethod: PaymentMethod; customerName?: string; orderId?: string }>) {
            if (state.cart.length === 0) return;
            const subtotal = cartSubtotal(state.cart);
            const totalAmount = Number((subtotal * (1 - state.discountPercent / 100)).toFixed(2));
            const orderDate = new Date().toISOString();
            const order: Order = {
                orderId: payload.orderId ?? generateId('ORD'),
                orderDate,
                branch: CURRENT_BRANCH,
                cashierName: CURRENT_EMPLOYEE.name,
                channel: 'POS',
                paymentMethod: payload.paymentMethod,
                customerName: payload.customerName,
                lineItems: state.cart,
                totalAmount,
                status: 'completed',
                shiftId: state.activeShift?.shiftId,
            };
            state.orders.push(order);
            state.cart.forEach((li) => {
                const inv = state.inventory.find((r) => r.productId === li.productId);
                if (inv) {
                    inv.onHand = Math.max(0, inv.onHand - li.quantity);
                    inv.available = Math.max(0, inv.available - li.quantity);
                }
            });
            state.cart = [];
            state.discountPercent = 0;
        },
        openShift(state, { payload }: PayloadAction<{ openingCashFloat: number }>) {
            if (state.activeShift) return;
            const shift: Shift = {
                shiftId: generateId('shift'),
                register: 'Register 1',
                cashierName: CURRENT_EMPLOYEE.name,
                openedAt: new Date().toISOString(),
                openingCashFloat: payload.openingCashFloat,
                status: 'open',
            };
            state.shifts.push(shift);
            state.activeShift = shift;
        },
        closeShift(state) {
            if (!state.activeShift) return;
            const shift = state.shifts.find((s) => s.shiftId === state.activeShift!.shiftId);
            if (shift) {
                shift.status = 'closed';
                shift.closedAt = new Date().toISOString();
            }
            state.activeShift = null;
        },
    },
});

export const {
    addLineItem,
    setLineItemQuantity,
    removeLineItem,
    setDiscountPercent,
    toggleAutoPrint,
    clearCart,
    completeOrder,
    openShift,
    closeShift,
} = posSlice.actions;

export default posSlice.reducer;
