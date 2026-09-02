'use client';
import IconBox from '@/components/icon/icon-box';
import { getTranslation } from '@/i18n';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { currency } from '@/lib/currency';
import { CategoryRecord, ProductApiRecord } from '@/types/admin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

interface FormState {
    productName: string;
    categoryId: string;
    price: string;
    barcode: string;
    minThreshold: string;
    manufactureDate: string;
    expiryDate: string;
}

const emptyForm: FormState = {
    productName: '',
    categoryId: '',
    price: '',
    barcode: '',
    minThreshold: '',
    manufactureDate: '',
    expiryDate: '',
};

const NEW_CATEGORY_OPTION = '__new__';

const ComponentsInventoryAddForm = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [form, setForm] = useState<FormState>(emptyForm);
    const { data: categories, mutate: mutateCategories } = useApi<CategoryRecord[]>('/categories/');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [createdProductId, setCreatedProductId] = useState<number | null>(null);

    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryError, setCategoryError] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState('');

    useEffect(() => {
        // Revoke the previous object URL whenever it's replaced or the component unmounts.
        return () => {
            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        };
    }, [imagePreviewUrl]);

    const changeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageError('');
        if (file.size > 5 * 1024 * 1024) {
            setImageError(t('error_image_too_large'));
            if (imageInputRef.current) imageInputRef.current.value = '';
            return;
        }
        setImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    };

    const changeValue = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        if (id === 'categoryId' && value === NEW_CATEGORY_OPTION) {
            setAddingCategory(true);
            return;
        }
        setForm((prev) => ({ ...prev, [id]: value }));
    };

    const createCategory = async () => {
        setCategoryError('');
        if (!newCategoryName.trim()) return setCategoryError(t('error_category_name_required'));

        setCreatingCategory(true);
        try {
            const category = await apiFetch<CategoryRecord>('/categories/', { method: 'POST', body: { category_name: newCategoryName.trim() } });
            await mutateCategories((prev) => [...(prev ?? []), category], { revalidate: false });
            setForm((prev) => ({ ...prev, categoryId: String(category.category_id) }));
            setAddingCategory(false);
            setNewCategoryName('');
        } catch (err) {
            setCategoryError(err instanceof ApiError ? (err.body as { detail?: string } | null)?.detail ?? err.message : t('error_category_name_required'));
        } finally {
            setCreatingCategory(false);
        }
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.productName) return setError(t('error_product_name_required'));
        if (!form.categoryId) return setError(t('error_category_required'));
        if (!form.price || Number(form.price) <= 0) return setError(t('error_price_required'));
        if (!form.barcode) return setError(t('error_barcode_required'));
        if ((form.manufactureDate && !form.expiryDate) || (!form.manufactureDate && form.expiryDate)) {
            return setError(t('error_batch_dates_incomplete'));
        }

        setSubmitting(true);
        try {
            const product = await apiFetch<ProductApiRecord>('/products/', {
                method: 'POST',
                body: {
                    barcode: form.barcode,
                    product_name: form.productName,
                    base_price: form.price,
                    min_threshold: Number(form.minThreshold) || 0,
                    category: Number(form.categoryId),
                },
            });

            if (form.manufactureDate && form.expiryDate) {
                await apiFetch('/batches/', {
                    method: 'POST',
                    body: { product: product.product_id, manufacture_date: form.manufactureDate, expiration_date: form.expiryDate },
                });
            }

            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                // Best-effort: the product itself was already created successfully, so an
                // image upload failure shouldn't block the user from seeing that.
                await apiFetch(`/products/${product.product_id}/upload-image/`, { method: 'POST', body: formData }).catch(() => {});
            }

            setCreatedProductId(product.product_id);
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.body as Record<string, string[]> | { detail?: string } | null;
                const firstFieldError = body && typeof body === 'object' && !('detail' in body) ? Object.values(body)[0]?.[0] : undefined;
                setError(firstFieldError ?? (body as { detail?: string })?.detail ?? err.message);
            } else {
                setError(t('error_create_product_failed'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const price = Number(form.price) || 0;

    if (createdProductId !== null) {
        return (
            <div>
                <div className="panel mx-auto mt-10 max-w-lg text-center">
                    <h5 className="mb-2 text-lg font-semibold text-success">{t('product_created')}</h5>
                    <p className="text-white-dark">
                        {form.productName} {t('product_created_message')}
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                        <Link href={`/inventory/${createdProductId}`} className="btn btn-outline-primary">
                            {t('view')}
                        </Link>
                        <button type="button" className="btn btn-primary" onClick={() => router.push('/inventory')}>
                            {t('back_to_product_list')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/inventory" className="text-primary hover:underline">
                        {t('inventory')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('add_product')}</span>
                </li>
            </ul>

            <div className="pt-5">
                {error && <div className="mb-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{error}</div>}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="panel">
                        <h6 className="mb-5 text-lg font-bold">{t('preview')}</h6>
                        <label
                            htmlFor="productImageInput"
                            className="group relative mx-auto grid h-32 w-32 cursor-pointer place-content-center overflow-hidden rounded-md border border-dashed border-white-light text-white-dark dark:border-[#1b2e4b]"
                        >
                            {imagePreviewUrl ? <img src={imagePreviewUrl} alt="" className="h-full w-full object-cover" /> : <IconBox className="h-10 w-10" />}
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                {t('change_photo')}
                            </span>
                        </label>
                        <input id="productImageInput" ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={changeImage} />
                        {imageError && <p className="mt-2 text-center text-xs text-danger">{imageError}</p>}
                        <div className="mt-4 text-center">
                            <div className="font-semibold">{form.productName || t('product_name')}</div>
                            <div className="mt-2 text-xl font-bold">{price > 0 ? currency(price) : '₫0'}</div>
                        </div>
                    </div>

                    <form onSubmit={submitForm} className="lg:col-span-2">
                        <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                            <h6 className="mb-5 text-lg font-bold">{t('product_information')}</h6>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label htmlFor="productName">{t('product_name')}</label>
                                    <input id="productName" type="text" placeholder="e.g. Coca-Cola 330ml" className="form-input" value={form.productName} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="categoryId">{t('category')}</label>
                                    <select id="categoryId" className="form-select" value={form.categoryId} onChange={changeValue} required>
                                        <option value="">{t('select_category')}</option>
                                        {(categories ?? []).map((c) => (
                                            <option key={c.category_id} value={c.category_id}>
                                                {c.category_name}
                                            </option>
                                        ))}
                                        <option value={NEW_CATEGORY_OPTION}>{t('add_new_category')}</option>
                                    </select>
                                    {addingCategory && (
                                        <div className="mt-2 flex items-start gap-2">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder={t('new_category_name_placeholder')}
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    autoFocus
                                                />
                                                {categoryError && <p className="mt-1 text-xs text-danger">{categoryError}</p>}
                                            </div>
                                            <button type="button" className="btn btn-primary btn-sm" onClick={createCategory} disabled={creatingCategory}>
                                                {t('add')}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => {
                                                    setAddingCategory(false);
                                                    setNewCategoryName('');
                                                    setCategoryError('');
                                                }}
                                            >
                                                {t('cancel')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="price">{t('price')} (₫)</label>
                                    <input id="price" type="number" min={0} placeholder="e.g. 12000" className="form-input" value={form.price} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="barcode">{t('barcode')}</label>
                                    <input id="barcode" type="text" placeholder="e.g. 8935049501012" className="form-input" value={form.barcode} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="minThreshold">{t('min_threshold')}</label>
                                    <input id="minThreshold" type="number" min={0} placeholder="e.g. 30" className="form-input" value={form.minThreshold} onChange={changeValue} />
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                            <h6 className="mb-2 text-lg font-bold">{t('initial_batch')}</h6>
                            <p className="mb-5 text-sm text-white-dark">{t('initial_batch_hint')}</p>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="manufactureDate">{t('manufacture_date')}</label>
                                    <input id="manufactureDate" type="date" className="form-input" value={form.manufactureDate} onChange={changeValue} />
                                </div>
                                <div>
                                    <label htmlFor="expiryDate">{t('expiration_date')}</label>
                                    <input id="expiryDate" type="date" className="form-input" value={form.expiryDate} onChange={changeValue} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4">
                            <Link href="/inventory" className="btn btn-outline-danger">
                                {t('cancel')}
                            </Link>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {t('create_product')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ComponentsInventoryAddForm;
