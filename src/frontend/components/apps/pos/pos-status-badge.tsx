import { OrderStatus, PaymentMethod } from '@/components/apps/pos/pos-data';

type BadgeColor = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary';

export default function PosStatusBadge({ label, color }: { label: string; color: BadgeColor }) {
    return <span className={`badge badge-outline-${color}`}>{label}</span>;
}

export function stockStatusBadge(available: number): { label: string; color: BadgeColor } {
    if (available <= 0) return { label: 'Out of stock', color: 'danger' };
    if (available < 20) return { label: 'Low stock', color: 'warning' };
    return { label: 'In stock', color: 'success' };
}

export function orderStatusBadge(status: OrderStatus): { label: string; color: BadgeColor } {
    if (status === 'completed') return { label: 'Completed', color: 'success' };
    if (status === 'pending') return { label: 'Pending', color: 'warning' };
    return { label: 'Cancelled', color: 'danger' };
}

export function paymentMethodBadge(method: PaymentMethod): { label: string; color: BadgeColor } {
    return method === 'cash' ? { label: 'Cash', color: 'primary' } : { label: 'Bank QR', color: 'info' };
}
