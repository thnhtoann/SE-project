import { Order, Shift } from '@/components/apps/pos/pos-data';
import PosStatusBadge from '@/components/apps/pos/pos-status-badge';
import { getTranslation } from '@/i18n';

interface Props {
    shifts: Shift[];
    activeShift: Shift | null;
    orders: Order[];
    onOpenShift: () => void;
    onCloseShift: () => void;
}

function isToday(iso: string): boolean {
    return new Date(iso).toDateString() === new Date().toDateString();
}

export default function PosShiftList({ shifts, activeShift, orders, onOpenShift, onCloseShift }: Props) {
    const { t } = getTranslation();
    const todayShifts = [...shifts].filter((s) => isToday(s.openedAt)).sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));

    const cashInShift = (shift: Shift) => {
        const shiftOrders = orders.filter((o) => o.shiftId === shift.shiftId);
        const cash = shiftOrders.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.totalAmount, 0);
        const bankQr = shiftOrders.filter((o) => o.paymentMethod === 'bank_qr').reduce((s, o) => s + o.totalAmount, 0);
        return { cash, bankQr, total: cash + bankQr };
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-white-dark">
                    {activeShift ? `Register ${activeShift.register} is open` : 'No shift currently open'}
                </div>
                {activeShift ? (
                    <button type="button" className="btn btn-outline-danger" onClick={onCloseShift}>
                        {t('close_shift')}
                    </button>
                ) : (
                    <button type="button" className="btn btn-primary" onClick={onOpenShift}>
                        {t('open_shift')}
                    </button>
                )}
            </div>

            <div className="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Register</th>
                            <th>Cashier</th>
                            <th>Opened</th>
                            <th>Closed</th>
                            <th>Status</th>
                            <th>{t('cash')}</th>
                            <th>{t('bank_qr')}</th>
                            <th>{t('cash_in_shift')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todayShifts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="!text-center font-semibold text-white-dark">
                                    No shifts today
                                </td>
                            </tr>
                        )}
                        {todayShifts.map((s) => {
                            const totals = cashInShift(s);
                            return (
                                <tr key={s.shiftId}>
                                    <td>{s.register}</td>
                                    <td>{s.cashierName}</td>
                                    <td>{new Date(s.openedAt).toLocaleTimeString()}</td>
                                    <td>{s.closedAt ? new Date(s.closedAt).toLocaleTimeString() : '—'}</td>
                                    <td>
                                        <PosStatusBadge label={s.status === 'open' ? 'Open' : 'Closed'} color={s.status === 'open' ? 'success' : 'secondary'} />
                                    </td>
                                    <td>${totals.cash.toFixed(2)}</td>
                                    <td>${totals.bankQr.toFixed(2)}</td>
                                    <td className="font-semibold">${totals.total.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
