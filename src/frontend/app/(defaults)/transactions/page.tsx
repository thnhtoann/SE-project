import ComponentsTransactionsList from '@/components/transactions/components-transactions-list';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Orders',
};

const Transactions = () => {
    return <ComponentsTransactionsList />;
};

export default Transactions;
