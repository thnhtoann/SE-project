'use client';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar } from '@/store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '@/store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMinus from '@/components/icon/icon-minus';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconClipboardText from '@/components/icon/icon-clipboard-text';
import IconBox from '@/components/icon/icon-box';
import IconCashBanknotes from '@/components/icon/icon-cash-banknotes';
import IconArchive from '@/components/icon/icon-archive';
import IconShoppingBag from '@/components/icon/icon-shopping-bag';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconMenuCharts from '@/components/icon/menu/icon-menu-charts';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconSettings from '@/components/icon/icon-settings';
import { usePathname } from 'next/navigation';
import { getTranslation } from '@/i18n';

const Sidebar = () => {
    const dispatch = useDispatch();
    const { t } = getTranslation();
    const pathname = usePathname();
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const role = useSelector((state: IRootState) => state.session.role);
    const isCashier = role === 'Cashier';
    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        setActiveRoute();
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [pathname]);

    const setActiveRoute = () => {
        let allLinks = document.querySelectorAll('.sidebar ul a.active');
        for (let i = 0; i < allLinks.length; i++) {
            const element = allLinks[i];
            element?.classList.remove('active');
        }
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        selector?.classList.add('active');
    };

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="flex h-full flex-col bg-white dark:bg-black">
                    <div className="flex items-center justify-between px-2 py-3">
                        <Link href="/" className="main-logo flex shrink-0 items-center">
                            <img className="h-12 w-auto dark:invert" src="/assets/images/logo.svg" alt="Mart+" />
                            <span className="align-middle text-2xl font-semibold ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light lg:inline">Mart+</span>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="relative flex-1">
                        <ul className="relative space-y-0.5 p-4 py-0 font-semibold">
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>{t('pos')}</span>
                            </h2>

                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item">
                                        <Link href="/pos" className="group">
                                            <div className="flex items-center">
                                                <IconShoppingCart fill className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('sales_cart')}</span>
                                            </div>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link href="/pos/orders" className="group">
                                            <div className="flex items-center">
                                                <IconClipboardText fill className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('order_lookup')}</span>
                                            </div>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link href="/pos/inventory" className="group">
                                            <div className="flex items-center">
                                                <IconBox fill className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('inventory_lookup')}</span>
                                            </div>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link href="/pos/shift" className="group">
                                            <div className="flex items-center">
                                                <IconCashBanknotes fill className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('shift_and_reports')}</span>
                                            </div>
                                        </Link>
                                    </li>
                                </ul>
                            </li>

                            {!isCashier && (
                                <>
                                    <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                        <IconMinus className="hidden h-5 w-4 flex-none" />
                                        <span>{t('admin_portal')}</span>
                                    </h2>

                                    <li className="nav-item">
                                        <ul>
                                            <li className="menu nav-item">
                                                <button
                                                    type="button"
                                                    className={`${currentMenu === 'admin-dashboards' ? 'active' : ''} nav-link group w-full`}
                                                    onClick={() => toggleMenu('admin-dashboards')}
                                                >
                                                    <div className="flex items-center">
                                                        <IconMenuCharts className="shrink-0 group-hover:!text-primary" />
                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('admin_dashboards')}</span>
                                                    </div>

                                                    <div className={currentMenu !== 'admin-dashboards' ? '-rotate-90 rtl:rotate-90' : ''}>
                                                        <IconCaretDown />
                                                    </div>
                                                </button>

                                                <AnimateHeight duration={300} height={currentMenu === 'admin-dashboards' ? 'auto' : 0}>
                                                    <ul className="sub-menu text-gray-500">
                                                        <li>
                                                            <Link href="/dashboards/analytics">{t('analytics')}</Link>
                                                        </li>
                                                        <li>
                                                            <Link href="/dashboards/store">{t('store')}</Link>
                                                        </li>
                                                    </ul>
                                                </AnimateHeight>
                                            </li>
                                            <li className="nav-item">
                                                <Link href="/staff" className="group">
                                                    <div className="flex items-center">
                                                        <IconMenuUsers className="shrink-0 group-hover:!text-primary" />
                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('staff')}</span>
                                                    </div>
                                                </Link>
                                            </li>
                                            <li className="menu nav-item">
                                                <button type="button" className={`${currentMenu === 'inventory' ? 'active' : ''} nav-link group w-full`} onClick={() => toggleMenu('inventory')}>
                                                    <div className="flex items-center">
                                                        <IconArchive fill className="shrink-0 group-hover:!text-primary" />
                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('inventory')}</span>
                                                    </div>

                                                    <div className={currentMenu !== 'inventory' ? '-rotate-90 rtl:rotate-90' : ''}>
                                                        <IconCaretDown />
                                                    </div>
                                                </button>

                                                <AnimateHeight duration={300} height={currentMenu === 'inventory' ? 'auto' : 0}>
                                                    <ul className="sub-menu text-gray-500">
                                                        <li>
                                                            <Link href="/inventory">{t('product_list')}</Link>
                                                        </li>
                                                        <li>
                                                            <Link href="/inventory/order-supply">{t('order_supply')}</Link>
                                                        </li>
                                                    </ul>
                                                </AnimateHeight>
                                            </li>
                                            <li className="nav-item">
                                                <Link href="/procurement/suppliers" className="group">
                                                    <div className="flex items-center">
                                                        <IconShoppingBag fill className="shrink-0 group-hover:!text-primary" />
                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('suppliers')}</span>
                                                    </div>
                                                </Link>
                                            </li>
                                            <li className="nav-item">
                                                <Link href="/customers" className="group">
                                                    <div className="flex items-center">
                                                        <IconUsersGroup fill className="shrink-0 group-hover:!text-primary" />
                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('customers')}</span>
                                                    </div>
                                                </Link>
                                            </li>
                                            <li className="nav-item">
                                                <Link href="/transactions" className="group">
                                                    <div className="flex items-center">
                                                        <IconCreditCard fill className="shrink-0 group-hover:!text-primary" />
                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('transactions')}</span>
                                                    </div>
                                                </Link>
                                            </li>
                                        </ul>
                                    </li>
                                </>
                            )}
                        </ul>
                    </PerfectScrollbar>
                    <div className="shrink-0 border-t border-white-light dark:border-[#191e3a]">
                        <ul className="space-y-0.5 p-4 py-2 font-semibold">
                            <li className="nav-item">
                                <Link href="/settings/store" className="group">
                                    <div className="flex items-center">
                                        <IconSettings className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('store_settings')}</span>
                                    </div>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
