'use client';
import IconBox from '@/components/icon/icon-box';
import IconPlus from '@/components/icon/icon-plus';
import IconTag from '@/components/icon/icon-tag';
import IconX from '@/components/icon/icon-x';
import { SUPPLIERS } from '@/data/mock-products';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import React, { useState } from 'react';

const currency = (value: number) => `₫${Math.round(value).toLocaleString('en-US')}`;

interface FormState {
    productName: string;
    category: string;
    price: string;
    unit: string;
    barcode: string;
    storageNotes: string;
    batchNo: string;
    manufactureDate: string;
    expiryDate: string;
    supplierId: string;
    minThreshold: string;
}

const emptyForm: FormState = {
    productName: '',
    category: '',
    price: '',
    unit: '',
    barcode: '',
    storageNotes: '',
    batchNo: '',
    manufactureDate: '',
    expiryDate: '',
    supplierId: '',
    minThreshold: '',
};

const CATEGORIES = ['Beverages', 'Food', 'Snacks', 'Dairy', 'Personal Care', 'Household', 'Tobacco'];

const ComponentsInventoryAddForm = () => {
    const { t } = getTranslation();
    const [form, setForm] = useState<FormState>(emptyForm);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const changeValue = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm((prev) => ({ ...prev, [id]: value }));
    };

    const addTag = () => {
        const value = tagInput.trim();
        if (value && !tags.includes(value)) {
            setTags((prev) => [...prev, value]);
        }
        setTagInput('');
    };

    const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.productName) return setError(t('error_product_name_required'));
        if (!form.category) return setError(t('error_category_required'));
        if (!form.price || Number(form.price) <= 0) return setError(t('error_price_required'));
        if (!form.barcode) return setError(t('error_barcode_required'));
        if (!form.supplierId) return setError(t('error_supplier_required'));

        // No backend yet — frontend-only, so the new product isn't persisted
        // into the mock Product List.
        setSuccess(true);
    };

    const supplier = SUPPLIERS.find((s) => s.supplier_id === Number(form.supplierId));
    const price = Number(form.price) || 0;

    if (success) {
        return (
            <div>
                <div className="panel mx-auto mt-10 max-w-lg text-center">
                    <h5 className="mb-2 text-lg font-semibold text-success">{t('product_created')}</h5>
                    <p className="text-white-dark">
                        {form.productName} {t('product_created_message')}
                    </p>
                    <Link href="/inventory" className="btn btn-primary mt-6">
                        {t('back_to_product_list')}
                    </Link>
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
                        <div className="grid h-32 w-32 mx-auto place-content-center rounded-md border border-dashed border-white-light text-white-dark dark:border-[#1b2e4b]">
                            <IconBox className="h-10 w-10" />
                        </div>
                        <div className="mt-4 text-center">
                            <div className="font-semibold">{form.productName || t('product_name')}</div>
                            <div className="text-sm text-white-dark">{supplier?.supplier_name ?? t('supplier')}</div>
                            <div className="mt-2 text-xl font-bold">{price > 0 ? currency(price) : '₫0'}</div>
                        </div>
                        {tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {tags.map((tag) => (
                                    <span key={tag} className="badge badge-outline-primary inline-flex items-center gap-1">
                                        <IconTag className="h-3 w-3" />
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-danger">
                                            <IconX className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 flex gap-2">
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('add_tag_placeholder')}
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                            />
                            <button type="button" className="btn btn-outline-primary shrink-0" onClick={addTag}>
                                <IconPlus />
                            </button>
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
                                    <label htmlFor="category">{t('category')}</label>
                                    <select id="category" className="form-select" value={form.category} onChange={changeValue} required>
                                        <option value="">{t('select_category')}</option>
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="supplierId">{t('supplier')}</label>
                                    <select id="supplierId" className="form-select" value={form.supplierId} onChange={changeValue} required>
                                        <option value="">{t('select_supplier')}</option>
                                        {SUPPLIERS.map((s) => (
                                            <option key={s.supplier_id} value={s.supplier_id}>
                                                {s.supplier_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="price">{t('price')} (₫)</label>
                                    <input id="price" type="number" min={0} placeholder="e.g. 12000" className="form-input" value={form.price} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="unit">{t('unit_type')}</label>
                                    <input id="unit" type="text" placeholder="e.g. can, bottle, pack" className="form-input" value={form.unit} onChange={changeValue} />
                                </div>
                                <div>
                                    <label htmlFor="barcode">{t('barcode')}</label>
                                    <input id="barcode" type="text" placeholder="e.g. 8935049501012" className="form-input" value={form.barcode} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="minThreshold">{t('min_threshold')}</label>
                                    <input id="minThreshold" type="number" min={0} placeholder="e.g. 30" className="form-input" value={form.minThreshold} onChange={changeValue} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="storageNotes">{t('storage_notes')}</label>
                                    <textarea id="storageNotes" rows={2} placeholder={t('storage_notes_placeholder')} className="form-textarea resize-none" value={form.storageNotes} onChange={changeValue} />
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                            <h6 className="mb-5 text-lg font-bold">{t('initial_batch')}</h6>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                <div>
                                    <label htmlFor="batchNo">{t('batch_no')}</label>
                                    <input id="batchNo" type="text" placeholder="e.g. 1011" className="form-input" value={form.batchNo} onChange={changeValue} />
                                </div>
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
                            <button type="submit" className="btn btn-primary">
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
