'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { BatchApiRecord, DiscountApiRecord, ProductApiRecord, StoreInventoryApiRecord } from '@/types/admin';

export interface CatalogEntry {
    product: ProductApiRecord;
    available: number;
    /** base_price with the product's active Discount applied, if any; equals base_price otherwise. */
    unitPrice: number;
    discountPercent?: number;
}

interface StoreCatalog {
    entries: CatalogEntry[];
    byProductId: Map<number, CatalogEntry>;
    loading: boolean;
}

const discountPercentFor = (discount: DiscountApiRecord | undefined, basePrice: number): number | undefined => {
    if (!discount) return undefined;
    if (discount.discount_type === 'percentage') return Number(discount.value);
    return Math.round((1 - Number(discount.value) / basePrice) * 100);
};

// Shared by the POS Sales Cart (product search + stock check + discounted pricing) and
// Inventory Lookup (on-hand display): assembles core.Product + core.Batch +
// core.StoreInventory + core.Discount (four flat endpoints) into per-product on-hand
// quantity and effective selling price at one store.
export function useStoreCatalog(storeId: number | null): StoreCatalog {
    const [entries, setEntries] = useState<CatalogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!storeId) {
            setEntries([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        Promise.all([
            apiFetch<ProductApiRecord[]>('/products/'),
            apiFetch<BatchApiRecord[]>('/batches/'),
            apiFetch<StoreInventoryApiRecord[]>('/store-inventories/'),
            apiFetch<DiscountApiRecord[]>('/discounts/?is_active=true').catch(() => [] as DiscountApiRecord[]),
        ])
            .then(([products, batches, inventories, discounts]) => {
                const batchToProduct = new Map(batches.map((b) => [b.batch_id, b.product]));
                const availableByProduct = new Map<number, number>();
                inventories
                    .filter((inv) => inv.store === storeId)
                    .forEach((inv) => {
                        const productId = batchToProduct.get(inv.batch);
                        if (productId === undefined) return;
                        availableByProduct.set(productId, (availableByProduct.get(productId) ?? 0) + inv.quantity);
                    });
                const activeDiscountByProduct = new Map(discounts.map((d) => [d.product, d]));

                setEntries(
                    products.map((product) => {
                        const basePrice = Number(product.base_price);
                        const discountPercent = discountPercentFor(activeDiscountByProduct.get(product.product_id), basePrice);
                        const unitPrice = discountPercent ? Math.round(basePrice * (1 - discountPercent / 100)) : basePrice;
                        return { product, available: availableByProduct.get(product.product_id) ?? 0, unitPrice, discountPercent };
                    }),
                );
            })
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, [storeId]);

    const byProductId = new Map(entries.map((e) => [e.product.product_id, e]));

    return { entries, byProductId, loading };
}
