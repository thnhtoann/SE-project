import ComponentsDashboardAnalytics from '@/components/dashboard/components-dashboard-analytics';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Analytics Dashboard',
};

const AnalyticsDashboard = () => {
    return <ComponentsDashboardAnalytics />;
};

export default AnalyticsDashboard;
