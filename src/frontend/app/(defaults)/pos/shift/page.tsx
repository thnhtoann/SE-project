import { Metadata } from 'next';
import ComponentsAppsPosShift from '@/components/apps/pos/shift/components-apps-pos-shift';

export const metadata: Metadata = {
    title: 'Shift & Reports',
};

const ShiftAndReports = () => {
    return <ComponentsAppsPosShift />;
};

export default ShiftAndReports;
