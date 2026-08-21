import ComponentsProcurementSuppliers from '@/components/procurement/components-procurement-suppliers';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Suppliers',
};

const Suppliers = () => {
    return <ComponentsProcurementSuppliers />;
};

export default Suppliers;
