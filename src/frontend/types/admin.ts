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
