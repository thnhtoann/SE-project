'use client';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPlus from '@/components/icon/icon-plus';
import IconStar from '@/components/icon/icon-star';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconX from '@/components/icon/icon-x';
import PeriodSelector from '@/components/dashboard/period-selector';
import TierBadge from '@/components/customers/tier-badge';
import {
    BRANCHES,
    BRANCH_SHARE,
    CHANNEL_REVENUE,
    DEVICE_VISITS,
    MEMBERSHIP_TIERS,
    PEAK_HOURS,
    PEAK_HOURS_PREVIOUS_FACTOR,
    PERIOD_MULTIPLIER,
    SALES_FUNNEL,
    TOP_CUSTOMERS,
    VIP_CUSTOMER,
} from '@/data/mock-dashboards';
import { MOCK_STAFF } from '@/data/mock-staff';
import { IRootState } from '@/store';
import { Branch, ReportPeriod } from '@/types/admin';
import { getTranslation } from '@/i18n';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import Link from 'next/link';
import { ChangeEvent, Fragment, FormEvent, useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useSelector } from 'react-redux';

const currency = (value: number) => `₫${Math.round(value).toLocaleString('en-US')}`;

type StoreTab = 'performance' | 'customers';

interface BranchFormState {
    name: string;
    address: string;
    revenue: string;
}

const emptyBranchForm: BranchFormState = { name: '', address: '', revenue: '' };

