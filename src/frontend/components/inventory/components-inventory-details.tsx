'use client';
import IconBox from '@/components/icon/icon-box';
import IconMail from '@/components/icon/icon-mail';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconTag from '@/components/icon/icon-tag';
import { getTranslation } from '@/i18n';
import {
    discountedPrice,
    expiryStatusBadgeClass,
    expiryStatusKey,
    getBatchExpiryStatus,
    getProductExpiryStatus,
    getStockStatus,
    getTotalQuantity,
    stockStatusBadgeClass,
    stockStatusKey,
} from '@/lib/inventory';
import { SUPPLIERS } from '@/data/mock-products';
import { DiscountRecord, Product } from '@/types/admin';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const currency = (value: number) => `₫${Math.round(value).toLocaleString('en-US')}`;

type DiscountType = 'percentage' | 'price';

const ComponentsInventoryDetails = ({ product: initialProduct }: { product: Product }) => {
    const { t } = getTranslation();
    const [product, setProduct] = useState<Product>(initialProduct);
    const [discountType, setDiscountType] = useState<DiscountType>('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [discountError, setDiscountError] = useState('');
    const [reorderQty, setReorderQty] = useState('');
    const [reorderNote, setReorderNote] = useState('');
    const [reorderSent, setReorderSent] = useState(false);

    const discountSectionRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('focus') === 'discount') {
            discountSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [searchParams]);

    const supplier = SUPPLIERS.find((s) => s.supplier_id === product.supplier_id);
    const stockStatus = getStockStatus(product);
    const expiryStatus = getProductExpiryStatus(product);
    const quantity = getTotalQuantity(product);

    const submitReorder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reorderQty || Number(reorderQty) <= 0) return;
        setReorderSent(true);
    };

    const submitDiscount = (e: React.FormEvent) => {
        e.preventDefault();
        setDiscountError('');

        const value = Number(discountValue);
        if (!discountValue || Number.isNaN(value)) {
            setDiscountError(t('discount_error_required'));
            return;
        }
        if (discountType === 'percentage' && (value <= 0 || value > 90)) {
            setDiscountError(t('discount_error_percentage_range'));
            return;
        }
        if (discountType === 'price' && (value <= 0 || value >= product.base_price)) {
            setDiscountError(`${t('discount_error_price_range')} (${currency(product.base_price)}).`);
            return;
        }

        const percent = discountType === 'percentage' ? value : Math.round((1 - value / product.base_price) * 100);
        const record: DiscountRecord = { id: product.discountHistory.length + 1, type: discountType, value, appliedAt: new Date().toISOString().slice(0, 10) };

        setProduct((prev) => ({ ...prev, discountPercent: percent, discountHistory: [record, ...prev.discountHistory] }));
        setDiscountValue('');
    };

    const removeDiscount = () => {
        setProduct((prev) => ({ ...prev, discountPercent: undefined }));
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/inventory" className="text-primary hover:underline">
                        {t('inventory')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('product_details')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="panel lg:col-span-2">
                        <div className="flex flex-col gap-5 sm:flex-row">
                            <div className="grid h-32 w-32 shrink-0 place-content-center rounded-md border border-white-light text-white-dark dark:border-[#1b2e4b]">
                                <IconBox className="h-10 w-10" />
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl font-semibold">{product.product_name}</h2>
                                    <span className={`badge ${stockStatusBadgeClass[stockStatus]}`}>{t(stockStatusKey[stockStatus])}</span>
                                    <span className={`badge ${expiryStatusBadgeClass[expiryStatus]}`}>{t(expiryStatusKey[expiryStatus])}</span>
                                </div>
                                <div className="mt-1 text-white-dark">
                                    {product.category} · {product.barcode}
                                </div>
                                <div className="mt-3">
                                    {product.discountPercent ? (
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-danger">{currency(discountedPrice(product))}</span>
                                            <span className="text-white-dark line-through">{currency(product.base_price)}</span>
                                            <span className="badge bg-danger-light text-danger dark:bg-danger dark:text-danger-light">-{product.discountPercent}%</span>
                                        </div>
                                    ) : (
                                        <span className="text-2xl font-bold">{currency(product.base_price)}</span>
                                    )}
                                </div>
                                <div className="mt-3 text-sm text-white-dark">
                                    {t('quantity_on_hand')}: <span className="font-semibold text-[#515365] dark:text-white-light">{quantity}</span> {product.unit}
                                    {quantity === 1 ? '' : 's'}
                                </div>
                                {product.tags.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {product.tags.map((tag) => (
                                            <span key={tag} className="badge badge-outline-primary inline-flex items-center gap-1">
                                                <IconTag className="h-3 w-3" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {product.description && <p className="mt-4 text-white-dark">{product.description}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <h5 className="mb-4 text-lg font-semibold">{t('supplier_details')}</h5>
                        {supplier ? (
                            <div className="space-y-3">
                                <div className="font-semibold">{supplier.supplier_name}</div>
                                <div className="flex items-center gap-2 text-white-dark">
                                    <IconMail className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{supplier.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white-dark">
                                    <IconPhone className="h-4 w-4 shrink-0" />
                                    <span dir="ltr">{supplier.contact_phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white-dark">
                                    <IconMapPin className="h-4 w-4 shrink-0" />
                                    <span>{supplier.address}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-white-dark">{t('no_supplier_on_file')}</p>
                        )}

                        <h5 className="mb-4 mt-6 text-lg font-semibold">{t('reorder_stock')}</h5>
                        {reorderSent ? (
                            <div className="rounded border border-success bg-success-light px-4 py-3 text-success">
                                {t('reorder_request_sent_to')} {supplier?.supplier_name ?? t('the_supplier')}.
                            </div>
                        ) : (
                            <form onSubmit={submitReorder} className="space-y-3">
                                <div>
                                    <label htmlFor="reorderQty">{t('quantity')}</label>
                                    <input id="reorderQty" type="number" min={1} className="form-input" placeholder="e.g. 100" value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} required />
                                </div>
                                <div>
                                    <label htmlFor="reorderNote">{t('note')}</label>
                                    <textarea id="reorderNote" rows={2} className="form-textarea resize-none" placeholder={t('reorder_note_placeholder')} value={reorderNote} onChange={(e) => setReorderNote(e.target.value)} />
                                </div>
                                <button type="submit" className="btn btn-primary w-full">
                                    {t('send_reorder_request')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="panel mt-5">
                    <h5 className="mb-4 text-lg font-semibold">{t('batches')}</h5>
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>{t('batch_id')}</th>
                                    <th>{t('manufacture_date')}</th>
                                    <th>{t('expiration_date')}</th>
                                    <th className="text-right">{t('quantity')}</th>
                                    <th>{t('status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {product.batches.map((batch) => {
                                    const batchStatus = getBatchExpiryStatus(batch.expiration_date);
                                    const batchQty = batch.storeInventory.reduce((s, e) => s + e.quantity, 0);
                                    return (
                                        <tr key={batch.batch_id}>
                                            <td>#{batch.batch_id}</td>
                                            <td>{batch.manufacture_date}</td>
                                            <td>{batch.expiration_date}</td>
                                            <td className="text-right">{batchQty}</td>
                                            <td>
                                                <span className={`badge ${expiryStatusBadgeClass[batchStatus]}`}>{t(expiryStatusKey[batchStatus])}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="panel mt-5" ref={discountSectionRef}>
                    <h5 className="mb-4 text-lg font-semibold">{t('discount')}</h5>
                    {expiryStatus === 'Expired' ? (
                        <div className="rounded border border-danger bg-danger-light px-4 py-3 text-danger">{t('discount_blocked_expired')}</div>
                    ) : (
                        <>
                            {product.discountPercent && (
                                <div className="mb-4 flex items-center justify-between rounded border border-white-light px-4 py-3 dark:border-[#1b2e4b]">
                                    <span>
                                        {t('active_discount')}: <span className="font-semibold text-danger">-{product.discountPercent}%</span> ({currency(discountedPrice(product))})
                                    </span>
                                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={removeDiscount}>
                                        {t('remove_discount')}
                                    </button>
                                </div>
                            )}
                            {discountError && <div className="mb-4 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{discountError}</div>}
                            <form onSubmit={submitDiscount} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <label htmlFor="discountType">{t('type')}</label>
                                    <select id="discountType" className="form-select" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                                        <option value="percentage">{t('percentage_off')}</option>
                                        <option value="price">{t('new_price')}</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="discountValue">{discountType === 'percentage' ? t('percent_off') : `${t('new_price')} (₫)`}</label>
                                    <input
                                        id="discountValue"
                                        type="number"
                                        min={0}
                                        className="form-input"
                                        placeholder={discountType === 'percentage' ? 'e.g. 20' : 'e.g. 10000'}
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary">
                                    {t('apply_discount')}
                                </button>
                            </form>
                        </>
                    )}

                    {product.discountHistory.length > 0 && (
                        <div className="mt-6">
                            <h6 className="mb-2 font-semibold">{t('discount_history')}</h6>
                            <ul className="space-y-1 text-sm text-white-dark">
                                {product.discountHistory.map((record) => (
                                    <li key={record.id}>
                                        {record.appliedAt} — {record.type === 'percentage' ? `${record.value}% ${t('off_suffix')}` : `${t('new_price')} ${currency(record.value)}`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComponentsInventoryDetails;
