export type StaffRole = 'Cashier' | 'Store Manager' | 'Chain Manager';

export type StaffPerformanceStatus = 'Excellent' | 'Good' | 'Needs Improvement';

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
