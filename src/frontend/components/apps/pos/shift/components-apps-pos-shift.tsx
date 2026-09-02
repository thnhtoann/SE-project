'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { closeShiftThunk, fetchActiveShift, openShiftThunk } from '@/store/posSlice';
import { useApi } from '@/lib/hooks/use-api';
import { ShiftRecord } from '@/types/admin';
import PosShiftList from './pos-shift-list';
import PosEodReport from './pos-eod-report';
import { showPosToast } from '@/components/apps/pos/pos-toast';
import { getTranslation } from '@/i18n';

const ComponentsAppsPosShift = () => {
    const { t } = getTranslation();
    const dispatch = useDispatch<any>();
    const storeId = useSelector((state: IRootState) => state.session.storeId);
    const activeShift = useSelector((state: IRootState) => state.pos.activeShift);
    const shiftError = useSelector((state: IRootState) => state.pos.shiftError);
    const { data: shiftsData, isLoading: shiftsLoading, mutate: reloadShifts } = useApi<ShiftRecord[]>(storeId ? `/shifts/?store=${storeId}` : null);
    const shifts = shiftsData ?? [];
    const [panel, setPanel] = useState<'shift' | 'eod'>('shift');

    useEffect(() => {
        if (storeId) dispatch(fetchActiveShift(storeId));
    }, [dispatch, storeId]);

    const handleOpenShift = async () => {
        if (!storeId) return;
        const input = window.prompt('Opening cash float (₫)', '0');
        if (input === null) return;
        const value = Number(input);
        if (Number.isNaN(value) || value < 0) return;
        try {
            await dispatch(openShiftThunk({ storeId, openingCash: value })).unwrap();
            reloadShifts();
        } catch (err) {
            showPosToast(typeof err === 'string' ? err : 'Failed to open shift', 'error');
        }
    };

    const handleCloseShift = async () => {
        if (!activeShift) return;
        if (!window.confirm('Close the current shift?')) return;
        const input = window.prompt('Closing cash count (₫)', '0');
        if (input === null) return;
        const value = Number(input);
        if (Number.isNaN(value) || value < 0) return;
        try {
            await dispatch(closeShiftThunk({ shiftId: activeShift.shift_id, closingCash: value })).unwrap();
            reloadShifts();
        } catch (err) {
            showPosToast(typeof err === 'string' ? err : 'Failed to close shift', 'error');
        }
    };

    return (
        <div className="panel">
            <div className="mb-5 flex gap-2 border-b border-white-light dark:border-[#1b2e4b]">
                <button
                    type="button"
                    className={`-mb-px border-b-2 px-4 py-2 ${panel === 'shift' ? '!border-primary text-primary' : 'border-transparent'}`}
                    onClick={() => setPanel('shift')}
                >
                    {t('shift_management')}
                </button>
                <button
                    type="button"
                    className={`-mb-px border-b-2 px-4 py-2 ${panel === 'eod' ? '!border-primary text-primary' : 'border-transparent'}`}
                    onClick={() => setPanel('eod')}
                >
                    {t('end_of_day_report')}
                </button>
            </div>

            {shiftError && <div className="mb-4 rounded-md border border-danger bg-danger-light px-4 py-3 text-sm text-danger">{shiftError}</div>}

            {panel === 'shift' ? (
                <PosShiftList shifts={shifts} activeShift={activeShift} loading={shiftsLoading} onOpenShift={handleOpenShift} onCloseShift={handleCloseShift} />
            ) : (
                <PosEodReport activeShift={activeShift} />
            )}
        </div>
    );
};

export default ComponentsAppsPosShift;
