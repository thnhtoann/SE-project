import { ShiftRecord } from '@/types/admin';
import PosStatusBadge from '@/components/apps/pos/pos-status-badge';
import { currency } from '@/lib/currency';
import { getTranslation } from '@/i18n';

interface Props {
    shifts: ShiftRecord[];
    activeShift: ShiftRecord | null;
    loading: boolean;
    onOpenShift: () => void;
    onCloseShift: () => void;
}

function isToday(iso: string): boolean {
    return new Date(iso).toDateString() === new Date().toDateString();
}

export default function PosShiftList({ shifts, activeShift, loading, onOpenShift, onCloseShift }: Props) {
    const { t } = getTranslation();
    const todayShifts = [...shifts].filter((s) => isToday(s.opened_at)).sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1));

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-white-dark">{activeShift ? `Register ${activeShift.register} is open` : 'No shift currently open'}</div>
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
                            <th>{t('cashier')}</th>
                            <th>Opened</th>
                            <th>Closed</th>
                            <th>Status</th>
                            <th>Opening cash</th>
                            <th>Closing cash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={7} className="!text-center font-semibold text-white-dark">
                                    {t('loading')}
                                </td>
                            </tr>
                        )}
                        {!loading && todayShifts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="!text-center font-semibold text-white-dark">
                                    No shifts today
                                </td>
                            </tr>
                        )}
                        {todayShifts.map((s) => (
                            <tr key={s.shift_id}>
                                <td>{s.register}</td>
                                <td>{s.staff_name}</td>
                                <td>{new Date(s.opened_at).toLocaleTimeString()}</td>
                                <td>{s.closed_at ? new Date(s.closed_at).toLocaleTimeString() : '—'}</td>
                                <td>
                                    <PosStatusBadge label={s.status} color={s.status === 'Open' ? 'success' : 'secondary'} />
                                </td>
                                <td>{currency(s.opening_cash)}</td>
                                <td>{s.closing_cash !== null ? currency(s.closing_cash) : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
