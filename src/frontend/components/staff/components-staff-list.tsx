'use client';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconHome from '@/components/icon/icon-home';
import IconMail from '@/components/icon/icon-mail';
import IconPhone from '@/components/icon/icon-phone';
import IconSearch from '@/components/icon/icon-search';
import IconStar from '@/components/icon/icon-star';
import IconUserPlus from '@/components/icon/icon-user-plus';
import IconUsers from '@/components/icon/icon-users';
import { MOCK_STAFF } from '@/data/mock-staff';
import { StaffPerformanceStatus } from '@/types/admin';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const performanceBadgeClass: Record<StaffPerformanceStatus, string> = {
    Excellent: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Good: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    'Needs Improvement': 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
};

const currency = (value: number) => (value > 0 ? `₫${value.toLocaleString('en-US')}` : '—');

const ComponentsStaffList = () => {
    const [search, setSearch] = useState('');
    const [filteredStaff, setFilteredStaff] = useState(MOCK_STAFF);

    useEffect(() => {
        setFilteredStaff(
            MOCK_STAFF.filter((staff) => staff.name.toLowerCase().includes(search.toLowerCase()) || staff.branch.toLowerCase().includes(search.toLowerCase())),
        );
    }, [search]);

    const totalStaff = MOCK_STAFF.length;
    const branchCount = new Set(MOCK_STAFF.map((s) => s.branch)).size;
    const avgMonthlySales = Math.round(MOCK_STAFF.reduce((sum, s) => sum + s.monthlySales, 0) / totalStaff);
    const excellentCount = MOCK_STAFF.filter((s) => s.performanceStatus === 'Excellent').length;

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>Admin Portal</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Staff</span>
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
                                <h6 className="text-[13px] text-white-dark">Total Staff</h6>
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
                                <h6 className="text-[13px] text-white-dark">Branches Covered</h6>
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
                                <h6 className="text-[13px] text-white-dark">Avg. Monthly Sales</h6>
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
                                <h6 className="text-[13px] text-white-dark">Excellent Performers</h6>
                                <p className="text-base font-semibold text-[#515365] dark:text-white-light">{excellentCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl">Staff List</h2>
                    <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                        <Link href="/staff/add" className="btn btn-primary">
                            <IconUserPlus className="ltr:mr-2 rtl:ml-2" />
                            Add Staff
                        </Link>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name or branch"
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

                {filteredStaff.length === 0 ? (
                    <div className="panel mt-5 flex items-center justify-center py-16 text-white-dark">No staff match your search.</div>
                ) : (
                    <div className="mt-5 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {filteredStaff.map((staff) => (
                            <Link
                                href={`/staff/${staff.id}`}
                                className="relative block overflow-hidden rounded-md bg-white text-center shadow transition hover:shadow-lg dark:bg-[#1c232f]"
                                key={staff.id}
                            >
                                <div className="rounded-t-md bg-white/40 bg-[url('/assets/images/notification-bg.png')] bg-cover bg-center p-6 pb-0">
                                    <img className="mx-auto h-20 w-20 rounded-full object-cover" src={`/assets/images/${staff.photo}`} alt={staff.name} />
                                </div>
                                <div className="relative -mt-6 px-6 pb-6">
                                    <div className="rounded-md bg-white px-2 py-4 shadow-md dark:bg-gray-900">
                                        <div className="text-lg font-semibold">{staff.name}</div>
                                        <div className="text-white-dark">{staff.role}</div>
                                        <span className={`badge mt-2 inline-block ${performanceBadgeClass[staff.performanceStatus]}`}>{staff.performanceStatus}</span>
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex-auto">
                                                <div className="text-info">{currency(staff.monthlySales)}</div>
                                                <div className="text-xs">Monthly Sales</div>
                                            </div>
                                            <div className="flex-auto">
                                                <div className="text-info">{staff.branch}</div>
                                                <div className="text-xs">Branch</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 gap-2 ltr:text-left rtl:text-right">
                                        <div className="flex items-center gap-2 text-white-dark">
                                            <IconMail className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{staff.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-white-dark">
                                            <IconPhone className="h-4 w-4 shrink-0" />
                                            <span dir="ltr">{staff.phone}</span>
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