const ComponentsDashboardStore = () => {
    const { t } = getTranslation();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const [isMounted, setIsMounted] = useState(false);
    const [period, setPeriod] = useState<ReportPeriod>('month');
    const [branches, setBranches] = useState<Branch[]>(BRANCHES);
    const [branchId, setBranchId] = useState(BRANCHES[0].id);
    const [tab, setTab] = useState<StoreTab>('performance');
    const [branchModalOpen, setBranchModalOpen] = useState(false);
    const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm);
    const [branchFormError, setBranchFormError] = useState('');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const factor = PERIOD_MULTIPLIER[period];
    const branch = branches.find((b) => b.id === branchId) ?? branches[0];
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

    const openAddBranchModal = () => {
        setBranchForm(emptyBranchForm);
        setBranchFormError('');
        setBranchModalOpen(true);
    };

    const closeBranchModal = () => setBranchModalOpen(false);

    const changeBranchForm = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setBranchForm((prev) => ({ ...prev, [id]: value }));
    };

    const submitBranchForm = (e: FormEvent) => {
        e.preventDefault();
        setBranchFormError('');

        if (!branchForm.name.trim()) {
            setBranchFormError(t('error_branch_name_required'));
            return;
        }
        if (!branchForm.address.trim()) {
            setBranchFormError(t('error_address_required'));
            return;
        }

        const nextId = branches.reduce((max, b) => Math.max(max, b.id), 0) + 1;
        const revenue = Number(branchForm.revenue) || 0;
        setBranches((prev) => [...prev, { id: nextId, name: branchForm.name, address: branchForm.address, revenue }]);
        setBranchId(nextId);
        setBranchModalOpen(false);
    };

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
                                label: t('total'),
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
        series: [
            { name: t('previous_period'), data: PEAK_HOURS.map((p) => Math.round(p.visits * customerFactor * PEAK_HOURS_PREVIOUS_FACTOR)) },
            { name: t('current_period'), data: PEAK_HOURS.map((p) => Math.round(p.visits * customerFactor)) },
        ],
        options: {
            chart: { type: 'line', height: 360, fontFamily: 'Nunito, sans-serif', toolbar: { show: false } },
            stroke: { curve: 'smooth', width: [2, 3], dashArray: [5, 0] },
            colors: ['#805dca', '#4361ee'],
            markers: { size: 4, strokeWidth: 0 },
            dataLabels: { enabled: false },
            legend: { show: true, position: 'top', horizontalAlign: 'right', fontSize: '13px' },
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
                        <select className="form-select w-auto" value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                        <button type="button" className="btn btn-outline-primary gap-2" onClick={openAddBranchModal}>
                            <IconPlus className="h-4 w-4" />
                            {t('add_branch')}
                        </button>
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

                {!hasData ? (
                    <div className="panel flex items-center justify-center py-16 text-white-dark">{t('no_data_branch_period')}</div>
                ) : tab === 'performance' ? (
                    <>
                        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                            <div className="panel bg-gradient-to-r from-cyan-500 to-cyan-400 text-white">
                                <h6 className="text-[13px] opacity-90">{t('branch_revenue')}</h6>
                                <p className="mt-2 text-2xl font-semibold">{currency(branchRevenue)}</p>
                            </div>
                            <div className="panel lg:col-span-2">
                                <div className="flex items-start gap-3">
                                    <div className="grid h-11 w-11 shrink-0 place-content-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                                        <IconMapPin />
                                    </div>
                                    <div>
                                        <h6 className="text-[13px] text-white-dark">{t('branch_location')}</h6>
                                        <p className="font-semibold dark:text-white-light">{branch.name}</p>
                                        <p className="text-sm text-white-dark">{branch.address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('sales_funnel')}</h5>
                                {isMounted && <ReactApexChart series={funnelChart.series} options={funnelChart.options} type="bar" height={360} />}
                            </div>
                            <div className="panel">
                                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('revenue_sources')}</h5>
                                {isMounted && <ReactApexChart series={revenueSourcesChart.series} options={revenueSourcesChart.options} type="donut" height={400} />}
                            </div>
                        </div>

                        <div className="panel mb-5">
                            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">{t('peak_hours')}</h5>
                            {isMounted && <ReactApexChart series={peakHoursChart.series} options={peakHoursChart.options} type="line" height={360} />}
                        </div>

                        <div className="panel">
                            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">
                                {t('top_staff_at')} {branch.name}
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
                                                <tr key={staff.id}>
                                                    <td className="font-semibold">{staff.name}</td>
                                                    <td>{staff.role}</td>
                                                    <td>{currency(staff.monthlySales * factor)}</td>
                                                    <td className="text-center">
                                                        <Link href={`/staff/${staff.id}`} className="text-primary hover:underline">
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

            <Transition appear show={branchModalOpen} as={Fragment}>
                <Dialog as="div" open={branchModalOpen} onClose={closeBranchModal}>
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </TransitionChild>
                    <div className="fixed inset-0 z-[999] overflow-y-auto">
                        <div className="flex min-h-screen items-start justify-center px-4 py-8">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel as="div" className="panel my-8 w-full max-w-lg overflow-hidden rounded-lg border-0 p-0 text-black dark:text-white-dark">
                                    <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                        <div className="text-lg font-bold">{t('add_branch')}</div>
                                        <button type="button" className="text-white-dark hover:text-dark" onClick={closeBranchModal}>
                                            <IconX />
                                        </button>
                                    </div>

                                    <form onSubmit={submitBranchForm} className="p-5">
                                        {branchFormError && <div className="mb-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{branchFormError}</div>}

                                        <div className="mb-4">
                                            <label htmlFor="name">{t('branch_name')}</label>
                                            <input
                                                id="name"
                                                type="text"
                                                placeholder={t('enter_branch_name')}
                                                className="form-input"
                                                value={branchForm.name}
                                                onChange={changeBranchForm}
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="address">{t('address')}</label>
                                            <textarea
                                                id="address"
                                                rows={2}
                                                placeholder={t('enter_address')}
                                                className="form-textarea resize-none"
                                                value={branchForm.address}
                                                onChange={changeBranchForm}
                                            ></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="revenue">{t('revenue')}</label>
                                            <input
                                                id="revenue"
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                className="form-input"
                                                value={branchForm.revenue}
                                                onChange={changeBranchForm}
                                            />
                                        </div>

                                        <div className="flex items-center justify-end gap-4">
                                            <button type="button" className="btn btn-outline-danger" onClick={closeBranchModal}>
                                                {t('cancel')}
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                {t('add_branch')}
                                            </button>
                                        </div>
                                    </form>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default ComponentsDashboardStore;
