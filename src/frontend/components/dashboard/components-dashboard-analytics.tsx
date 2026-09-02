'use client';
import IconBox from '@/components/icon/icon-box';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconUsers from '@/components/icon/icon-users';
import IconUsersGroup from '@/components/icon/icon-users-group';
import PeriodSelector from '@/components/dashboard/period-selector';
import { IRootState } from '@/store';
import { useApi } from '@/lib/hooks/use-api';
import { CustomerRecord, OrderRecord, ProductApiRecord, ReportPeriod, RevenueTrendResponse, StaffRecord } from '@/types/admin';
import { currency } from '@/lib/currency';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useSelector } from 'react-redux';

export const statusBadgeClass: Record<string, string> = {
    Completed: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Pending: 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
    Canceled: 'bg-danger-light text-danger dark:bg-danger dark:text-danger-light',
};

const statusKey: Record<string, string> = {
    Completed: 'transaction_status_completed',
    Pending: 'transaction_status_pending',
    Canceled: 'transaction_status_canceled',
};

const defaultBadgeClass = 'bg-white-dark/20 text-white-dark dark:bg-[#1b2e4b]';

interface TopProductRow {
    product__product_id: number;
    product__product_name: string;
    total_sold: number;
}

const ComponentsDashboardAnalytics = () => {
    const { t } = getTranslation();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [isMounted, setIsMounted] = useState(false);
    const [period, setPeriod] = useState<ReportPeriod>('month');

    const { data: trend } = useApi<RevenueTrendResponse>(`/reports/revenue-trend/?period=${period}`);
    const { data: salesPerformance } = useApi<{ best_sellers: TopProductRow[] }>('/reports/sales-performance/?limit=5');
    const { data: orders } = useApi<OrderRecord[]>('/orders/');
    const { data: products } = useApi<ProductApiRecord[]>('/products/');
    // /staff/ is store-scoped server-side for a Store Manager (chain-wide for Chain
    // Manager/Admin); /customers/ has no store scoping at all yet (CustomerViewSet
    // has no get_queryset override) so total_customers is always chain-wide.
    const { data: staff } = useApi<StaffRecord[]>('/staff/');
    const { data: customers } = useApi<CustomerRecord[]>('/customers/');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const topProducts = salesPerformance?.best_sellers ?? [];
    const productImageById = useMemo(() => new Map((products ?? []).map((p) => [p.product_id, p.image_url])), [products]);
    const recentOrders = useMemo(() => [...(orders ?? [])].sort((a, b) => (a.order_date < b.order_date ? 1 : -1)).slice(0, 5), [orders]);

    const points = trend?.points ?? [];
    const hasData = points.length > 0;
    const totalRevenue = points.reduce((sum, p) => sum + Number(p.total), 0);

    const revenueChart: any = {
        series: [{ name: t('revenue_millions'), data: points.map((p) => Math.round(Number(p.total))) }],
        options: {
            chart: { height: 325, type: 'area', fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#4361ee'],
            xaxis: { categories: points.map((p) => p.label), axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { opposite: false, labels: { offsetX: 0 } },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed' },
            legend: { show: false },
            tooltip: { theme: isDark ? 'dark' : 'light' },
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
            },
        },
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>{t('admin_portal')}</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('analytics_dashboard')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl">{t('company_wide_analytics')}</h2>
                    <PeriodSelector value={period} onChange={setPeriod} />
                </div>

                {!hasData ? (
                    <div className="panel flex items-center justify-center py-16 text-white-dark">{t('no_sales_data_period')}</div>
                ) : (
                    <>
                        <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                                        <IconBox />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">{t('total_skus')}</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{(products ?? []).length.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light">
                                        <IconUsers />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">{t('total_staff')}</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{(staff ?? []).length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-info-light text-info dark:bg-info dark:text-info-light">
                                        <IconUsersGroup />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">{t('total_customers')}</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{(customers ?? []).length.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-success-light text-success dark:bg-success dark:text-success-light">
                                        <IconDollarSignCircle />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">{t('revenue')}</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{currency(totalRevenue)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                            <div className="panel xl:col-span-2">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('sales_analytics')}</h5>
                                {isMounted && <ReactApexChart series={revenueChart.series} options={revenueChart.options} type="area" height={325} />}
                            </div>

                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('top_selling_products')}</h5>
                                <div className="space-y-4">
                                    {topProducts.length === 0 && <p className="text-sm text-white-dark">{t('no_sales_data_period')}</p>}
                                    {topProducts.map((product) => {
                                        const imageUrl = productImageById.get(product.product__product_id);
                                        return (
                                            <div key={product.product__product_id} className="flex items-center justify-between border-b border-[#ebedf2] pb-3 last:border-0 dark:border-[#1b2e4b]">
                                                <div className="flex items-center gap-3">
                                                    {imageUrl ? (
                                                        <img src={imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                                                    ) : (
                                                        <IconBox className="h-9 w-9 shrink-0 rounded-md text-white-dark" />
                                                    )}
                                                    <h6 className="font-semibold text-[#515365] dark:text-white-dark">{product.product__product_name}</h6>
                                                </div>
                                                <span className="font-semibold text-success">
                                                    {product.total_sold.toLocaleString('en-US')} {t('units')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="panel">
                            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('latest_transactions')}</h5>
                            <div className="table-responsive">
                                <table className="table-hover">
                                    <thead>
                                        <tr>
                                            <th>{t('order_code')}</th>
                                            <th>{t('channel')}</th>
                                            <th>{t('amount')}</th>
                                            <th>{t('status')}</th>
                                            <th>{t('time')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map((o) => (
                                            <tr key={o.order_id}>
                                                <td className="font-semibold">#{o.order_id}</td>
                                                <td>{o.order_type}</td>
                                                <td>{currency(o.total_amount)}</td>
                                                <td>
                                                    <span className={`badge ${statusBadgeClass[o.status] ?? defaultBadgeClass}`}>{statusKey[o.status] ? t(statusKey[o.status]) : o.status}</span>
                                                </td>
                                                <td className="whitespace-nowrap text-white-dark">{new Date(o.order_date).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-right">
                                <Link href="/transactions" className="text-primary hover:underline">
                                    {t('view_all_pos_transactions')}
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ComponentsDashboardAnalytics;
