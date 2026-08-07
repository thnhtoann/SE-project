import ComponentsDashboardStore from '@/components/dashboard/components-dashboard-store';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Store Dashboard',
};

const StoreDashboard = () => {
    return <ComponentsDashboardStore />;
};

export default StoreDashboard;
