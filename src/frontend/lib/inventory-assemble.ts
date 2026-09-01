import { apiFetch } from '@/lib/api-client';
import { BatchApiRecord, CategoryRecord, DiscountApiRecord, Product, ProductApiRecord, StoreInventoryApiRecord, StoreRecord } from '@/types/admin';

const discountPercentFor = (discount: DiscountApiRecord | undefined, basePrice: number): number | undefined => {
    if (!discount) return undefined;
    if (discount.discount_type === 'percentage') return Number(discount.value);
    return Math.round((1 - Number(discount.value) / basePrice) * 100);
};

// Assembles core.Product + core.Batch + core.StoreInventory + core.Discount (four separate
// flat endpoints) into the nested Product shape lib/inventory.ts's display helpers expect.
// There's no real supplier link on core.Product, so supplier_id is an unused placeholder and
// any supplier-specific UI should be dropped entirely rather than showing fabricated data.
export const assembleProducts = (
    products: ProductApiRecord[],
    categories: CategoryRecord[],
    batches: BatchApiRecord[],
    inventories: StoreInventoryApiRecord[],
    stores: StoreRecord[],
    discounts: DiscountApiRecord[] = [],
): Product[] => {
    const categoryName = Object.fromEntries(categories.map((c) => [c.category_id, c.category_name]));
    const storeName = Object.fromEntries(stores.map((s) => [s.store_id, s.store_name]));

    const inventoriesByBatch = new Map<number, StoreInventoryApiRecord[]>();
    inventories.forEach((inv) => {
        const list = inventoriesByBatch.get(inv.batch) ?? [];
        list.push(inv);
        inventoriesByBatch.set(inv.batch, list);
    });

    const batchesByProduct = new Map<number, BatchApiRecord[]>();
    batches.forEach((b) => {
        const list = batchesByProduct.get(b.product) ?? [];
        list.push(b);
        batchesByProduct.set(b.product, list);
    });

    const discountsByProduct = new Map<number, DiscountApiRecord[]>();
    discounts.forEach((d) => {
        const list = discountsByProduct.get(d.product) ?? [];
        list.push(d);
        discountsByProduct.set(d.product, list);
    });

    return products.map((p) => {
        const basePrice = Number(p.base_price);
        const productDiscounts = discountsByProduct.get(p.product_id) ?? [];
        const activeDiscount = productDiscounts.find((d) => d.is_active);

        return {
            product_id: p.product_id,
            barcode: p.barcode,
            product_name: p.product_name,
            base_price: basePrice,
            min_threshold: p.min_threshold,
            category: categoryName[p.category] ?? '—',
            photo: '',
            unit: '',
            tags: [],
            description: '',
            supplier_id: 0,
            discountPercent: discountPercentFor(activeDiscount, basePrice),
            discountHistory: productDiscounts.map((d) => ({ id: d.discount_id, type: d.discount_type, value: Number(d.value), appliedAt: d.applied_at.slice(0, 10) })),
            batches: (batchesByProduct.get(p.product_id) ?? []).map((b) => ({
                batch_id: b.batch_id,
                product_id: b.product,
                manufacture_date: b.manufacture_date,
                expiration_date: b.expiration_date,
                storeInventory: (inventoriesByBatch.get(b.batch_id) ?? []).map((inv) => ({
                    store: storeName[inv.store] ?? '—',
                    quantity: inv.quantity,
                })),
            })),
        };
    });
};

// Fetches and assembles the whole real product catalog (products + categories + batches +
// store-inventories + stores + active discounts). Shared by any screen that needs the nested
// Product display shape -- the Inventory list, detail, add-form, and Order Supply pages, plus
// the POS catalog hook, all need it.
export const fetchProductCatalog = async (): Promise<{ products: Product[]; categories: CategoryRecord[] }> => {
    const [products, categories, batches, inventories, stores, discounts] = await Promise.all([
        apiFetch<ProductApiRecord[]>('/products/'),
        apiFetch<CategoryRecord[]>('/categories/'),
        apiFetch<BatchApiRecord[]>('/batches/'),
        apiFetch<StoreInventoryApiRecord[]>('/store-inventories/'),
        apiFetch<StoreRecord[]>('/stores/').catch(() => [] as StoreRecord[]),
        apiFetch<DiscountApiRecord[]>('/discounts/?is_active=true').catch(() => [] as DiscountApiRecord[]),
    ]);
    return { products: assembleProducts(products, categories, batches, inventories, stores, discounts), categories };
};

// Fetches and assembles a single product by id (Inventory Detail page), including its full
// discount history (not just the active one). Returns null if the product doesn't exist (404)
// or the id is invalid.
export const fetchProductById = async (productId: number): Promise<Product | null> => {
    try {
        const [product, categories, batches, inventories, stores, discounts] = await Promise.all([
            apiFetch<ProductApiRecord>(`/products/${productId}/`),
            apiFetch<CategoryRecord[]>('/categories/'),
            apiFetch<BatchApiRecord[]>(`/batches/?product=${productId}`),
            apiFetch<StoreInventoryApiRecord[]>('/store-inventories/'),
            apiFetch<StoreRecord[]>('/stores/').catch(() => [] as StoreRecord[]),
            apiFetch<DiscountApiRecord[]>(`/discounts/?product=${productId}`).catch(() => [] as DiscountApiRecord[]),
        ]);
        return assembleProducts([product], categories, batches, inventories, stores, discounts)[0] ?? null;
    } catch {
        return null;
    }
};
