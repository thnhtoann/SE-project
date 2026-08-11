import { MarketplaceChannelSetting, PaymentMethodSetting, StoreInformation } from '@/types/admin';

export const STORE_INFORMATION: StoreInformation = {
    storeName: 'Mart+ Central',
    logoUrl: '/assets/images/logo.svg',
    businessSector: 'Supermarket',
    taxId: '0312345678',
    phone: '+84 28 3822 1234',
    email: 'contact@martplus.vn',
    address: '9 Nguyen Hue Boulevard, District 1',
    city: 'Ho Chi Minh City',
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh (GMT+7)',
    openingTime: '07:00',
    closingTime: '22:00',
};

export const PAYMENT_METHOD_SETTINGS: PaymentMethodSetting[] = [
    { method: 'Cash', enabled: true, accountDetail: '' },
    { method: 'Card', enabled: true, accountDetail: 'Merchant ID: VCB-88213' },
    { method: 'MoMo', enabled: true, accountDetail: 'Business ID: MOMO-3391' },
    { method: 'Online Banking', enabled: false, accountDetail: 'VietinBank •••• 4821' },
];

// Same channel names as CHANNEL_REVENUE in mock-dashboards.ts, minus POS (the
// in-store register, not an external channel to connect/disconnect here).
export const MARKETPLACE_CHANNEL_SETTINGS: MarketplaceChannelSetting[] = [
    { channel: 'GrabMart', connected: true, storePartnerId: 'GM-10432' },
    { channel: 'ShopeeFood', connected: true, storePartnerId: 'SF-88214' },
    { channel: 'BeMart', connected: false, storePartnerId: '' },
    { channel: 'Shopee', connected: true, storePartnerId: 'SHP-55291' },
    { channel: 'Lazada', connected: false, storePartnerId: '' },
    { channel: 'TikTok Shop', connected: false, storePartnerId: '' },
];
