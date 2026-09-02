'use client';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconStar from '@/components/icon/icon-star';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import PeriodSelector from '@/components/dashboard/period-selector';
import TierBadge from '@/components/customers/tier-badge';
import { BRANCH_SHARE, DEVICE_VISITS, MEMBERSHIP_TIERS, PERIOD_MULTIPLIER, TOP_CUSTOMERS, VIP_CUSTOMER } from '@/data/mock-dashboards';
import { IRootState } from '@/store';
import { useApi } from '@/lib/hooks/use-api';
import { currency } from '@/lib/currency';
import {
    PeakHoursResponse,
    ReportPeriod,
    RevenueByChannelResponse,
    RevenueTrendResponse,
    SalesByCategoryResponse,
    StaffRecord,
    StoreRecord,
} from '@/types/admin';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useSelector } from 'react-redux';

type StoreTab = 'performance' | 'customers';

const ComponentsDashboardStore = () => {
    const { t } = getTranslation();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const sessionStoreId = useSelector((state: IRootState) => state.session.storeId);
    const [isMounted, setIsMounted] = useState(false);
    const [period, setPeriod] = useState<ReportPeriod>('month');
    const [branchId, setBranchId] = useState<number | null>(null);
    const [tab, setTab] = useState<StoreTab>('performance');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // core.StoreViewSet is Chain-Manager-only even for GET, so a Store Manager viewing this
    // page (RevenueTrendView itself allows Store Manager) falls back to just their own store
    // rather than an empty branch list.
    const { data: storesData, error: storesError } = useApi<StoreRecord[]>('/stores/');
    const branches = useMemo(() => {
        if (storesData) return storesData;
        if (storesError && sessionStoreId) return [{ store_id: sessionStoreId, store_name: `Store #${sessionStoreId}`, location: '' }];
        return [];
    }, [storesData, storesError, sessionStoreId]);

    // Auto-select the first branch once the list loads, without stomping on a
    // selection the user already made on a later revalidation.
    useEffect(() => {
        if (branchId === null && branches.length > 0) setBranchId(branches[0].store_id);
    }, [branches, branchId]);

    const { data: trend } = useApi<RevenueTrendResponse>(branchId ? `/reports/revenue-trend/?period=${period}&store=${branchId}` : null);
    const { data: categoryData } = useApi<SalesByCategoryResponse>(branchId ? `/reports/sales-by-category/?period=${period}&store=${branchId}` : null);
    const { data: channelData } = useApi<RevenueByChannelResponse>(branchId ? `/reports/revenue-by-channel/?period=${period}&store=${branchId}` : null);
    const { data: peakHoursData } = useApi<PeakHoursResponse>(branchId ? `/reports/peak-hours/?period=${period}&store=${branchId}` : null);
    // Chain-Manager-only endpoint (see note above) -- degrades to an empty list for a
    // Store Manager rather than breaking the page.
    const { data: staffAll } = useApi<StaffRecord[]>('/staff/');
    const topStaff = useMemo(
        () =>
            (staffAll ?? [])
                .filter((s) => s.store === branchId)
                .sort((a, b) => b.monthly_sales - a.monthly_sales)
                .slice(0, 5),
        [staffAll, branchId],
    );

    const factor = PERIOD_MULTIPLIER[period];
    const branch = branches.find((b) => b.store_id === branchId) ?? null;
    const share = branch ? (BRANCH_SHARE[branch.store_id] ?? 1) : 1;
    // Customers tab figures below are still chain-wide mock data scaled by branch
    // share -- out of scope for this pass (skipped per product decision).
    const branchRevenue = (trend?.points ?? []).reduce((sum, p) => sum + Number(p.total), 0);
    const previousBranchRevenue = Number(trend?.previous_total ?? 0);
    // No comparison shown when the prior period had zero revenue -- a percentage
    // against a zero base is undefined/misleading, not "infinite growth".
    const revenueChangePct = previousBranchRevenue > 0 ? ((branchRevenue - previousBranchRevenue) / previousBranchRevenue) * 100 : null;

    const branchMembers = MEMBERSHIP_TIERS.map((t) => Math.round(t.count * share));

    const hasData = !!branch && trend !== undefined;

    const revenueTrendChart: any = {
        series: [
            { name: t('income'), data: (trend?.points ?? []).map((p) => Math.round(Number(p.total))) },
            { name: t('expenses'), data: (trend?.points ?? []).map((p) => Math.round(Number(p.expense_total))) },
        ],
        options: {
            chart: { type: 'area', height: 300, fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            colors: ['#00ab55', '#e7515a'],
            xaxis: { categories: (trend?.points ?? []).map((p) => p.label) },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed' },
            legend: { show: true, position: 'top', horizontalAlign: 'right', fontSize: '13px' },
            tooltip: { theme: isDark ? 'dark' : 'light' },
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
            },
        },
    };

    const channels = channelData?.channels ?? [];
    const channelTotal = channels.reduce((sum, c) => sum + Number(c.total), 0);

    const revenueSourcesChart: any = {
        series: channels.map((c) => Math.round(Number(c.total))),
        options: {
            chart: { type: 'donut', height: 400, fontFamily: 'Nunito, sans-serif' },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 12, colors: [isDark ? '#0e1726' : '#fff'] },
            colors: ['#4361ee', '#805dca', '#00ab55', '#e2a03f', '#e7515a', '#2196f3', '#00c1d4'],
            labels: channels.map((c) => c.channel),
            legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '13px', height: 70, offsetY: 10 },
            tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val: number) => currency(val) } },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            name: { fontSize: '20px', offsetY: -10 },
                            value: { fontSize: '20px', color: isDark ? '#bfc9d4' : undefined, offsetY: 12, formatter: (val: any) => currency(Number(val)) },
                            total: {
                                show: true,
                                label: t('total'),
                                color: '#888ea8',
                                fontSize: '20px',
                                formatter: () => currency(channelTotal),
                            },
                        },
                    },
                },
            },
        },
    };

    // Business-hours slice of the 24-hour response; "previous"/"current" already come
    // pre-bucketed by hour from the backend, no client-side scaling needed.
    const peakHoursPoints = (peakHoursData?.points ?? []).filter((p) => p.hour >= 7 && p.hour <= 22);
    const formatHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

    const peakHoursChart: any = {
        series: [
            { name: t('previous_period'), data: peakHoursPoints.map((p) => p.previous) },
            { name: t('current_period'), data: peakHoursPoints.map((p) => p.current) },
        ],
        options: {
            chart: { type: 'line', height: 360, fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            stroke: { curve: 'smooth', width: [2, 3], dashArray: [5, 0] },
            colors: ['#805dca', '#4361ee'],
            markers: { size: 4, strokeWidth: 0 },
            dataLabels: { enabled: false },
            legend: { show: true, position: 'top', horizontalAlign: 'right', fontSize: '13px' },
            xaxis: { categories: peakHoursPoints.map((p) => formatHour(p.hour)) },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed' },
            tooltip: { theme: isDark ? 'dark' : 'light' },
        },
    };

    // Radial bar reads best with a handful of rings, so cap to the top categories by revenue.
    const topCategories = useMemo(() => [...(categoryData?.categories ?? [])].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 5), [categoryData]);
    const categoryTotal = topCategories.reduce((sum, c) => sum + Number(c.total), 0);

    const categoryChart: any = {
        series: categoryTotal > 0 ? topCategories.map((c) => Math.round((Number(c.total) / categoryTotal) * 100)) : [],
        options: {
            chart: { type: 'radialBar', height: 360, fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            colors: ['#4361ee', '#805dca', '#00ab55', '#e2a03f', '#e7515a'],
            labels: topCategories.map((c) => c.category),
            plotOptions: {
                radialBar: {
                    dataLabels: {
                        name: { fontSize: '14px' },
                        value: { fontSize: '13px', formatter: (val: number) => `${val}%` },
                        total: {
                            show: true,
                            label: t('total'),
                            color: '#888ea8',
                            fontSize: '16px',
                            formatter: () => currency(categoryTotal),
                        },
                    },
                },
            },
            legend: { show: true, position: 'bottom', horizontalAlign: 'center', fontSize: '12px' },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed' },
            tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val: number) => `${val}%` } },
            fill: { opacity: 0.85 },
        },
    };

    const membershipChart: any = {
        series: branchMembers,
        options: {
            chart: { type: 'donut', height: 380, fontFamily: 'Nunito, sans-serif' },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 12, colors: [isDark ? '#0e1726' : '#fff'] },
            // Metal tones matching TierBadge: bronze, silver, gold, then violet for VIP.
            colors: ['#cd7f32', '#9ca3af', '#d4af37', '#7c3aed'],
            labels: MEMBERSHIP_TIERS.map((t) => t.tier),
            legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '13px', height: 50, offsetY: 10 },
            tooltip: { theme: isDark ? 'dark' : 'light' },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            name: { fontSize: '20px', offsetY: -10 },
                            value: { fontSize: '20px', color: isDark ? '#bfc9d4' : undefined, offsetY: 12 },
                            total: {
                                show: true,
                                label: t('members'),
                                color: '#888ea8',
                                fontSize: '20px',
                                formatter: (w: any) => w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString('en-US'),
                            },
                        },
                    },
                },
            },
        },
    };

    const deviceChart: any = {
        series: DEVICE_VISITS.map((d) => d.percentage),
        options: {
            chart: { type: 'pie', height: 320, fontFamily: 'Nunito, sans-serif' },
            colors: ['#4361ee', '#00ab55', '#e2a03f'],
            labels: DEVICE_VISITS.map((d) => d.device),
            stroke: { show: true, width: 8, colors: [isDark ? '#0e1726' : '#fff'] },
            legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '13px' },
            tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val: number) => `${val}%` } },
        },
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>{t('admin_portal')}</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('store_dashboard')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl">{t('branch_performance')}</h2>
                        <select className="form-select w-auto" value={branchId ?? ''} onChange={(e) => setBranchId(Number(e.target.value))}>
                            {branches.map((b) => (
                                <option key={b.store_id} value={b.store_id}>
                                    {b.store_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <PeriodSelector value={period} onChange={setPeriod} />
                </div>

                <ul className="mb-5 flex flex-wrap border-b border-[#ebedf2] font-semibold dark:border-[#191e3a]">
                    <li className="inline-block">
                        <button
                            type="button"
                            onClick={() => setTab('performance')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tab === 'performance' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconTrendingUp className="h-5 w-5" />
                            {t('performance')}
                        </button>
                    </li>
                    <li className="inline-block">
                        <button
                            type="button"
                            onClick={() => setTab('customers')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tab === 'customers' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconUsersGroup className="h-5 w-5" />
                            {t('customers')}
                        </button>
                    </li>
                </ul>

                {!hasData || !branch ? (
                    <div className="panel flex items-center justify-center py-16 text-white-dark">{t('no_data_branch_period')}</div>
                ) : tab === 'performance' ? (
                    <>
                        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            <div className="panel bg-gradient-to-r from-cyan-500 to-cyan-400 text-white">
                                <h6 className="text-[13px] opacity-90">{t('branch_revenue')}</h6>
                                <p className="mt-2 text-2xl font-semibold">{currency(branchRevenue)}</p>
                                {revenueChangePct !== null && (
                                    <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${revenueChangePct >= 0 ? 'text-[#00ab55]' : 'text-[#e7515a]'}`}>
                                        <IconTrendingUp className={`h-3.5 w-3.5 ${revenueChangePct >= 0 ? '' : 'rotate-180'}`} />
                                        <span>
                                            {revenueChangePct >= 0 ? '+' : '-'}
                                            {Math.abs(revenueChangePct).toFixed(1)}%
                                        </span>
                                        <span className="text-white opacity-75">{t('vs_previous_period')}</span>
                                    </p>
                                )}
                            </div>
                            <div className="panel lg:col-span-2">
                                <div className="flex items-start gap-3">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                                        <IconMapPin />
                                    </div>
                                    <div>
                                        <h6 className="text-[13px] text-white-dark">{t('branch_location')}</h6>
                                        <p className="font-semibold dark:text-white-light">{branch.store_name}</p>
                                        <p className="text-sm text-white-dark">{branch.location}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('sales_analytics')}</h5>
                                {isMounted && <ReactApexChart series={revenueTrendChart.series} options={revenueTrendChart.options} type="area" height={300} />}
                            </div>
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('sales_by_category')}</h5>
                                {/* ApexCharts' radialBar center-label formatter can get stuck on a stale
                                total when the chart is updated in place -- force a remount on period/branch
                                change instead of relying on updateOptions(). */}
                                {isMounted && (
                                    <ReactApexChart key={`${branchId}-${period}`} series={categoryChart.series} options={categoryChart.options} type="radialBar" height={360} />
                                )}
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('revenue_sources')}</h5>
                                {isMounted && <ReactApexChart series={revenueSourcesChart.series} options={revenueSourcesChart.options} type="donut" height={400} />}
                            </div>
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('peak_hours')}</h5>
                                {isMounted && <ReactApexChart series={peakHoursChart.series} options={peakHoursChart.options} type="line" height={360} />}
                            </div>
                        </div>

                        <div className="panel">
                            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">
                                {t('top_staff_at')} {branch.store_name}
                            </h5>
                            {topStaff.length === 0 ? (
                                <p className="text-white-dark">{t('no_staff_assigned_branch')}</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table-hover">
                                        <thead>
                                            <tr>
                                                <th>{t('name')}</th>
                                                <th>{t('role')}</th>
                                                <th>{t('sales')}</th>
                                                <th className="!text-center">{t('profile')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topStaff.map((staff) => (
                                                <tr key={staff.staff_id}>
                                                    <td className="font-semibold">{staff.full_name}</td>
                                                    <td>{staff.role_name}</td>
                                                    <td>{currency(staff.monthly_sales)}</td>
                                                    <td className="text-center">
                                                        <Link href={`/staff/${staff.staff_id}`} className="text-primary hover:underline">
                                                            {t('view')}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('membership_tiers')}</h5>
                                {isMounted && <ReactApexChart series={membershipChart.series} options={membershipChart.options} type="donut" height={380} />}
                            </div>

                            <div className="panel xl:col-span-2">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('top_vip_customer')}</h5>
                                <div className="flex items-start gap-4">
                                    <div className="grid h-14 w-14 shrink-0 place-content-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                                        <IconStar />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xl font-semibold dark:text-white-light">{VIP_CUSTOMER.name}</p>
                                            <TierBadge tier={VIP_CUSTOMER.tier} />
                                        </div>
                                        <p className="mt-1 text-sm text-white-dark">
                                            {t('member_since')} {new Date(VIP_CUSTOMER.memberSince).toLocaleDateString()}
                                        </p>
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div className="rounded border border-[#ebedf2] p-3 dark:border-[#1b2e4b]">
                                                <h6 className="text-[13px] text-white-dark">{t('total_spent')}</h6>
                                                <p className="text-lg font-semibold text-success">{currency(VIP_CUSTOMER.totalSpent * factor)}</p>
                                            </div>
                                            <div className="rounded border border-[#ebedf2] p-3 dark:border-[#1b2e4b]">
                                                <h6 className="text-[13px] text-white-dark">{t('visits')}</h6>
                                                <p className="text-lg font-semibold dark:text-white-light">{Math.round(VIP_CUSTOMER.visits * factor)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('visits_by_device')}</h5>
                                {isMounted && <ReactApexChart series={deviceChart.series} options={deviceChart.options} type="pie" height={320} />}
                            </div>

                            <div className="panel xl:col-span-2">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('top_customers')}</h5>
                                <div className="table-responsive">
                                    <table className="table-hover">
                                        <thead>
                                            <tr>
                                                <th>{t('name')}</th>
                                                <th>{t('tier')}</th>
                                                <th>{t('total_spent')}</th>
                                                <th>{t('visits')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {TOP_CUSTOMERS.map((customer) => (
                                                <tr key={customer.id}>
                                                    <td className="font-semibold">{customer.name}</td>
                                                    <td>
                                                        <TierBadge tier={customer.tier} />
                                                    </td>
                                                    <td>{currency(customer.totalSpent * factor)}</td>
                                                    <td>{Math.round(customer.visits * factor)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ComponentsDashboardStore;
