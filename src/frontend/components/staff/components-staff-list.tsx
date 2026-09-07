'use client';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconHome from '@/components/icon/icon-home';
import IconMail from '@/components/icon/icon-mail';
import IconPhone from '@/components/icon/icon-phone';
import IconSearch from '@/components/icon/icon-search';
import IconStar from '@/components/icon/icon-star';
import IconUserPlus from '@/components/icon/icon-user-plus';
import IconUsers from '@/components/icon/icon-users';
import { ApiError } from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { StaffPerformanceStatus, StaffRecord, StoreRecord } from '@/types/admin';
import { getTranslation } from '@/i18n';
import { IRootState } from '@/store';
import Link from 'next/link';
import { useState } from 'react';
import { useSelector } from 'react-redux';

const performanceBadgeClass: Record<StaffPerformanceStatus, string> = {
    Excellent: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Good: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    'Needs Improvement': 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
};

const performanceKey: Record<StaffPerformanceStatus, string> = {
    Excellent: 'performance_excellent',
    Good: 'performance_good',
    'Needs Improvement': 'performance_needs_improvement',
};

const currency = (value: number) => (value > 0 ? `₫${value.toLocaleString('en-US')}` : '—');

const ComponentsStaffList = () => {
    const { t } = getTranslation();
    const role = useSelector((state: IRootState) => state.session.role);
    const isChainManager = role === 'Chain Manager' || role === 'Admin';

    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [search, setSearch] = useState('');

    // Store Manager is locked server-side to their own store no matter what's
    // requested here; ?store= only ever does something for a Chain Manager/Admin
    // using the store picker below.
    const staffPath = isChainManager && selectedStoreId ? `/staff/?store=${selectedStoreId}` : '/staff/';
    const { data: staff, error: staffError, isLoading: loading } = useApi<StaffRecord[]>(staffPath);
    const { data: stores } = useApi<StoreRecord[]>(isChainManager ? '/stores/' : null);

    const loadError = staffError ? (staffError instanceof ApiError ? String((staffError.body as { detail?: string })?.detail ?? staffError.message) : t('error_loading_staff')) : '';

    const staffList = staff ?? [];
    const storeList = stores ?? [];

    const filteredStaff = staffList.filter(
        (s) => s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.store_name ?? '').toLowerCase().includes(search.toLowerCase()),
    );

    const totalStaff = staffList.length;
    const branchCount = new Set(staffList.map((s) => s.store_name).filter(Boolean)).size;
    const avgMonthlySales = totalStaff > 0 ? Math.round(staffList.reduce((sum, s) => sum + s.monthly_sales, 0) / totalStaff) : 0;
    const excellentCount = staffList.filter((s) => s.performance_status === 'Excellent').length;

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>{t('admin_portal')}</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('staff')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-primary-light">
                                <IconUsers />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('total_staff')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{totalStaff}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-secondary-light text-secondary dark:bg-secondary dark:text-secondary-light">
                                <IconHome />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('branches_covered')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{branchCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-info-light text-info dark:bg-info dark:text-info-light">
                                <IconDollarSignCircle />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('avg_monthly_sales')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{currency(avgMonthlySales)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded border border-[#ebedf2] dark:border-0 dark:bg-[#1b2e4b]">
                        <div className="flex items-center justify-between p-4 py-2">
                            <div className="grid h-9 w-9 place-content-center rounded-md bg-success-light text-success dark:bg-success dark:text-success-light">
                                <IconStar />
                            </div>
                            <div className="flex-auto ltr:ml-4 rtl:mr-4">
                                <h6 className="text-[13px] text-white-dark">{t('excellent_performers')}</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{excellentCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl">{t('staff_list')}</h2>
                    <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                        <Link href="/staff/add" className="btn btn-primary">
                            <IconUserPlus className="ltr:mr-2 rtl:ml-2" />
                            {t('add_staff')}
                        </Link>
                        {isChainManager && (
                            <select className="form-select w-auto" value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
                                <option value="">{t('all_stores')}</option>
                                {storeList.map((s) => (
                                    <option key={s.store_id} value={s.store_id}>
                                        {s.store_name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('search_staff_placeholder')}
                                className="peer form-input py-2 ltr:pr-11 rtl:pl-11"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="absolute top-1/2 -translate-y-1/2 peer-focus:text-primary ltr:right-[11px] rtl:left-[11px]">
                                <IconSearch className="mx-auto" />
                            </span>
                        </div>
                    </div>
                </div>

                {loadError && <div className="mt-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{loadError}</div>}

                {loading ? (
                    <div className="panel mt-5 flex items-center justify-center py-16 text-white-dark">{t('loading')}</div>
                ) : filteredStaff.length === 0 ? (
                    <div className="panel mt-5 flex items-center justify-center py-16 text-white-dark">{t('no_staff_found')}</div>
                ) : (
                    <div className="mt-5 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {filteredStaff.map((s) => (
                            <Link
                                href={`/staff/${s.staff_id}`}
                                className="relative block overflow-hidden rounded-md bg-white text-center shadow transition hover:shadow-lg dark:bg-[#1c232f]"
                                key={s.staff_id}
                            >
                                <div className="rounded-t-md bg-white/40 bg-[url('/assets/images/notification-bg.png')] bg-cover bg-center p-6 pb-0">
                                    <img className="mx-auto h-20 w-20 rounded-full object-cover" src="/assets/images/user-profile.jpeg" alt={s.full_name} />
                                </div>
                                <div className="relative -mt-6 px-6 pb-6">
                                    <div className="rounded-md bg-white px-2 py-4 shadow-md dark:bg-gray-900">
                                        <div className="text-lg font-semibold">{s.full_name}</div>
                                        <div className="text-white-dark">{s.role_name}</div>
                                        <span className={`badge mt-2 inline-block ${performanceBadgeClass[s.performance_status]}`}>{t(performanceKey[s.performance_status])}</span>
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex-auto">
                                                <div className="text-info">{currency(s.monthly_sales)}</div>
                                                <div className="text-xs">{t('monthly_sales')}</div>
                                            </div>
                                            <div className="flex-auto">
                                                <div className="text-info">{s.store_name ?? '—'}</div>
                                                <div className="text-xs">{t('branch')}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 gap-2 ltr:text-left rtl:text-right">
                                        <div className="flex items-center gap-2 text-white-dark">
                                            <IconMail className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{s.email ?? '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-white-dark">
                                            <IconPhone className="h-4 w-4 shrink-0" />
                                            <span dir="ltr">{s.phone ?? '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComponentsStaffList;
