import { Metadata } from 'next';
import ComponentsAppsPosSalesCart from '@/components/apps/pos/sales-cart/components-apps-pos-sales-cart';

export const metadata: Metadata = {
    title: 'Sales Cart',
};

const SalesCart = () => {
    return <ComponentsAppsPosSalesCart />;
};

export default SalesCart;
