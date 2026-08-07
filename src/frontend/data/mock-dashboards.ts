import { Branch, ChannelRevenue, DeviceVisit, FunnelStage, MembershipTierCount, PeakHourPoint, RecentTransaction, ReportPeriod, RevenuePoint, TopCustomer, TopProduct } from '@/types/admin';

// Stand-in for the real reporting API: scales the seeded month-based figures so
// switching the period visibly changes every dashboard.
export const PERIOD_MULTIPLIER: Record<ReportPeriod, number> = {
    week: 0.25,
    month: 1,
    quarter: 3.1,
};

// Second stand-in axis: the seeded customer figures are chain-wide totals, so the
// Store Dashboard scales them by the selected branch's share of chain revenue.
// Keyed by branch id (see BRANCHES below).
export const BRANCH_SHARE: Record<number, number> = {
    1: 0.44,
    2: 0.23,
    3: 0.33,
};

export const COMPANY_KPIS = {
    totalSkus: 1284,
    totalStaff: 42,
    totalCustomers: 3860,
    totalRevenue: 412500000,
};

export const REVENUE_TREND: RevenuePoint[] = [
    { label: 'Mon', value: 38 },
    { label: 'Tue', value: 45 },
    { label: 'Wed', value: 40 },
    { label: 'Thu', value: 52 },
    { label: 'Fri', value: 61 },
    { label: 'Sat', value: 68 },
    { label: 'Sun', value: 55 },
];

export const TOP_PRODUCTS: TopProduct[] = [
    { id: 1, name: 'Instant Noodles (Cup)', unitsSold: 812, revenue: 12180000 },
    { id: 2, name: 'Bottled Water 500ml', unitsSold: 705, revenue: 7050000 },
    { id: 3, name: 'Fresh Milk 1L', unitsSold: 540, revenue: 16200000 },
    { id: 4, name: 'Canned Coffee', unitsSold: 498, revenue: 8964000 },
    { id: 5, name: 'Sandwich Bread', unitsSold: 322, revenue: 6440000 },
];

export const RECENT_TRANSACTIONS: RecentTransaction[] = [
    { id: 1, customer: 'Tran Thi B', amount: 185000, channel: 'POS', status: 'Completed', date: '2026-08-08T09:12:00' },
    { id: 2, customer: 'Le Van C', amount: 92000, channel: 'GrabMart', status: 'Completed', date: '2026-08-08T08:57:00' },
    { id: 3, customer: 'Pham Thi D', amount: 340000, channel: 'ShopeeFood', status: 'Pending', date: '2026-08-08T08:40:00' },
    { id: 4, customer: 'Nguyen Van A', amount: 58000, channel: 'POS', status: 'Completed', date: '2026-08-08T08:21:00' },
    { id: 5, customer: 'Hoang Thi E', amount: 210000, channel: 'BeMart', status: 'Canceled', date: '2026-08-08T07:58:00' },
];

export const BRANCHES: Branch[] = [
    { id: 1, name: 'District 1 Branch', address: '9 Nguyen Hue Boulevard, District 1, Ho Chi Minh City', revenue: 182500000 },
    { id: 2, name: 'District 3 Branch', address: '48 Le Loi Street, District 3, Ho Chi Minh City', revenue: 96400000 },
    { id: 3, name: 'District 7 Branch', address: '77 Nguyen Van Linh Street, District 7, Ho Chi Minh City', revenue: 133600000 },
];

export const SALES_FUNNEL: FunnelStage[] = [
    { label: 'Store Visits', value: 4200 },
    { label: 'Product Views', value: 2850 },
    { label: 'Added to Cart', value: 1460 },
    { label: 'Checked Out', value: 980 },
];

export const CHANNEL_REVENUE: ChannelRevenue[] = [
    { channel: 'POS', amount: 145200000 },
    { channel: 'GrabMart', amount: 58600000 },
    { channel: 'ShopeeFood', amount: 41300000 },
    { channel: 'BeMart', amount: 27800000 },
    { channel: 'Lazada', amount: 15400000 },
    { channel: 'TikTok Shop', amount: 12100000 },
    { channel: 'Shopee', amount: 9200000 },
];

export const MEMBERSHIP_TIERS: MembershipTierCount[] = [
    { tier: 'Bronze', count: 2140 },
    { tier: 'Silver', count: 980 },
    { tier: 'Gold', count: 610 },
    { tier: 'VIP', count: 130 },
];

export const VIP_CUSTOMER = {
    name: 'Tran Thi Kim Anh',
    tier: 'VIP' as const,
    totalSpent: 48500000,
    visits: 214,
    memberSince: '2022-04-11',
};

export const PEAK_HOURS: PeakHourPoint[] = [
    { hour: '8am', visits: 42 },
    { hour: '10am', visits: 65 },
    { hour: '12pm', visits: 118 },
    { hour: '2pm', visits: 74 },
    { hour: '4pm', visits: 88 },
    { hour: '6pm', visits: 132 },
    { hour: '8pm', visits: 96 },
    { hour: '10pm', visits: 38 },
];

export const TOP_CUSTOMERS: TopCustomer[] = [
    { id: 1, name: 'Tran Thi Kim Anh', tier: 'VIP', totalSpent: 48500000, visits: 214 },
    { id: 2, name: 'Nguyen Minh Duc', tier: 'Gold', totalSpent: 21300000, visits: 96 },
    { id: 3, name: 'Le Hoang Nam', tier: 'Gold', totalSpent: 18700000, visits: 88 },
    { id: 4, name: 'Pham Thu Trang', tier: 'Silver', totalSpent: 9400000, visits: 52 },
    { id: 5, name: 'Vo Thi Ngoc', tier: 'Silver', totalSpent: 7600000, visits: 41 },
];

export const DEVICE_VISITS: DeviceVisit[] = [
    { device: 'Mobile', percentage: 58 },
    { device: 'Desktop', percentage: 31 },
    { device: 'Tablet', percentage: 11 },
];
