import ComponentsInventoryDetails from '@/components/inventory/components-inventory-details';
import { PRODUCTS } from '@/data/mock-products';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';

export const metadata: Metadata = {
    title: 'Product Details',
};

const InventoryDetails = ({ params }: { params: { id: string } }) => {
    const product = PRODUCTS.find((p) => p.product_id === Number(params.id));

    if (!product) {
        notFound();
    }

    return <ComponentsInventoryDetails product={product} />;
};

export default InventoryDetails;
