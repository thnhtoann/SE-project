export type StaffRole = 'Cashier' | 'Store Manager' | 'Chain Manager';

export type StaffPerformanceStatus = 'Excellent' | 'Good' | 'Needs Improvement';

// Real backend shape (src/backend/core/serializers.py StaffSerializer) — field
// names mirror the API response directly (snake_case), unlike StaffAccount
// below which is the older mock-only shape used by data/mock-staff.ts.
export interface StaffSocialLinksRecord {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
}

export interface StaffReviewRecord {
    id: number;
    reviewer: string;
    rating: number;
    comment: string;
    created_at: string;
}

export interface StaffDocumentRecord {
    id: number;
    name: string;
    file: string;
    uploaded_at: string;
}

export interface StaffCertificateRecord {
    id: number;
    name: string;
    issued_by: string;
    issued_at: string;
}

export interface RoleRecord {
    role_id: number;
    role_name: string;
}

export interface StoreRecord {
    store_id: number;
    store_name: string;
    location: string;
}

// Mirrors core.Order (fields='__all__') -- covers both real POS checkouts
// (order_type='POS') and synced online-marketplace orders (order_type is
// the channel name, e.g. 'Lazada', 'GrabMart', 'ShopeeFood', 'BeMart').
export interface OrderRecord {
    order_id: number;
    store: number;
    staff: number | null;
    shift: number | null;
    order_date: string;
    order_type: string;
    payment_method: string;
    total_amount: string;
    status: string;
    external_order_id: string | null;
}

// Mirrors core.OrderDetail (fields='__all__').
export interface OrderDetailApiRecord {
    id: number;
    order: number;
    product: number;
    quantity: number;
    unit_price: string;
    sub_total: string;
}

// Mirrors core.serializers.ShiftSerializer.
export interface ShiftRecord {
    shift_id: number;
    store: number;
    store_name: string;
    staff: number;
    staff_name: string;
    register: string;
    opened_at: string;
    closed_at: string | null;
    opening_cash: string;
    closing_cash: string | null;
    status: 'Open' | 'Closed';
}

// Response shape of GET /shifts/<id>/eod-report/ (core/views.py ShiftViewSet.eod_report).
export interface ShiftEodReport {
    shift_id: number;
    order_count: number;
    cash_total: string;
    bank_qr_total: string;
    grand_total: string;
    hourly_breakdown: { hour: string; total: string; order_count: number }[];
    top_products: { product__product_id: number; product__product_name: string; total_qty: number }[];
}

// Response shape of GET /reports/revenue-trend/ (core/views.py RevenueTrendView).
export interface RevenueTrendPoint {
    label: string;
    date: string;
    total: string;
    order_count: number;
}

export interface RevenueTrendResponse {
    period: 'week' | 'month' | 'quarter';
    store: number | null;
    points: RevenueTrendPoint[];
}

// Mirrors core.Category (fields='__all__').
export interface CategoryRecord {
    category_id: number;
    category_name: string;
}

// Mirrors core.Batch (fields='__all__') -- named ...ApiRecord to avoid
// colliding with the unrelated mock Batch shape in this file (nested
// storeInventory, no `product` FK id) that the inventory list's display
// helpers (lib/inventory.ts) are still written against.
export interface BatchApiRecord {
    batch_id: number;
    product: number;
    manufacture_date: string;
    expiration_date: string;
}

// Mirrors core.StoreInventory (fields='__all__').
export interface StoreInventoryApiRecord {
    id: number;
    store: number;
    batch: number;
    quantity: number;
}

// Mirrors core.Product (fields='__all__') -- named ...ApiRecord for the
// same reason as BatchApiRecord above (category is a plain FK id here,
// not a name string, and there's no supplier/photo/tags/etc.).
export interface ProductApiRecord {
    product_id: number;
    barcode: string;
    product_name: string;
    base_price: string;
    min_threshold: number;
    category: number;
}

export interface StaffRecord {
    staff_id: number;
    username: string;
    password?: string;
    full_name: string;
    role: number;
    role_name: StaffRole | string;
    store: number | null;
    store_name: string | null;
    email: string | null;
    is_active: boolean;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    joined_at: string;
    social_links: StaffSocialLinksRecord;
    monthly_sales: number;
    performance_status: StaffPerformanceStatus;
    reviews: StaffReviewRecord[];
    documents: StaffDocumentRecord[];
    certificates: StaffCertificateRecord[];
}

export interface StaffSocialLinks {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
}

