'use client';

import { useApi } from '@/lib/hooks/use-api';
import { currency } from '@/lib/currency';
import { ShiftEodReport as ShiftEodReportType, ShiftRecord } from '@/types/admin';
import { getTranslation } from '@/i18n';

interface Props {
    activeShift: ShiftRecord | null;
}

export default function PosEodReport({ activeShift }: Props) {
    const { t } = getTranslation();
    const { data: report, isLoading: loading } = useApi<ShiftEodReportType>(activeShift ? `/shifts/${activeShift.shift_id}/eod-report/` : null);

    if (!activeShift) {
        return <div className="py-10 text-center text-white-dark">No shift currently open</div>;
    }

    if (loading || !report) {
        return <div className="py-10 text-center text-white-dark">{t('loading')}</div>;
    }

    return (
        <div>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="panel bg-primary/5">
                    <div className="text-sm text-white-dark">{t('total_revenue')}</div>
                    <div className="text-2xl font-bold">{currency(report.grand_total)}</div>
                </div>
                <div className="panel bg-primary/5">
                    <div className="text-sm text-white-dark">Orders</div>
                    <div className="text-2xl font-bold">{report.order_count}</div>
                </div>
                <div className="panel bg-primary/5">
                    <div className="text-sm text-white-dark">
                        {t('cash')} / {t('bank_qr')}
                    </div>
                    <div className="text-lg font-bold">
                        {currency(report.cash_total)} / {currency(report.bank_qr_total)}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="mb-2 font-semibold">{t('hourly_revenue')}</div>
                {report.hourly_breakdown.length === 0 ? (
                    <div className="text-sm text-white-dark">No sales yet this shift</div>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Hour</th>
                                    <th>Orders</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.hourly_breakdown.map((h) => (
                                    <tr key={h.hour}>
                                        <td>{new Date(h.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{h.order_count}</td>
                                        <td>{currency(h.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div>
                <div className="mb-2 font-semibold">{t('top_products')}</div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('product_name')}</th>
                                <th>{t('qty_sold')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.top_products.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="!text-center font-semibold text-white-dark">
                                        No sales yet this shift
                                    </td>
                                </tr>
                            )}
                            {report.top_products.map((p) => (
                                <tr key={p.product__product_id}>
                                    <td>{p.product__product_name}</td>
                                    <td>{p.total_qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
