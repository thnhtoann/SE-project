import IconTrash from '@/components/icon/icon-trash';
import IconPlus from '@/components/icon/icon-plus';
import IconMinus from '@/components/icon/icon-minus';
import IconTag from '@/components/icon/icon-tag';
import Dropdown from '@/components/dropdown';
import { CartLineItem, LineDiscountType } from '@/components/apps/pos/pos-data';
import { currency } from '@/lib/currency';
import { getTranslation } from '@/i18n';

interface Props {
    item: CartLineItem;
    onQuantityChange: (productId: number, quantity: number) => void;
    onDiscountChange: (productId: number, discountType: LineDiscountType, discountValue: number) => void;
    onRemove: (productId: number) => void;
}

export default function PosCartLineItemRow({ item, onQuantityChange, onDiscountChange, onRemove }: Props) {
    const { t } = getTranslation();
    const hasDiscount = item.discountType !== null && item.discountValue > 0;

    return (
        <tr className="align-middle">
            <td>
                <div className="font-semibold">{item.name}</div>
                <div className="text-xs text-white-dark">{item.barcode}</div>
            </td>
            <td className="w-1">
                <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-outline-primary h-7 w-7 p-0" onClick={() => onQuantityChange(item.productId, item.quantity - 1)}>
                        <IconMinus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button type="button" className="btn btn-outline-primary h-7 w-7 p-0" onClick={() => onQuantityChange(item.productId, item.quantity + 1)}>
                        <IconPlus className="h-3 w-3" />
                    </button>
                </div>
            </td>
            <td className="w-1 whitespace-nowrap">{currency(item.unitPrice)}</td>
            <td className="w-1">
                <Dropdown
                    placement="bottom-end"
                    btnClassName={`flex items-center gap-1 text-xs ${hasDiscount ? 'text-primary' : 'text-white-dark'}`}
                    button={
                        <>
                            <IconTag className="h-4 w-4" />
                            {hasDiscount && <span>{item.discountType === 'percent' ? `${item.discountValue}%` : currency(item.discountValue)}</span>}
                        </>
                    }
                >
                    <div className="w-52 rounded border border-white-light bg-white p-3 shadow dark:border-[#1b2e4b] dark:bg-black" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 text-xs font-semibold text-white-dark">{t('item_discount')}</div>
                        <div className="mb-2 grid grid-cols-2 gap-1">
                            <button
                                type="button"
                                className={`btn btn-sm ${item.discountType === 'percent' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => onDiscountChange(item.productId, 'percent', item.discountValue)}
                            >
                                %
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${item.discountType === 'amount' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => onDiscountChange(item.productId, 'amount', item.discountValue)}
                            >
                                ₫
                            </button>
                        </div>
                        <input
                            type="number"
                            min={0}
                            className="form-input"
                            placeholder="0"
                            value={item.discountValue || ''}
                            onChange={(e) => onDiscountChange(item.productId, item.discountType ?? 'percent', Number(e.target.value))}
                        />
                        {hasDiscount && (
                            <button type="button" className="mt-2 text-xs text-danger underline" onClick={() => onDiscountChange(item.productId, null, 0)}>
                                {t('clear_discount')}
                            </button>
                        )}
                    </div>
                </Dropdown>
            </td>
            <td className="w-1 whitespace-nowrap font-semibold">{currency(item.subTotal)}</td>
            <td className="w-1">
                <button type="button" onClick={() => onRemove(item.productId)}>
                    <IconTrash className="h-4 w-4 text-danger" />
                </button>
            </td>
        </tr>
    );
}
