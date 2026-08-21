import ComponentsSettingsStoreTabs from '@/components/settings/components-settings-store-tabs';
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
    title: 'Store Settings',
};

const StoreSettings = () => {
    return <ComponentsSettingsStoreTabs />;
};

export default StoreSettings;
