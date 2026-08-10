import ComponentsInventoryList from '@/components/inventory/components-inventory-list';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Product List',
};

const Inventory = () => {
    return <ComponentsInventoryList />;
};

export default Inventory;
