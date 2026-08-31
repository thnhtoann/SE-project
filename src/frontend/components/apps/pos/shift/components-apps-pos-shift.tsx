'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { closeShift, openShift } from '@/store/posSlice';
import PosShiftList from './pos-shift-list';
import PosEodReport from './pos-eod-report';
import { getTranslation } from '@/i18n';

const ComponentsAppsPosShift = () => {
    const { t } = getTranslation();
    const dispatch = useDispatch();
    const shifts = useSelector((state: IRootState) => state.pos.shifts);
    const activeShift = useSelector((state: IRootState) => state.pos.activeShift);
    const orders = useSelector((state: IRootState) => state.pos.orders);
    const [panel, setPanel] = useState<'shift' | 'eod'>('shift');

    const handleOpenShift = () => {
        const input = window.prompt('Opening cash float ($)', '100');
        if (input === null) return;
        const value = Number(input);
        if (!Number.isNaN(value) && value >= 0) dispatch(openShift({ openingCashFloat: value }));
    };

    const handleCloseShift = () => {
        if (window.confirm('Close the current shift?')) dispatch(closeShift());
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

            {panel === 'shift' ? (
                <PosShiftList shifts={shifts} activeShift={activeShift} orders={orders} onOpenShift={handleOpenShift} onCloseShift={handleCloseShift} />
            ) : (
                <PosEodReport orders={orders} />
            )}
        </div>
    );
};

export default ComponentsAppsPosShift;
