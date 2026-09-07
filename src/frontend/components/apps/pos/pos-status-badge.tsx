type BadgeColor = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary';

export default function PosStatusBadge({ label, color }: { label: string; color: BadgeColor }) {
    return <span className={`badge badge-outline-${color}`}>{label}</span>;
}

export function stockStatusBadge(available: number): { label: string; color: BadgeColor } {
    if (available <= 0) return { label: 'Out of stock', color: 'danger' };
    if (available < 20) return { label: 'Low stock', color: 'warning' };
    return { label: 'In stock', color: 'success' };
}

// Matches core.models.Order.status values as actually written by the checkout
// endpoint / omnichannel webhooks ('Completed', 'Pending', 'Canceled').
export function orderStatusBadge(status: string): { label: string; color: BadgeColor } {
    if (status === 'Completed') return { label: 'Completed', color: 'success' };
    if (status === 'Pending') return { label: 'Pending', color: 'warning' };
    return { label: status, color: 'danger' };
}

export function paymentMethodBadge(method: string): { label: string; color: BadgeColor } {
    return method === 'Cash' ? { label: 'Cash', color: 'primary' } : { label: method, color: 'info' };
}
