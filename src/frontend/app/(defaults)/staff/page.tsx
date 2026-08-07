import ComponentsStaffList from '@/components/staff/components-staff-list';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Staff',
};

const Staff = () => {
    return <ComponentsStaffList />;
};

export default Staff;
