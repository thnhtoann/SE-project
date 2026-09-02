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
// expense_total follows the same `store` query param as total/order_count, except
// for purchase orders created before PO-per-branch existed (store=None), which only
// ever show up in the chain-wide (no ?store=) total.
export interface RevenueTrendPoint {
    label: string;
    date: string;
    total: string;
    order_count: number;
    expense_total: string;
}

export interface RevenueTrendResponse {
    period: 'week' | 'month' | 'quarter';
    store: number | null;
    points: RevenueTrendPoint[];
}

// Response shape of GET /reports/sales-by-category/ (core/views.py SalesByCategoryView).
export interface SalesByCategoryRow {
    category: string;
    total: string;
}

export interface SalesByCategoryResponse {
    period: 'week' | 'month' | 'quarter';
    store: number | null;
    categories: SalesByCategoryRow[];
}

// Mirrors core.Category (fields='__all__').
export interface CategoryRecord {
    category_id: number;
    category_name: string;
}

// Mirrors core.serializers.InventoryAlertSerializer.
export interface InventoryAlertRecord {
    alert_id: number;
    product: number;
    product_name: string;
    barcode: string;
    category_name: string;
    store: number | null;
    store_name: string | null;
    current_stock: number;
    min_threshold: number;
    created_at: string;
    is_resolved: boolean;
}

// One row of GET /api/procurement/forecast/'s "products" array (forecasting/views.py
// ForecastOverviewView) -- Prophet-based reorder recommendation, read-only.
export interface ForecastProductRow {
    product_id: number;
    product_name: string;
    barcode: string;
    current_stock: number;
    safety_stock_level: number;
    forecast_horizon_days: number;
    expected_demand: number;
    expected_demand_lower: number;
    expected_demand_upper: number;
    stockout_risk: 'Low' | 'Medium' | 'High';
    action_required: boolean;
    recommended_order_quantity: number;
    reasoning: string;
    forecast_generated_at: string;
}

export interface ForecastResponse {
    overview: {
        total_products_analyzed: number;
        products_at_risk: number;
        high_risk_count: number;
        medium_risk_count: number;
        low_risk_count: number;
    };
    products: ForecastProductRow[];
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

// Mirrors core.serializers.ShipmentItemSerializer (read-only, model=PurchaseOrderDetail).
export interface ShipmentItem {
    id: number;
    product: number;
    product_name: string;
    barcode: string;
    order_qty: number;
    unit_cost: string;
}

// Mirrors core.serializers.ShipmentSerializer (GET /api/shipments/, read-only tracking view
// over the same PurchaseOrder rows Order Supply creates via /api/purchase-orders/).
export interface ShipmentRecord {
    po_id: number;
    supplier: number;
    supplier_name: string;
    contact_phone: string;
    store: number | null;
    store_name: string | null;
    order_date: string;
    expected_delivery_date: string | null;
    status: 'Preparing' | 'Delivered' | 'Delayed';
    is_overdue: boolean;
    total_amount: string;
    details: ShipmentItem[];
}

// Mirrors core.serializers.DiscountSerializer -- the real backend shape. Only one row per
// product is ever is_active=true at a time (enforced server-side on create).
export interface DiscountApiRecord {
    discount_id: number;
    product: number;
    product_name: string;
    discount_type: 'percentage' | 'price';
    value: string;
    applied_at: string;
    is_active: boolean;
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

// Mirrors core.serializers.CustomerSerializer (fields='__all__') -- the real backend shape,
// a standalone contact list not linked to Order/purchase history. The mock Customer type
// above stays in use by the Store Dashboard's "Top Customers" tab, which needs
// purchase-linkage this model deliberately doesn't have.
export interface CustomerRecord {
    customer_id: number;
    name: string;
    email: string;
    phone: string;
    tier: MembershipTier;
    status: CustomerStatus;
    last_contacted_at: string | null;
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

// Mirrors core.serializers.BusinessProfileSerializer -- a singleton row (always pk=1) with
// chain-wide business info, real backend shape for the Settings > Store page.
export interface BusinessProfileRecord {
    id: number;
    store_name: string;
    business_sector: BusinessSector;
    tax_id: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    currency: string;
    timezone: string;
    opening_time: string | null;
    closing_time: string | null;
    logo_url: string;
}

// Mirrors core.serializers.PaymentMethodSettingSerializer -- real backend shape, one row per
// seeded payment method (see core/migrations/0010_seed_settings_data.py).
export interface PaymentMethodSettingRecord {
    id: number;
    method: string;
    enabled: boolean;
    account_detail: string;
}

// Mirrors core.serializers.MarketplaceChannelSettingSerializer. Lazada is deliberately not
// among the seeded rows -- it already has a real connection status via LazadaCredential,
// shown by the separate Lazada-connect widget on the same Settings page.
export interface MarketplaceChannelSettingRecord {
    id: number;
    channel: string;
    connected: boolean;
    store_partner_id: string;
}
