import ComponentsCustomersList from '@/components/customers/components-customers-list';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Customer List',
};

const Customers = () => {
    return <ComponentsCustomersList />;
};

export default Customers;
