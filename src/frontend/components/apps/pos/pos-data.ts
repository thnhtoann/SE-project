// Mock POS data — this feature is frontend-only for this pass (no backend API exists yet for
// products/orders/inventory/shifts, see specs/001-pos-checkout/plan.md). Field names shadow
// src/backend/core/models.py's Product/Order/OrderDetail shapes where sensible so a later
// backend-wiring pass is a smaller diff.

export interface Product {
    id: string;
    barcode: string;
    name: string;
    basePrice: number;
    /** Set when a near-expiry markdown applies; UI shows basePrice struck through. */
    discountedPrice?: number;
    discountLabel?: string;
    category: string;
    unit: string;
}

export interface InventoryRecord {
    productId: string;
    branch: string;
    onHand: number;
    incoming: number;
    available: number;
}

export interface CartLineItem {
    productId: string;
    barcode: string;
    name: string;
    unitPrice: number;
    quantity: number;
    subTotal: number;
}

export type PaymentMethod = 'cash' | 'bank_qr';
export type OrderStatus = 'completed' | 'pending' | 'cancelled';

export interface Order {
    orderId: string;
    orderDate: string; // ISO timestamp
    branch: string;
    cashierName: string;
    channel: 'POS';
    paymentMethod: PaymentMethod;
    customerName?: string;
    lineItems: CartLineItem[];
    totalAmount: number;
    status: OrderStatus;
    shiftId?: string;
}

export interface Shift {
    shiftId: string;
    register: string;
    cashierName: string;
    openedAt: string; // ISO timestamp
    closedAt?: string; // undefined while open
    openingCashFloat: number;
    status: 'open' | 'closed';
}

export const CURRENT_EMPLOYEE = { name: 'Admin SE01', role: 'Cashier' };
export const CURRENT_BRANCH = 'Main Store';

// --- date helpers (relative to "now" so seed data stays demo-relevant whenever this runs) ---

function todayAt(hour: number, minute = 0): string {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

function daysAgoAt(daysAgo: number, hour: number, minute = 0): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

function orderCode(iso: string, seq: number): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `ORD-${y}${m}${day}-${String(seq).padStart(4, '0')}`;
}

// --- seed products ---

export const mockProducts: Product[] = [
    { id: 'p1', barcode: '8934673123451', name: 'Coca-Cola 330ml', basePrice: 0.83, category: 'Beverages', unit: '330ml' },
    { id: 'p2', barcode: '8934673123468', name: 'Vinamilk Fresh Milk', basePrice: 0.75, category: 'Dairy', unit: '1L' },
    {
        id: 'p3',
        barcode: '8934673123475',
        name: 'Wheat Bread Loaf',
        basePrice: 1.04,
        discountedPrice: 0.79,
        discountLabel: 'Near-expiry -25%',
        category: 'Bakery',
        unit: 'loaf',
    },
    { id: 'p4', barcode: '8934673123482', name: 'Instant Noodles Box', basePrice: 12.0, category: 'Food', unit: 'box' },
    { id: 'p5', barcode: '8934673123499', name: 'Shampoo', basePrice: 4.5, category: 'Personal Care', unit: '500ml' },
    { id: 'p6', barcode: '8934673123505', name: "Lay's Potato Chips", basePrice: 0.9, category: 'Snacks', unit: 'bag' },
    { id: 'p7', barcode: '8934673123512', name: 'Marlboro Red', basePrice: 2.8, category: 'Tobacco', unit: 'pack (20pcs)' },
    { id: 'p8', barcode: '8934673123529', name: 'Colgate Toothpaste 100g', basePrice: 1.2, category: 'Personal Care', unit: '100g' },
    { id: 'p9', barcode: '8934673123536', name: 'Red Bull Energy Drink', basePrice: 1.1, category: 'Beverages', unit: 'can' },
    { id: 'p10', barcode: '8934673123543', name: 'Omo Detergent 3kg', basePrice: 6.5, category: 'Household', unit: 'kg' },
];

export const mockInventory: InventoryRecord[] = [
    { productId: 'p1', branch: CURRENT_BRANCH, onHand: 240, incoming: 0, available: 240 },
    { productId: 'p2', branch: CURRENT_BRANCH, onHand: 60, incoming: 0, available: 60 },
    { productId: 'p3', branch: CURRENT_BRANCH, onHand: 18, incoming: 40, available: 18 },
    { productId: 'p4', branch: CURRENT_BRANCH, onHand: 0, incoming: 0, available: 0 }, // out of stock (FR-004)
    { productId: 'p5', branch: CURRENT_BRANCH, onHand: 8, incoming: 0, available: 8 },
    { productId: 'p6', branch: CURRENT_BRANCH, onHand: 320, incoming: 0, available: 320 },
    { productId: 'p7', branch: CURRENT_BRANCH, onHand: 50, incoming: 0, available: 50 },
    { productId: 'p8', branch: CURRENT_BRANCH, onHand: 96, incoming: 0, available: 96 },
    { productId: 'p9', branch: CURRENT_BRANCH, onHand: 0, incoming: 120, available: 0 }, // out of stock, restock incoming
    { productId: 'p10', branch: CURRENT_BRANCH, onHand: 45, incoming: 0, available: 45 },
];

