'use client';

import { useMemo } from 'react';
import { Order } from '@/components/apps/pos/pos-data';
import { getTranslation } from '@/i18n';

interface Props {
    orders: Order[];
}

function isToday(iso: string): boolean {
    return new Date(iso).toDateString() === new Date().toDateString();
}

// Business hours only, so the chart isn't mostly empty bars.
const VISIBLE_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h .. 21h

export default function PosEodReport({ orders }: Props) {
    const { t } = getTranslation();

    const todayOrders = useMemo(() => orders.filter((o) => o.status === 'completed' && isToday(o.orderDate)), [orders]);

    const totalRevenue = useMemo(() => Number(todayOrders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)), [todayOrders]);

    const hourly = useMemo(() => {
        const buckets = Array.from({ length: 24 }, () => 0);
        todayOrders.forEach((o) => {
            buckets[new Date(o.orderDate).getHours()] += o.totalAmount;
        });
        return buckets;
    }, [todayOrders]);
    const maxHourly = Math.max(1, ...hourly);

    const topProducts = useMemo(() => {
        const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
        todayOrders.forEach((o) => {
            o.lineItems.forEach((li) => {
                const entry = byProduct.get(li.productId) ?? { name: li.name, qty: 0, revenue: 0 };
                entry.qty += li.quantity;
                entry.revenue += li.subTotal;
                byProduct.set(li.productId, entry);
            });
        });
        return Array.from(byProduct.values())
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [todayOrders]);

    return (
        <div>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="panel bg-primary/5">
                    <div className="text-sm text-white-dark">{t('total_revenue')}</div>
                    <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                </div>
                <div className="panel bg-primary/5">
                    <div className="text-sm text-white-dark">Orders</div>
                    <div className="text-2xl font-bold">{todayOrders.length}</div>
                </div>
            </div>

            <div className="mb-6">
                <div className="mb-2 font-semibold">{t('hourly_revenue')}</div>
                <div className="flex h-40 items-end gap-1">
                    {VISIBLE_HOURS.map((hour) => (
                        <div key={hour} className="flex-1" title={`${hour}h — $${hourly[hour].toFixed(2)}`}>
                            <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(4, (hourly[hour] / maxHourly) * 140)}px` }} />
                        </div>
                    ))}
                </div>
                <div className="mt-1 flex gap-1">
                    {VISIBLE_HOURS.map((hour) => (
                        <div key={hour} className="flex-1 text-center text-[10px] text-white-dark">
                            {hour}h
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="mb-2 font-semibold">{t('top_products')}</div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('product_name')}</th>
                                <th>{t('qty_sold')}</th>
                                <th>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProducts.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="!text-center font-semibold text-white-dark">
                                        No sales yet today
                                    </td>
                                </tr>
                            )}
                            {topProducts.map((p) => (
                                <tr key={p.name}>
                                    <td>{p.name}</td>
                                    <td>{p.qty}</td>
                                    <td>${p.revenue.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
