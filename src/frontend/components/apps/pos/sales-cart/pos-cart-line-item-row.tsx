import IconTrash from '@/components/icon/icon-trash';
import IconPlus from '@/components/icon/icon-plus';
import IconMinus from '@/components/icon/icon-minus';
import { CartLineItem } from '@/components/apps/pos/pos-data';

interface Props {
    item: CartLineItem;
    onQuantityChange: (productId: string, quantity: number) => void;
    onRemove: (productId: string) => void;
}

export default function PosCartLineItemRow({ item, onQuantityChange, onRemove }: Props) {
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
            <td className="w-1 whitespace-nowrap">${item.unitPrice.toFixed(2)}</td>
            <td className="w-1 whitespace-nowrap font-semibold">${item.subTotal.toFixed(2)}</td>
            <td className="w-1">
                <button type="button" onClick={() => onRemove(item.productId)}>
                    <IconTrash className="h-4 w-4 text-danger" />
                </button>
            </td>
        </tr>
    );
}