function lineItem(product: Product, quantity: number): CartLineItem {
    const unitPrice = product.discountedPrice ?? product.basePrice;
    return {
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        unitPrice,
        quantity,
        subTotal: Number((unitPrice * quantity).toFixed(2)),
    };
}

function totalOf(lineItems: CartLineItem[]): number {
    return Number(lineItems.reduce((sum, li) => sum + li.subTotal, 0).toFixed(2));
}

const [p1, p2, p3, , p5, p6, p7, p8, , p10] = mockProducts;

// --- seed orders: spread across today's hours (EOD hourly chart) + a few prior days (date-range search) ---

const todayOrderSpecs: { hour: number; minute: number; items: CartLineItem[]; paymentMethod: PaymentMethod; customerName?: string }[] = [
    { hour: 8, minute: 15, items: [lineItem(p1, 2), lineItem(p6, 1)], paymentMethod: 'cash' },
    { hour: 9, minute: 40, items: [lineItem(p2, 1), lineItem(p3, 1)], paymentMethod: 'bank_qr', customerName: 'Nguyen Van A' },
    { hour: 11, minute: 5, items: [lineItem(p8, 2)], paymentMethod: 'cash' },
    { hour: 13, minute: 20, items: [lineItem(p1, 3), lineItem(p7, 1)], paymentMethod: 'cash', customerName: 'Tran Thi B' },
    { hour: 15, minute: 50, items: [lineItem(p5, 1), lineItem(p2, 2)], paymentMethod: 'bank_qr' },
    { hour: 18, minute: 10, items: [lineItem(p6, 4), lineItem(p1, 1)], paymentMethod: 'cash', customerName: 'Le Van C' },
];

export const mockOrders: Order[] = [
    ...todayOrderSpecs.map((spec, i) => {
        const orderDate = todayAt(spec.hour, spec.minute);
        return {
            orderId: orderCode(orderDate, i + 1),
            orderDate,
            branch: CURRENT_BRANCH,
            cashierName: CURRENT_EMPLOYEE.name,
            channel: 'POS' as const,
            paymentMethod: spec.paymentMethod,
            customerName: spec.customerName,
            lineItems: spec.items,
            totalAmount: totalOf(spec.items),
            status: 'completed' as OrderStatus,
            shiftId: 'shift-today-1',
        };
    }),
    {
        orderId: orderCode(daysAgoAt(1, 10, 0), 1),
        orderDate: daysAgoAt(1, 10, 0),
        branch: CURRENT_BRANCH,
        cashierName: CURRENT_EMPLOYEE.name,
        channel: 'POS',
        paymentMethod: 'cash',
        customerName: 'Nguyen Van A',
        lineItems: [lineItem(p3, 2)],
        totalAmount: totalOf([lineItem(p3, 2)]),
        status: 'completed',
    },
    {
        orderId: orderCode(daysAgoAt(2, 16, 30), 1),
        orderDate: daysAgoAt(2, 16, 30),
        branch: CURRENT_BRANCH,
        cashierName: CURRENT_EMPLOYEE.name,
        channel: 'POS',
        paymentMethod: 'bank_qr',
        lineItems: [lineItem(p7, 1), lineItem(p10, 1)],
        totalAmount: totalOf([lineItem(p7, 1), lineItem(p10, 1)]),
        status: 'completed',
    },
    {
        orderId: orderCode(daysAgoAt(3, 9, 0), 1),
        orderDate: daysAgoAt(3, 9, 0),
        branch: CURRENT_BRANCH,
        cashierName: CURRENT_EMPLOYEE.name,
        channel: 'POS',
        paymentMethod: 'cash',
        customerName: 'Tran Thi B',
        lineItems: [lineItem(p8, 1), lineItem(p5, 1)],
        totalAmount: totalOf([lineItem(p8, 1), lineItem(p5, 1)]),
        status: 'completed',
    },
];

// --- seed shifts: one closed earlier today, one currently open ---

export const mockShifts: Shift[] = [
    {
        shiftId: 'shift-today-0',
        register: 'Register 1',
        cashierName: CURRENT_EMPLOYEE.name,
        openedAt: todayAt(0, 0),
        closedAt: todayAt(8, 0),
        openingCashFloat: 100,
        status: 'closed',
    },
    {
        shiftId: 'shift-today-1',
        register: 'Register 1',
        cashierName: CURRENT_EMPLOYEE.name,
        openedAt: todayAt(8, 0),
        openingCashFloat: 100,
        status: 'open',
    },
];
