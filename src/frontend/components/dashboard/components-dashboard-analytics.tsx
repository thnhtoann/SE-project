'use client';
import IconBox from '@/components/icon/icon-box';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconUsers from '@/components/icon/icon-users';
import IconUsersGroup from '@/components/icon/icon-users-group';
import PeriodSelector from '@/components/dashboard/period-selector';
import { COMPANY_KPIS, PERIOD_MULTIPLIER, RECENT_TRANSACTIONS, REVENUE_TREND, TOP_PRODUCTS } from '@/data/mock-dashboards';
import { IRootState } from '@/store';
import { ReportPeriod } from '@/types/admin';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useSelector } from 'react-redux';

const currency = (value: number) => `₫${Math.round(value).toLocaleString('en-US')}`;

const statusBadgeClass: Record<string, string> = {
    Completed: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Pending: 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
    Canceled: 'bg-danger-light text-danger dark:bg-danger dark:text-danger-light',
};

const ComponentsDashboardAnalytics = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [isMounted, setIsMounted] = useState(false);
    const [period, setPeriod] = useState<ReportPeriod>('month');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const factor = PERIOD_MULTIPLIER[period];
    const revenueSeries = REVENUE_TREND.map((p) => Math.round(p.value * factor));
    const topProducts = TOP_PRODUCTS.map((p) => ({ ...p, unitsSold: Math.round(p.unitsSold * factor), revenue: p.revenue * factor }));
    const hasData = revenueSeries.length > 0;

    const revenueChart: any = {
        series: [{ name: 'Revenue (millions ₫)', data: revenueSeries }],
        options: {
            chart: { height: 325, type: 'area', fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#4361ee'],
            xaxis: { categories: REVENUE_TREND.map((p) => p.label), axisBorder: { show: false }, axisTicks: { show: false } },
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
                    <span>Admin Portal</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Analytics Dashboard</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl">Company-wide Analytics</h2>
                    <PeriodSelector value={period} onChange={setPeriod} />
                </div>

                {!hasData ? (
                    <div className="panel flex items-center justify-center py-16 text-white-dark">No sales data for the selected period.</div>
                ) : (
                    <>
                        <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                                        <IconBox />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">Total SKUs</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{COMPANY_KPIS.totalSkus.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light">
                                        <IconUsers />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">Total Staff</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{COMPANY_KPIS.totalStaff}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-info-light text-info dark:bg-info dark:text-info-light">
                                        <IconUsersGroup />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">Total Customers</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{COMPANY_KPIS.totalCustomers.toLocaleString('en-US')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="flex items-center">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-success-light text-success dark:bg-success dark:text-success-light">
                                        <IconDollarSignCircle />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h6 className="text-[13px] text-white-dark">Revenue</h6>
                                        <p className="text-xl font-semibold dark:text-white-light">{currency(COMPANY_KPIS.totalRevenue * factor)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                            <div className="panel xl:col-span-2">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Sales Analytics</h5>
                                {isMounted && <ReactApexChart series={revenueChart.series} options={revenueChart.options} type="area" height={325} />}
                            </div>

                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Top Selling Products</h5>
                                <div className="space-y-4">
                                    {topProducts.map((product) => (
                                        <div key={product.id} className="flex items-center justify-between border-b border-[#ebedf2] pb-3 last:border-0 dark:border-[#1b2e4b]">
                                            <div>
                                                <h6 className="font-semibold text-[#515365] dark:text-white-dark">{product.name}</h6>
                                                <p className="text-xs text-white-dark">{product.unitsSold.toLocaleString('en-US')} units</p>
                                            </div>
                                            <span className="font-semibold text-success">{currency(product.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="panel">
                            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Latest Transactions</h5>
                            <div className="table-responsive">
                                <table className="table-hover">
                                    <thead>
                                        <tr>
                                            <th>Customer</th>
                                            <th>Channel</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {RECENT_TRANSACTIONS.map((tx) => (
                                            <tr key={tx.id}>
                                                <td className="font-semibold">{tx.customer}</td>
                                                <td>{tx.channel}</td>
                                                <td>{currency(tx.amount)}</td>
                                                <td>
                                                    <span className={`badge ${statusBadgeClass[tx.status]}`}>{tx.status}</span>
                                                </td>
                                                <td className="whitespace-nowrap text-white-dark">{new Date(tx.date).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-right">
                                <Link href="/transactions" className="text-primary hover:underline">
                                    View all POS transactions
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
