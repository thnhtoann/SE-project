'use client';

import { useEffect, useRef, useState } from 'react';
import IconSearch from '@/components/icon/icon-search';
import IconX from '@/components/icon/icon-x';
import { getTranslation } from '@/i18n';
import { Product } from '@/components/apps/pos/pos-data';

interface Props {
    value: string;
    onChange: (value: string) => void;
    suggestions: Product[];
    onSelectSuggestion: (product: Product) => void;
    showCustomForm: boolean;
    onCloseCustomForm: () => void;
    onAddCustomProduct: (name: string, price: number) => void;
}

export default function PosProductSearch({ value, onChange, suggestions, onSelectSuggestion, showCustomForm, onCloseCustomForm, onAddCustomProduct }: Props) {
    const { t } = getTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [customName, setCustomName] = useState('');
    const [customPrice, setCustomPrice] = useState('');

    // Re-focus the barcode/search input after every add so a physical scanner (which just
    // types + Enter into whatever has focus) keeps working without the cashier touching the mouse.
    useEffect(() => {
        if (value === '') inputRef.current?.focus();
    }, [value]);

    const submitCustomProduct = () => {
        const price = Number(customPrice);
        if (!customName.trim() || Number.isNaN(price) || price <= 0) return;
        onAddCustomProduct(customName.trim(), price);
        setCustomName('');
        setCustomPrice('');
    };

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    data-pos-barcode-input="true"
                    autoFocus
                    className="form-input py-3 ltr:pl-10 rtl:pr-10"
                    placeholder={t('scan_or_search_product')}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <span className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
                    <IconSearch className="h-5 w-5 text-white-dark" />
                </span>
            </div>

            {value.trim() && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-white-light bg-white shadow-lg dark:border-[#1b2e4b] dark:bg-[#0e1726]">
                    {suggestions.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-primary/10"
                            onClick={() => onSelectSuggestion(p)}
                        >
                            <span>
                                {p.name}
                                <span className="ml-2 text-xs text-white-dark">{p.barcode}</span>
                            </span>
                            <span className="font-semibold">${(p.discountedPrice ?? p.basePrice).toFixed(2)}</span>
                        </button>
                    ))}
                </div>
            )}

            {showCustomForm && (
                <div className="panel mt-3">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">{t('custom_product')}</div>
                        <button type="button" onClick={onCloseCustomForm}>
                            <IconX className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1">
                            <label htmlFor="custom-product-name">{t('product_name')}</label>
                            <input
                                id="custom-product-name"
                                type="text"
                                className="form-input"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                            />
                        </div>
                        <div className="w-32">
                            <label htmlFor="custom-product-price">Price ($)</label>
                            <input
                                id="custom-product-price"
                                type="number"
                                min={0}
                                step="0.01"
                                className="form-input"
                                value={customPrice}
                                onChange={(e) => setCustomPrice(e.target.value)}
                            />
                        </div>
                        <button type="button" className="btn btn-primary" onClick={submitCustomProduct}>
                            {t('add')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
