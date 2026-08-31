import ComponentsInventoryAddForm from '@/components/inventory/components-inventory-add-form';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Add Product',
};

const InventoryAdd = () => {
    return <ComponentsInventoryAddForm />;
};

export default InventoryAdd;