export interface StaffReview {
    id: number;
    reviewer: string;
    rating: number;
    comment: string;
    date: string;
}

export interface StaffDocument {
    id: number;
    name: string;
    uploadedAt: string;
}

export interface StaffCertificate {
    id: number;
    name: string;
    issuedBy: string;
    issuedAt: string;
}

export interface StaffAccount {
    id: number;
    photo: string;
    name: string;
    role: StaffRole;
    branch: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    joinedAt: string;
    monthlySales: number;
    performanceStatus: StaffPerformanceStatus;
    socialLinks: StaffSocialLinks;
    reviews: StaffReview[];
    documents: StaffDocument[];
    certificates: StaffCertificate[];
}

export type ReportPeriod = 'week' | 'month' | 'quarter';

export interface RevenuePoint {
    label: string;
    value: number;
}

export interface TopProduct {
    id: number;
    name: string;
    unitsSold: number;
    revenue: number;
}

export interface RecentTransaction {
    id: number;
    customer: string;
    amount: number;
    channel: string;
    status: 'Completed' | 'Pending' | 'Canceled';
    date: string;
}

export interface ChannelRevenue {
    channel: string;
    amount: number;
}

export interface FunnelStage {
    label: string;
    value: number;
}

export interface Branch {
    id: number;
    name: string;
    address: string;
    revenue: number;
}

export type MembershipTier = 'Bronze' | 'Silver' | 'Gold' | 'VIP';

export interface MembershipTierCount {
    tier: MembershipTier;
    count: number;
}

export interface TopCustomer {
    id: number;
    name: string;
    tier: MembershipTier;
    totalSpent: number;
    visits: number;
}

export interface PeakHourPoint {
    hour: string;
    visits: number;
}

export interface DeviceVisit {
    device: string;
    percentage: number;
}

// Product/Batch/Supplier field names mirror the backend schema
// (src/backend/core/models.py) so swapping mock data for the real API later is
// mechanical. Stock quantity lives on StoreInventory per batch, not on Product.
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export type ExpiryStatus = 'Expired' | 'Near Expiry' | 'OK';

export interface Supplier {
    supplier_id: number;
    supplier_name: string;
    contact_phone: string;
    email: string;
    address: string;
}

export interface StoreInventoryEntry {
    store: string;
    quantity: number;
}

export interface Batch {
    batch_id: number;
    product_id: number;
    manufacture_date: string;
    expiration_date: string;
    storeInventory: StoreInventoryEntry[];
}

export interface DiscountRecord {
    id: number;
    type: 'percentage' | 'price';
    value: number;
    appliedAt: string;
}

export interface Product {
    product_id: number;
    barcode: string;
    product_name: string;
    base_price: number;
    min_threshold: number;
    category: string;
    photo: string;
    unit: string;
    tags: string[];
    description: string;
    supplier_id: number;
    batches: Batch[];
    discountPercent?: number;
    discountHistory: DiscountRecord[];
}

export type CustomerStatus = 'Active' | 'Inactive';

export interface Customer {
    id: number;
    photo: string;
    name: string;
    email: string;
    phone: string;
    tier: MembershipTier;
    status: CustomerStatus;
    lastContactedAt: string;
}

export type PaymentMethod = 'Card' | 'MoMo' | 'Cash' | 'Online Banking';

export interface PosTransaction {
    id: string;
    customer: string;
    amount: number;
    paymentMethod: PaymentMethod;
    cashier: string;
    status: 'Completed' | 'Pending' | 'Canceled';
    date: string;
}

export type BusinessSector =
    | 'Grocery Store'
    | 'Convenience Store'
    | 'Supermarket'
    | 'Minimart'
    | 'Pharmacy'
    | 'Restaurant / F&B'
    | 'Bakery'
    | 'Electronics'
    | 'Fashion & Apparel'
    | 'Other';

export interface StoreInformation {
    storeName: string;
    logoUrl: string;
    businessSector: BusinessSector;
    taxId: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    currency: string;
    timezone: string;
    openingTime: string;
    closingTime: string;
}

export interface PaymentMethodSetting {
    method: PaymentMethod;
    enabled: boolean;
    accountDetail: string;
}

// Channel names mirror the values already seeded in mock-dashboards.ts (CHANNEL_REVENUE)
// so the connected/disconnected list here lines up with what shows in the dashboards.
export interface MarketplaceChannelSetting {
    channel: string;
    connected: boolean;
    storePartnerId: string;
}
