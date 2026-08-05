import { Metadata } from 'next';
import ComponentsAppsPosInventoryLookup from '@/components/apps/pos/inventory-lookup/components-apps-pos-inventory-lookup';

export const metadata: Metadata = {
    title: 'Inventory Lookup',
};

const InventoryLookup = () => {
    return <ComponentsAppsPosInventoryLookup />;
};

export default InventoryLookup;
