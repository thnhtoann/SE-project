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
import { apiFetch, ApiError } from '@/lib/api-client';
import { currency } from '@/lib/currency';
import { AdvisorAnalyzeResponse, PeakHoursResponse, ReportPeriod, RevenueByChannelResponse, RevenueTrendResponse, SalesByCategoryResponse, StaffRecord, StoreRecord } from '@/types/admin';
import { getTranslation } from '@/i18n';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactApexChart from 'react-apexcharts';
import { useSelector } from 'react-redux';
import { ThinkingOrb } from 'thinking-orbs';
import { BorderBeam } from 'border-beam';
import { Liquid } from 'liquid-gooey';

type StoreTab = 'performance' | 'customers';

const ADVISOR_ORB_SIZE = 64;
const ADVISOR_EDGE_MARGIN = 16;

// Never leave the widget floating mid-screen -- snap x to whichever
// vertical screen edge is nearer, keeping y wherever it was dropped.
const snapToNearestEdge = (x: number, y: number) => {
    const nearLeft = x + ADVISOR_ORB_SIZE / 2 < window.innerWidth / 2;
    return {
        x: nearLeft ? ADVISOR_EDGE_MARGIN : window.innerWidth - ADVISOR_ORB_SIZE - ADVISOR_EDGE_MARGIN,
        y: Math.min(Math.max(y, ADVISOR_EDGE_MARGIN), window.innerHeight - ADVISOR_ORB_SIZE - ADVISOR_EDGE_MARGIN),
    };
};

// Transitions.dev "Streaming text" (https://transitions.dev/transitions/streaming-text/)
// -- reveals `text` one word at a time via the .t-stream-w/.is-in CSS pair
// (styles/tailwind.css), timed to --stream-gap so it reads like the AI
// advisor is composing the recommendation live.
const StreamingText = ({ text }: { text: string }) => {
    const words = useMemo(() => text.split(' '), [text]);
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        setVisibleCount(0);
        const timers = words.map((_, i) => window.setTimeout(() => setVisibleCount((v) => Math.max(v, i + 1)), i * 60));
        return () => timers.forEach((id) => window.clearTimeout(id));
    }, [words]);

    return (
        <>
            {words.map((word, i) => (
                <span key={i} className={`t-stream-w ${i < visibleCount ? 'is-in' : ''}`}>
                    {word}{' '}
                </span>
            ))}
        </>
    );
};

