import ComponentsInventoryDetails from '@/components/inventory/components-inventory-details';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Product Details',
};

const InventoryDetails = ({ params }: { params: { id: string } }) => {
    return <ComponentsInventoryDetails productId={Number(params.id)} />;
};

export default InventoryDetails;
