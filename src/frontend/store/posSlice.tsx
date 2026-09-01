import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiFetch, ApiError } from '@/lib/api-client';
import { CartLineItem, PaymentMethod } from '@/components/apps/pos/pos-data';
import { OrderDetailApiRecord, OrderRecord, ProductApiRecord, ShiftRecord } from '@/types/admin';

export type PosAsyncStatus = 'idle' | 'loading' | 'error';

interface PosState {
    cart: CartLineItem[];
    discountPercent: number;
    autoPrintInvoice: boolean;
    activeShift: ShiftRecord | null;
    shiftStatus: PosAsyncStatus;
    shiftError: string | null;
    checkoutStatus: PosAsyncStatus;
    checkoutError: string | null;
}

const initialState: PosState = {
    cart: [],
    discountPercent: 0,
    autoPrintInvoice: false,
    activeShift: null,
    shiftStatus: 'idle',
    shiftError: null,
    checkoutStatus: 'idle',
    checkoutError: null,
};

function cartSubtotal(cart: CartLineItem[]): number {
    return Number(cart.reduce((sum, li) => sum + li.subTotal, 0).toFixed(2));
}

const parseError = (err: unknown): string => {
    if (err instanceof ApiError) {
        const body = err.body as { detail?: string } | null;
        return body?.detail ?? err.message;
    }
    return err instanceof Error ? err.message : 'Unknown error';
};

export const fetchActiveShift = createAsyncThunk('pos/fetchActiveShift', async (storeId: number, { rejectWithValue }) => {
    try {
        const shifts = await apiFetch<ShiftRecord[]>(`/shifts/?store=${storeId}&status=Open`);
        return shifts[0] ?? null;
    } catch (err) {
        return rejectWithValue(parseError(err));
    }
});

export const openShiftThunk = createAsyncThunk(
    'pos/openShift',
    async (payload: { storeId: number; openingCash: number }, { rejectWithValue }) => {
        try {
            return await apiFetch<ShiftRecord>('/shifts/', {
                method: 'POST',
                body: { store: payload.storeId, opening_cash: payload.openingCash },
            });
        } catch (err) {
            return rejectWithValue(parseError(err));
        }
    }
);

export const closeShiftThunk = createAsyncThunk(
    'pos/closeShift',
    async (payload: { shiftId: number; closingCash: number }, { rejectWithValue }) => {
        try {
            return await apiFetch<ShiftRecord>(`/shifts/${payload.shiftId}/close/`, {
                method: 'PATCH',
                body: { closing_cash: payload.closingCash },
            });
        } catch (err) {
            return rejectWithValue(parseError(err));
        }
    }
);

export interface CheckoutResult extends OrderRecord {
    details: OrderDetailApiRecord[];
}

// The single atomic "payment confirmed" call: the backend records the order,
// deducts inventory, and computes the total together as one transaction
// (core/checkout.py::create_pos_order) — see POST /api/orders/checkout/.
export const checkoutThunk = createAsyncThunk(
    'pos/checkout',
    async (
        payload: { storeId: number; shiftId: number; paymentMethod: PaymentMethod; discountPercent: number; items: CartLineItem[] },
        { rejectWithValue }
    ) => {
        try {
            return await apiFetch<CheckoutResult>('/orders/checkout/', {
                method: 'POST',
                body: {
                    store: payload.storeId,
                    shift: payload.shiftId,
                    payment_method: payload.paymentMethod,
                    discount_percent: payload.discountPercent,
                    items: payload.items.map((li) => ({
                        product: li.productId,
                        quantity: li.quantity,
                        unit_price: li.unitPrice.toFixed(2),
                    })),
                },
            });
        } catch (err) {
            return rejectWithValue(parseError(err));
        }
    }
);

const posSlice = createSlice({
    name: 'pos',
    initialState,
    reducers: {
        addLineItem(state, { payload }: PayloadAction<{ product: ProductApiRecord; unitPrice: number }>) {
            const { product, unitPrice } = payload;
            const existing = state.cart.find((li) => li.productId === product.product_id);
            if (existing) {
                existing.quantity += 1;
                existing.subTotal = Number((existing.quantity * existing.unitPrice).toFixed(2));
            } else {
                state.cart.push({
                    productId: product.product_id,
                    barcode: product.barcode,
                    name: product.product_name,
                    unitPrice,
                    quantity: 1,
                    subTotal: unitPrice,
                });
            }
        },
        setLineItemQuantity(state, { payload }: PayloadAction<{ productId: number; quantity: number }>) {
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
        removeLineItem(state, { payload }: PayloadAction<{ productId: number }>) {
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
        resetCheckoutStatus(state) {
            state.checkoutStatus = 'idle';
            state.checkoutError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchActiveShift.pending, (state) => {
                state.shiftStatus = 'loading';
                state.shiftError = null;
            })
            .addCase(fetchActiveShift.fulfilled, (state, action) => {
                state.shiftStatus = 'idle';
                state.activeShift = action.payload;
            })
            .addCase(fetchActiveShift.rejected, (state, action) => {
                state.shiftStatus = 'error';
                state.shiftError = (action.payload as string) ?? 'Failed to load shift';
            })
            .addCase(openShiftThunk.pending, (state) => {
                state.shiftStatus = 'loading';
                state.shiftError = null;
            })
            .addCase(openShiftThunk.fulfilled, (state, action) => {
                state.shiftStatus = 'idle';
                state.activeShift = action.payload;
            })
            .addCase(openShiftThunk.rejected, (state, action) => {
                state.shiftStatus = 'error';
                state.shiftError = (action.payload as string) ?? 'Failed to open shift';
            })
            .addCase(closeShiftThunk.pending, (state) => {
                state.shiftStatus = 'loading';
                state.shiftError = null;
            })
            .addCase(closeShiftThunk.fulfilled, (state) => {
                state.shiftStatus = 'idle';
                state.activeShift = null;
            })
            .addCase(closeShiftThunk.rejected, (state, action) => {
                state.shiftStatus = 'error';
                state.shiftError = (action.payload as string) ?? 'Failed to close shift';
            })
            .addCase(checkoutThunk.pending, (state) => {
                state.checkoutStatus = 'loading';
                state.checkoutError = null;
            })
            .addCase(checkoutThunk.fulfilled, (state) => {
                state.checkoutStatus = 'idle';
                state.cart = [];
                state.discountPercent = 0;
            })
            .addCase(checkoutThunk.rejected, (state, action) => {
                state.checkoutStatus = 'error';
                state.checkoutError = (action.payload as string) ?? 'Checkout failed';
            });
    },
});

export const { addLineItem, setLineItemQuantity, removeLineItem, setDiscountPercent, toggleAutoPrint, clearCart, resetCheckoutStatus } = posSlice.actions;

export default posSlice.reducer;
