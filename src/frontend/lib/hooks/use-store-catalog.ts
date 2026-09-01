'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { BatchApiRecord, ProductApiRecord, StoreInventoryApiRecord } from '@/types/admin';

export interface CatalogEntry {
    product: ProductApiRecord;
    available: number;
}

interface StoreCatalog {
    entries: CatalogEntry[];
    byProductId: Map<number, CatalogEntry>;
    loading: boolean;
}

// Shared by the POS Sales Cart (product search + stock check) and Inventory Lookup
// (on-hand display): assembles core.Product + core.Batch + core.StoreInventory
// (three flat endpoints) into per-product on-hand quantity at one store.
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
        ])
            .then(([products, batches, inventories]) => {
                const batchToProduct = new Map(batches.map((b) => [b.batch_id, b.product]));
                const availableByProduct = new Map<number, number>();
                inventories
                    .filter((inv) => inv.store === storeId)
                    .forEach((inv) => {
                        const productId = batchToProduct.get(inv.batch);
                        if (productId === undefined) return;
                        availableByProduct.set(productId, (availableByProduct.get(productId) ?? 0) + inv.quantity);
                    });
                setEntries(products.map((product) => ({ product, available: availableByProduct.get(product.product_id) ?? 0 })));
            })
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, [storeId]);

    const byProductId = new Map(entries.map((e) => [e.product.product_id, e]));

    return { entries, byProductId, loading };
}
