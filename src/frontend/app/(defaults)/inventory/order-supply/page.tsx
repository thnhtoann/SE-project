import ComponentsInventoryOrderSupply from '@/components/inventory/components-inventory-order-supply';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Order Supply',
};

const InventoryOrderSupply = () => {
    return <ComponentsInventoryOrderSupply />;
};

export default InventoryOrderSupply;
