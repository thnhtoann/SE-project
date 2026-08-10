'use client';
import { ReportPeriod } from '@/types/admin';
import { getTranslation } from '@/i18n';

const PERIOD_KEY: Record<ReportPeriod, string> = {
    week: 'this_week',
    month: 'this_month',
    quarter: 'this_quarter',
};

const PERIODS: ReportPeriod[] = ['week', 'month', 'quarter'];

interface PeriodSelectorProps {
    value: ReportPeriod;
    onChange: (period: ReportPeriod) => void;
}

const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
    const { t } = getTranslation();

    return (
        <div className="flex gap-2">
            {PERIODS.map((period) => (
                <button
                    key={period}
                    type="button"
                    className={`btn btn-sm ${value === period ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => onChange(period)}
                >
                    {t(PERIOD_KEY[period])}
                </button>
            ))}
        </div>
    );
};

export default PeriodSelector;
