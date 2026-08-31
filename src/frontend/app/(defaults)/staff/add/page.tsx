import ComponentsStaffAddForm from '@/components/staff/components-staff-add-form';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Add Staff',
};

const AddStaff = () => {
    return <ComponentsStaffAddForm />;
};

export default AddStaff;
