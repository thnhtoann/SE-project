import { Metadata } from 'next';
import ComponentsAppsPosOrderLookup from '@/components/apps/pos/order-lookup/components-apps-pos-order-lookup';

export const metadata: Metadata = {
    title: 'Order Lookup',
};

const OrderLookup = () => {
    return <ComponentsAppsPosOrderLookup />;
};

export default OrderLookup;
