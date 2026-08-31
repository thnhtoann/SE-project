import { ExpiryStatus, Product, StockStatus } from '@/types/admin';

export const NEAR_EXPIRY_DAYS = 14;

export const getTotalQuantity = (product: Product): number =>
    product.batches.reduce((sum, batch) => sum + batch.storeInventory.reduce((s, entry) => s + entry.quantity, 0), 0);

export const getStockStatus = (product: Product): StockStatus => {
    const quantity = getTotalQuantity(product);
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= product.min_threshold) return 'Low Stock';
    return 'In Stock';
};

export const getBatchExpiryStatus = (expirationDate: string, today: Date = new Date()): ExpiryStatus => {
    const daysUntil = (new Date(expirationDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 0) return 'Expired';
    if (daysUntil <= NEAR_EXPIRY_DAYS) return 'Near Expiry';
    return 'OK';
};

// Worst-case status across all batches: any expired batch makes the whole
// product Expired for discount-gating purposes (FR-016), even if other
// batches are still fine.
export const getProductExpiryStatus = (product: Product, today: Date = new Date()): ExpiryStatus => {
    const statuses = product.batches.map((b) => getBatchExpiryStatus(b.expiration_date, today));
    if (statuses.includes('Expired')) return 'Expired';
    if (statuses.includes('Near Expiry')) return 'Near Expiry';
    return 'OK';
};

export const getNearestExpirationDate = (product: Product): string | null => {
    if (product.batches.length === 0) return null;
    return product.batches.reduce((earliest, b) => (b.expiration_date < earliest ? b.expiration_date : earliest), product.batches[0].expiration_date);
};

export const stockStatusBadgeClass: Record<StockStatus, string> = {
    'In Stock': 'bg-success-light text-success dark:bg-success dark:text-success-light',
    'Low Stock': 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
    'Out of Stock': 'bg-danger-light text-danger dark:bg-danger dark:text-danger-light',
};

export const expiryStatusBadgeClass: Record<ExpiryStatus, string> = {
    OK: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    'Near Expiry': 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
    Expired: 'bg-danger-light text-danger dark:bg-danger dark:text-danger-light',
};

// i18n key per status value — see public/locales/en.json
export const stockStatusKey: Record<StockStatus, string> = {
    'In Stock': 'stock_in_stock',
    'Low Stock': 'stock_low_stock',
    'Out of Stock': 'stock_out_of_stock',
};

export const expiryStatusKey: Record<ExpiryStatus, string> = {
    OK: 'expiry_ok',
    'Near Expiry': 'expiry_near_expiry',
    Expired: 'expiry_expired',
};

export const discountedPrice = (product: Product): number =>
    product.discountPercent ? Math.round(product.base_price * (1 - product.discountPercent / 100)) : product.base_price;
