'use client';

import { useEffect, useRef } from 'react';
import IconSearch from '@/components/icon/icon-search';
import { getTranslation } from '@/i18n';
import { currency } from '@/lib/currency';
import { CatalogEntry } from '@/lib/hooks/use-store-catalog';

interface Props {
    value: string;
    onChange: (value: string) => void;
    suggestions: CatalogEntry[];
    onSelectSuggestion: (entry: CatalogEntry) => void;
}

export default function PosProductSearch({ value, onChange, suggestions, onSelectSuggestion }: Props) {
    const { t } = getTranslation();
    const inputRef = useRef<HTMLInputElement>(null);

    // Re-focus the barcode/search input after every add so a physical scanner (which just
    // types + Enter into whatever has focus) keeps working without the cashier touching the mouse.
    useEffect(() => {
        if (value === '') inputRef.current?.focus();
    }, [value]);

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
                    {suggestions.map(({ product, available }) => (
                        <button
                            key={product.product_id}
                            type="button"
                            disabled={available <= 0}
                            className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => onSelectSuggestion({ product, available })}
                        >
                            <span>
                                {product.product_name}
                                <span className="ml-2 text-xs text-white-dark">{product.barcode}</span>
                            </span>
                            <span className="font-semibold">{currency(product.base_price)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
