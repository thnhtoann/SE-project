import ComponentsStaffDetails from '@/components/staff/components-staff-details';
import { MOCK_STAFF } from '@/data/mock-staff';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';

export const metadata: Metadata = {
    title: 'Staff Details',
};

const StaffDetails = ({ params }: { params: { id: string } }) => {
    const staff = MOCK_STAFF.find((s) => s.id === Number(params.id));

    if (!staff) {
        notFound();
    }

    return <ComponentsStaffDetails staff={staff} />;
};

export default StaffDetails;
