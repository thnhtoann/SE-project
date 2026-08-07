'use client';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconStar from '@/components/icon/icon-star';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import PeriodSelector from '@/components/dashboard/period-selector';
import TierBadge from '@/components/customers/tier-badge';
import {
    BRANCHES,
    BRANCH_SHARE,
    CHANNEL_REVENUE,
    DEVICE_VISITS,
    MEMBERSHIP_TIERS,
    PEAK_HOURS,
    PERIOD_MULTIPLIER,
    SALES_FUNNEL,
    TOP_CUSTOMERS,
    VIP_CUSTOMER,
} from '@/data/mock-dashboards';
import { MOCK_STAFF } from '@/data/mock-staff';
import { IRootState } from '@/store';
import { ReportPeriod } from '@/types/admin';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useSelector } from 'react-redux';

const currency = (value: number) => `₫${Math.round(value).toLocaleString('en-US')}`;

type StoreTab = 'performance' | 'customers';

const ComponentsDashboardStore = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [isMounted, setIsMounted] = useState(false);
    const [period, setPeriod] = useState<ReportPeriod>('month');
    const [branchId, setBranchId] = useState(BRANCHES[0].id);
    const [tab, setTab] = useState<StoreTab>('performance');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const factor = PERIOD_MULTIPLIER[period];
    const branch = BRANCHES.find((b) => b.id === branchId) ?? BRANCHES[0];
    const share = BRANCH_SHARE[branch.id] ?? 1;
    // Customer figures are seeded chain-wide, so scale them by both axes to keep
    // every panel on this page reflecting the same branch + period selection.
    const customerFactor = factor * share;
    const branchRevenue = branch.revenue * factor;

    const topStaff = [...MOCK_STAFF]
        .filter((s) => s.branch === branch.name)
        .sort((a, b) => b.monthlySales - a.monthlySales)
        .slice(0, 5);

    const branchMembers = MEMBERSHIP_TIERS.map((t) => Math.round(t.count * share));

    const hasData = branchRevenue > 0;

    const revenueSourcesChart: any = {
        series: CHANNEL_REVENUE.map((c) => Math.round((c.amount * factor * share) / 1_000_000)),
        options: {
            chart: { type: 'donut', height: 400, fontFamily: 'Nunito, sans-serif' },
            dataLabels: { enabled: false },
            stroke: { show: true, width: 12, colors: [isDark ? '#0e1726' : '#fff'] },
            colors: ['#4361ee', '#805dca', '#00ab55', '#e2a03f', '#e7515a', '#2196f3', '#00c1d4'],
            labels: CHANNEL_REVENUE.map((c) => c.channel),
            legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '13px', height: 70, offsetY: 10 },
            tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val: number) => `₫${val}M` } },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            name: { fontSize: '20px', offsetY: -10 },
                            value: { fontSize: '20px', color: isDark ? '#bfc9d4' : undefined, offsetY: 12, formatter: (val: any) => `₫${val}M` },
                            total: {
                                show: true,
                                label: 'Total',
                                color: '#888ea8',
                                fontSize: '20px',
                                formatter: (w: any) => `₫${w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)}M`,
                            },
                        },
                    },
                },
            },
        },
    };

    const peakHoursChart: any = {
        series: [{ name: 'Visits', data: PEAK_HOURS.map((p) => Math.round(p.visits * customerFactor)) }],
        options: {
            chart: { type: 'bar', height: 360, fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
            colors: ['#4361ee'],
            dataLabels: { enabled: false },
            xaxis: { categories: PEAK_HOURS.map((p) => p.hour) },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed' },
            tooltip: { theme: isDark ? 'dark' : 'light' },
        },
    };

    const funnelChart: any = {
        series: [{ name: 'Customers', data: SALES_FUNNEL.map((s) => Math.round(s.value * factor * share)) }],
        options: {
            chart: { type: 'bar', height: 360, fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true, barHeight: '60%' } },
            colors: ['#4361ee', '#805dca', '#00ab55', '#e2a03f'],
            dataLabels: { enabled: true, formatter: (val: number) => val.toLocaleString('en-US') },
            legend: { show: false },
            xaxis: { categories: SALES_FUNNEL.map((s) => s.label) },
            grid: { borderColor: isDark ? '#191e3a' : '#e0e6ed' },
            tooltip: { theme: isDark ? 'dark' : 'light' },
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
                                label: 'Members',
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
                    <span>Admin Portal</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Store Dashboard</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl">Branch Performance</h2>
                        <select className="form-select w-auto" value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
                            {BRANCHES.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
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
                            Performance
                        </button>
                    </li>
                    <li className="inline-block">
                        <button
                            type="button"
                            onClick={() => setTab('customers')}
                            className={`flex gap-2 border-b border-transparent p-4 hover:border-primary hover:text-primary ${tab === 'customers' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconUsersGroup className="h-5 w-5" />
                            Customers
                        </button>
                    </li>
                </ul>

                {!hasData ? (
                    <div className="panel flex items-center justify-center py-16 text-white-dark">No data for the selected branch and period.</div>
                ) : tab === 'performance' ? (
                    <>
                        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            <div className="panel bg-gradient-to-r from-cyan-500 to-cyan-400 text-white">
                                <h6 className="text-[13px] opacity-90">Branch Revenue</h6>
                                <p className="mt-2 text-2xl font-semibold">{currency(branchRevenue)}</p>
                            </div>
                            <div className="panel lg:col-span-2">
                                <div className="flex items-start gap-3">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                                        <IconMapPin />
                                    </div>
                                    <div>
                                        <h6 className="text-[13px] text-white-dark">Branch Location</h6>
                                        <p className="font-semibold dark:text-white-light">{branch.name}</p>
                                        <p className="text-sm text-white-dark">{branch.address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Sales Funnel</h5>
                                {isMounted && <ReactApexChart series={funnelChart.series} options={funnelChart.options} type="bar" height={360} />}
                            </div>
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Revenue Sources</h5>
                                {isMounted && <ReactApexChart series={revenueSourcesChart.series} options={revenueSourcesChart.options} type="donut" height={400} />}
                            </div>
                        </div>

                        <div className="panel mb-5">
                            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Peak Hours</h5>
                            {isMounted && <ReactApexChart series={peakHoursChart.series} options={peakHoursChart.options} type="bar" height={360} />}
                        </div>

                        <div className="panel">
                            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Top Staff at {branch.name}</h5>
                            {topStaff.length === 0 ? (
                                <p className="text-white-dark">No staff assigned to this branch yet.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table-hover">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Role</th>
                                                <th>Sales</th>
                                                <th className="!text-center">Profile</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topStaff.map((staff) => (
                                                <tr key={staff.id}>
                                                    <td className="font-semibold">{staff.name}</td>
                                                    <td>{staff.role}</td>
                                                    <td>{currency(staff.monthlySales * factor)}</td>
                                                    <td className="text-center">
                                                        <Link href={`/staff/${staff.id}`} className="text-primary hover:underline">
                                                            View
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
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Membership Tiers</h5>
                                {isMounted && <ReactApexChart series={membershipChart.series} options={membershipChart.options} type="donut" height={380} />}
                            </div>

                            <div className="panel xl:col-span-2">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Top VIP Customer</h5>
                                <div className="flex items-start gap-4">
                                    <div className="grid h-14 w-14 shrink-0 place-content-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                                        <IconStar />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xl font-semibold dark:text-white-light">{VIP_CUSTOMER.name}</p>
                                            <TierBadge tier={VIP_CUSTOMER.tier} />
                                        </div>
                                        <p className="mt-1 text-sm text-white-dark">Member since {new Date(VIP_CUSTOMER.memberSince).toLocaleDateString()}</p>
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div className="rounded border border-[#ebedf2] p-3 dark:border-[#1b2e4b]">
                                                <h6 className="text-[13px] text-white-dark">Total Spent</h6>
                                                <p className="text-lg font-semibold text-success">{currency(VIP_CUSTOMER.totalSpent * factor)}</p>
                                            </div>
                                            <div className="rounded border border-[#ebedf2] p-3 dark:border-[#1b2e4b]">
                                                <h6 className="text-[13px] text-white-dark">Visits</h6>
                                                <p className="text-lg font-semibold dark:text-white-light">{Math.round(VIP_CUSTOMER.visits * factor)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Visits by Device</h5>
                                {isMounted && <ReactApexChart series={deviceChart.series} options={deviceChart.options} type="pie" height={320} />}
                            </div>

                            <div className="panel xl:col-span-2">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Top Customers</h5>
                                <div className="table-responsive">
                                    <table className="table-hover">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Tier</th>
                                                <th>Total Spent</th>
                                                <th>Visits</th>
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
