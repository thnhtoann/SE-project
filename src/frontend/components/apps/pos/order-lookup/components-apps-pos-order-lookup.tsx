'use client';

import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Fragment, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { Order } from '@/components/apps/pos/pos-data';
import PosStatusBadge, { orderStatusBadge, paymentMethodBadge } from '@/components/apps/pos/pos-status-badge';
import IconSearch from '@/components/icon/icon-search';
import IconX from '@/components/icon/icon-x';
import IconEye from '@/components/icon/icon-eye';
import { getTranslation } from '@/i18n';

const ComponentsAppsPosOrderLookup = () => {
    const { t } = getTranslation();
    const orders = useSelector((state: IRootState) => state.pos.orders);

    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return [...orders]
            .filter((o) => {
                if (q && !o.orderId.toLowerCase().includes(q) && !(o.customerName ?? '').toLowerCase().includes(q)) return false;
                const orderDay = o.orderDate.slice(0, 10);
                if (dateFrom && orderDay < dateFrom) return false;
                if (dateTo && orderDay > dateTo) return false;
                return true;
            })
            .sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1));
    }, [orders, search, dateFrom, dateTo]);

    return (
        <div className="panel">
            <div className="mb-5 text-lg font-bold">{t('order_lookup')}</div>

            <div className="mb-5 flex flex-wrap items-end gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <label htmlFor="order-search">{t('search_orders')}</label>
                    <div className="relative">
                        <input
                            id="order-search"
                            type="text"
                            className="form-input ltr:pl-9 rtl:pr-9"
                            placeholder={`${t('customer')} / ${t('order_code')}`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
                            <IconSearch className="h-4 w-4 text-white-dark" />
                        </span>
                    </div>
                </div>
                <div>
                    <label htmlFor="date-from">{t('date_range')} from</label>
                    <input id="date-from" type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="date-to">to</label>
                    <input id="date-to" type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
            </div>

            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>{t('order_code')}</th>
                            <th>Date</th>
                            <th>{t('customer')}</th>
                            <th>{t('payment_method')}</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th className="w-1"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="!text-center font-semibold text-white-dark">
                                    No orders found
                                </td>
                            </tr>
                        )}
                        {filtered.map((o) => {
                            const status = orderStatusBadge(o.status);
                            const pm = paymentMethodBadge(o.paymentMethod);
                            return (
                                <tr key={o.orderId}>
                                    <td className="font-semibold">{o.orderId}</td>
                                    <td>{new Date(o.orderDate).toLocaleString()}</td>
                                    <td>{o.customerName ?? '—'}</td>
                                    <td>
                                        <PosStatusBadge label={pm.label} color={pm.color} />
                                    </td>
                                    <td>${o.totalAmount.toFixed(2)}</td>
                                    <td>
                                        <PosStatusBadge label={status.label} color={status.color} />
                                    </td>
                                    <td>
                                        <button type="button" onClick={() => setSelectedOrder(o)}>
                                            <IconEye className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Transition appear show={!!selectedOrder} as={Fragment}>
                <Dialog as="div" open={!!selectedOrder} onClose={() => setSelectedOrder(null)}>
                    <TransitionChild as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
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
                                        <div className="text-lg font-bold">{t('order_details')}</div>
                                        <button type="button" className="text-white-dark hover:text-dark" onClick={() => setSelectedOrder(null)}>
                                            <IconX />
                                        </button>
                                    </div>
                                    {selectedOrder && (
                                        <div className="p-5">
                                            <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                                <div className="text-white-dark">{t('order_code')}</div>
                                                <div className="text-right font-semibold">{selectedOrder.orderId}</div>
                                                <div className="text-white-dark">Date</div>
                                                <div className="text-right">{new Date(selectedOrder.orderDate).toLocaleString()}</div>
                                                <div className="text-white-dark">{t('customer')}</div>
                                                <div className="text-right">{selectedOrder.customerName ?? '—'}</div>
                                                <div className="text-white-dark">{t('employee')}</div>
                                                <div className="text-right">{selectedOrder.cashierName}</div>
                                            </div>
                                            <div className="border-t border-white-light pt-3 dark:border-[#1b2e4b]">
                                                {selectedOrder.lineItems.map((li) => (
                                                    <div key={li.productId} className="flex justify-between py-1 text-sm">
                                                        <span>
                                                            {li.name} x{li.quantity}
                                                        </span>
                                                        <span>${li.subTotal.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                                <div className="mt-2 flex justify-between border-t border-white-light pt-2 font-semibold dark:border-[#1b2e4b]">
                                                    <span>{t('total')}</span>
                                                    <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default ComponentsAppsPosOrderLookup;
