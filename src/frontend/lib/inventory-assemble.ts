import { apiFetch } from '@/lib/api-client';
import { BatchApiRecord, CategoryRecord, Product, ProductApiRecord, StoreInventoryApiRecord, StoreRecord } from '@/types/admin';

// Assembles core.Product + core.Batch + core.StoreInventory (three separate
// flat endpoints) into the nested Product shape lib/inventory.ts's display
// helpers expect. There's no real supplier link on core.Product, so
// supplier_id is an unused placeholder and any supplier-specific UI should
// be dropped entirely rather than showing fabricated data.
export const assembleProducts = (
    products: ProductApiRecord[],
    categories: CategoryRecord[],
    batches: BatchApiRecord[],
    inventories: StoreInventoryApiRecord[],
    stores: StoreRecord[],
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

    return products.map((p) => ({
        product_id: p.product_id,
        barcode: p.barcode,
        product_name: p.product_name,
        base_price: Number(p.base_price),
        min_threshold: p.min_threshold,
        category: categoryName[p.category] ?? '—',
        photo: '',
        unit: '',
        tags: [],
        description: '',
        supplier_id: 0,
        discountHistory: [],
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
    }));
};

// Fetches and assembles the whole real product catalog (products + categories + batches +
// store-inventories + stores). Shared by any screen that needs the nested Product display
// shape -- the Inventory list, detail, add-form, and Order Supply pages all need it.
export const fetchProductCatalog = async (): Promise<{ products: Product[]; categories: CategoryRecord[] }> => {
    const [products, categories, batches, inventories, stores] = await Promise.all([
        apiFetch<ProductApiRecord[]>('/products/'),
        apiFetch<CategoryRecord[]>('/categories/'),
        apiFetch<BatchApiRecord[]>('/batches/'),
        apiFetch<StoreInventoryApiRecord[]>('/store-inventories/'),
        apiFetch<StoreRecord[]>('/stores/').catch(() => [] as StoreRecord[]),
    ]);
    return { products: assembleProducts(products, categories, batches, inventories, stores), categories };
};

// Fetches and assembles a single product by id (Inventory Detail page). Returns null if the
// product doesn't exist (404) or the id is invalid.
export const fetchProductById = async (productId: number): Promise<Product | null> => {
    try {
        const [product, categories, batches, inventories, stores] = await Promise.all([
            apiFetch<ProductApiRecord>(`/products/${productId}/`),
            apiFetch<CategoryRecord[]>('/categories/'),
            apiFetch<BatchApiRecord[]>(`/batches/?product=${productId}`),
            apiFetch<StoreInventoryApiRecord[]>('/store-inventories/'),
            apiFetch<StoreRecord[]>('/stores/').catch(() => [] as StoreRecord[]),
        ]);
        return assembleProducts([product], categories, batches, inventories, stores)[0] ?? null;
    } catch {
        return null;
    }
};
