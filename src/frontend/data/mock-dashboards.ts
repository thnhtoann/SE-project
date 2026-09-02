import { Branch, DeviceVisit, MembershipTierCount, ReportPeriod, TopCustomer } from '@/types/admin';

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

export const BRANCHES: Branch[] = [
    { id: 1, name: 'District 1 Branch', address: '9 Nguyen Hue Boulevard, District 1, Ho Chi Minh City', revenue: 182500000 },
    { id: 2, name: 'District 3 Branch', address: '48 Le Loi Street, District 3, Ho Chi Minh City', revenue: 96400000 },
    { id: 3, name: 'District 7 Branch', address: '77 Nguyen Van Linh Street, District 7, Ho Chi Minh City', revenue: 133600000 },
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