const ComponentsDashboardStore = () => {
    const { t } = getTranslation();
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const sessionStoreId = useSelector((state: IRootState) => state.session.storeId);
    const [isMounted, setIsMounted] = useState(false);
    const [period, setPeriod] = useState<ReportPeriod>('month');
    const [branchId, setBranchId] = useState<number | null>(null);
    const [tab, setTab] = useState<StoreTab>('performance');
    const [advisorLoading, setAdvisorLoading] = useState(false);
    const [advisorResult, setAdvisorResult] = useState<AdvisorAnalyzeResponse | null>(null);
    const [advisorError, setAdvisorError] = useState('');
    // Popup open/close is independent of whether a result exists -- toggling
    // the orb only re-fetches when the cached result no longer matches the
    // current branch+period (see toggleAdvisor below).
    const [advisorOpen, setAdvisorOpen] = useState(false);
    const [advisorResultKey, setAdvisorResultKey] = useState<string | null>(null);
    const advisorWidgetRef = useRef<HTMLDivElement>(null);

    // Floating widget position (viewport pixels, top-left of the orb).
    // Defaults near the top-right corner once mounted; a prior drag is
    // remembered per-browser via localStorage.
    const [advisorPos, setAdvisorPos] = useState({ x: 24, y: 96 });
    const advisorDragRef = useRef<{ startX: number; startY: number; posX: number; posY: number; moved: boolean } | null>(null);

    useEffect(() => {
        setIsMounted(true);
        try {
            const saved = window.localStorage.getItem('advisor_widget_pos');
            const parsed = saved ? JSON.parse(saved) : { x: window.innerWidth, y: 96 };
            setAdvisorPos(snapToNearestEdge(parsed.x, parsed.y));
        } catch {
            setAdvisorPos(snapToNearestEdge(window.innerWidth, 96));
        }
    }, []);

    // Closing on outside click / Escape is a bonus on top of clicking the
    // orb again (which always toggles, see toggleAdvisor) -- unlike
    // dropdown-menu-morph, the trigger stays clickable while open.
    useEffect(() => {
        if (!advisorOpen) return;
        const onDown = (e: MouseEvent) => {
            if (advisorWidgetRef.current && !advisorWidgetRef.current.contains(e.target as Node)) setAdvisorOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAdvisorOpen(false);
        };
        document.addEventListener('click', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('click', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [advisorOpen]);

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
    const branchExpense = (trend?.points ?? []).reduce((sum, p) => sum + Number(p.expense_total), 0);
    const branchProfit = branchRevenue - branchExpense;
    const previousBranchRevenue = Number(trend?.previous_total ?? 0);
    const previousBranchExpense = Number(trend?.previous_expense_total ?? 0);
    const previousBranchProfit = previousBranchRevenue - previousBranchExpense;
    // No comparison shown when the prior period had zero (or negative) profit -- a
    // percentage against a non-positive base is undefined/misleading, not "infinite growth".
    const revenueChangePct = previousBranchProfit > 0 ? ((branchProfit - previousBranchProfit) / previousBranchProfit) * 100 : null;

    const advisorKey = branchId !== null ? `${branchId}-${period}` : null;

    const runAdvisor = async () => {
        if (advisorLoading || !branchId) return;
        const key = advisorKey;
        setAdvisorLoading(true);
        setAdvisorError('');
        try {
            const result = await apiFetch<AdvisorAnalyzeResponse>('/advisor/analyze/', {
                method: 'POST',
                body: { period, store: branchId },
            });
            setAdvisorResult(result);
            setAdvisorResultKey(key);
        } catch (err) {
            setAdvisorResult(null);
            setAdvisorError(err instanceof ApiError ? ((err.body as { detail?: string } | null)?.detail ?? err.message) : t('error_advisor_failed'));
            setAdvisorResultKey(key);
        } finally {
            setAdvisorLoading(false);
        }
    };

    // Toggling the orb only re-fetches when the popup is closed AND the cached
    // result (if any) is for a different branch/period than the one currently
    // selected -- reopening after just closing, or re-clicking without
    // changing the branch/period selector, reuses the cached result instead
    // of calling /advisor/analyze/ again.
    const toggleAdvisor = () => {
        if (advisorOpen) {
            setAdvisorOpen(false);
            return;
        }
        setAdvisorOpen(true);
        if (advisorLoading) return;
        if (advisorResultKey === advisorKey && (advisorResult || advisorError)) return;
        runAdvisor();
    };

    // Drag the floating orb anywhere on screen; a plain click (no meaningful
    // pointer movement) opens/closes the popup via toggleAdvisor instead.
    const onOrbPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        advisorDragRef.current = { startX: e.clientX, startY: e.clientY, posX: advisorPos.x, posY: advisorPos.y, moved: false };
    };
    const onOrbPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const drag = advisorDragRef.current;
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
        if (!drag.moved) return;
        setAdvisorPos({
            x: Math.min(Math.max(drag.posX + dx, 8), window.innerWidth - 72),
            y: Math.min(Math.max(drag.posY + dy, 8), window.innerHeight - 72),
        });
    };
    const onOrbPointerUp = () => {
        const drag = advisorDragRef.current;
        advisorDragRef.current = null;
        if (!drag) return;
        if (!drag.moved) {
            toggleAdvisor();
        } else {
            // Never leave it floating mid-screen -- snap to the nearer edge on
            // release. The liquid-gooey Move effect trails this jump with its
            // own spring, so the snap itself reads as a liquid settle, not a pop.
            const snapped = snapToNearestEdge(advisorPos.x, advisorPos.y);
            setAdvisorPos(snapped);
            try {
                window.localStorage.setItem('advisor_widget_pos', JSON.stringify(snapped));
            } catch {
                /* private browsing or storage disabled -- position just won't persist */
            }
        }
    };

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

    // Popup opens toward whichever side of the orb still has room, instead of
    // always dropping down-left -- relevant now that the orb can sit anywhere
    // (snapped to the left or right edge, any height) rather than one fixed spot.
    const advisorPopupOpensUp = isMounted && advisorPos.y > window.innerHeight / 2;
    const advisorPopupOpensRight = isMounted && advisorPos.x < window.innerWidth / 2;

    return (
        <>
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
                                <BorderBeam size="md" colorVariant="ocean">
                                    <div className="panel relative bg-neutral-800 text-white">
                                        <h6 className="text-[13px] opacity-90">{t('branch_profit')}</h6>
                                        <p className="mt-2 text-2xl font-semibold">{currency(branchProfit)}</p>
                                        <p className="mt-1 text-xs opacity-75">
                                            {currency(branchRevenue)} {t('revenue')} − {currency(branchExpense)} {t('expenses')}
                                        </p>
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
                                </BorderBeam>
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
                                    {isMounted && <ReactApexChart key={`${branchId}-${period}`} series={categoryChart.series} options={categoryChart.options} type="radialBar" height={360} />}
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
            {isMounted &&
                createPortal(
                    <Liquid fill="#181818" blur={6} contrast={18} shadow="0 8px 24px rgba(0,0,0,.35)" className="pointer-events-none fixed inset-0 z-[60]">
                        <Liquid.Item effect="move" move={{ springiness: 0.5, trail: 0.6 }}>
                            <div ref={advisorWidgetRef} className="pointer-events-auto absolute w-max" style={{ transform: `translate(${advisorPos.x}px, ${advisorPos.y}px)` }}>
                                <button
                                    type="button"
                                    onPointerDown={onOrbPointerDown}
                                    onPointerMove={onOrbPointerMove}
                                    onPointerUp={onOrbPointerUp}
                                    disabled={advisorLoading}
                                    title={t('run_ai_advisor')}
                                    aria-expanded={advisorOpen}
                                    aria-label={t('run_ai_advisor')}
                                    className="touch-none cursor-grab rounded-full shadow-xl transition-transform hover:scale-110 active:cursor-grabbing disabled:cursor-wait"
                                >
                                    <ThinkingOrb state="composing" size={64} speed={advisorLoading ? 1.25 : 0.25} />
                                </button>
                                {advisorLoading && !advisorResult && !advisorError && (
                                    <p className="mt-2 w-16 animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-white/30 via-white to-white/30 bg-clip-text text-center text-xs font-semibold text-transparent">
                                        {t('thinking_ellipsis')}
                                    </p>
                                )}
                                <div
                                    className={`t-panel-slide absolute max-h-[min(480px,70vh)] w-[min(380px,calc(100vw-32px))] overflow-y-auto rounded-2xl bg-neutral-900 p-4 text-sm text-white shadow-2xl ${
                                        advisorPopupOpensUp ? 'bottom-full mb-3' : 'top-full mt-3'
                                    } ${advisorPopupOpensRight ? 'left-0' : 'right-0'}`}
                                    data-open={advisorOpen ? 'true' : 'false'}
                                >
                                    {advisorError && <div className="rounded border border-danger bg-danger-light px-3 py-2 text-xs text-danger">{advisorError}</div>}
                                    {advisorResult && (
                                        <div className="space-y-3">
                                            {!advisorResult.recommendations_verified && <p className="text-xs text-warning">{t('ai_advisor_unverified_notice')}</p>}
                                            {advisorResult.anomalies.length > 0 && (
                                                <div className="space-y-2">
                                                    {advisorResult.anomalies.map((a, i) => (
                                                        <div key={i} className={`rounded px-3 py-2 text-xs ${a.severity === 'high' ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'}`}>
                                                            {a.detail}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {advisorResult.recommendations.length === 0 ? (
                                                <p className="text-xs text-white/60">{t('ai_advisor_no_recommendations')}</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {advisorResult.recommendations.map((r, i) => (
                                                        <div key={i} className="rounded-md border border-white/10 p-3">
                                                            <div className="mb-1 flex items-center gap-2">
                                                                <span
                                                                    className={`badge ${
                                                                        r.priority === 'high'
                                                                            ? 'bg-danger-light text-danger dark:bg-danger dark:text-danger-light'
                                                                            : r.priority === 'medium'
                                                                              ? 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light'
                                                                              : 'bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light'
                                                                    }`}
                                                                >
                                                                    {r.priority}
                                                                </span>
                                                                <h6 className="text-xs font-semibold">{r.title}</h6>
                                                            </div>
                                                            <p className="text-xs text-white/70">
                                                                <StreamingText text={r.reasoning} />
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Liquid.Item>
                    </Liquid>,
                    document.body,
                )}
        </>
    );
};

export default ComponentsDashboardStore;
