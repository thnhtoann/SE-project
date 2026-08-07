'use client';
import { ReportPeriod } from '@/types/admin';

const PERIODS: { value: ReportPeriod; label: string }[] = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
];

interface PeriodSelectorProps {
    value: ReportPeriod;
    onChange: (period: ReportPeriod) => void;
}

const PeriodSelector = ({ value, onChange }: PeriodSelectorProps) => {
    return (
        <div className="flex gap-2">
            {PERIODS.map((period) => (
                <button
                    key={period.value}
                    type="button"
                    className={`btn btn-sm ${value === period.value ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => onChange(period.value)}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );
};

export default PeriodSelector;
