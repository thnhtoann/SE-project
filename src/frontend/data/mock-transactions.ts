import { PosTransaction } from '@/types/admin';

// Cashier names mirror MOCK_STAFF entries so the two lists stay consistent.
export const POS_TRANSACTIONS: PosTransaction[] = [
    { id: 'TXN-341220', customer: 'Ray Nichols', amount: 38000, paymentMethod: 'Cash', cashier: 'Linda Nelson', status: 'Completed', date: '2026-08-09' },
    { id: 'TXN-547891', customer: 'Barbara Woods', amount: 113450, paymentMethod: 'Card', cashier: 'Lila Perry', status: 'Completed', date: '2026-08-09' },
    { id: 'TXN-230477', customer: 'Walk-in Customer', amount: 16780, paymentMethod: 'Cash', cashier: 'Linda Nelson', status: 'Completed', date: '2026-08-08' },
    { id: 'TXN-765434', customer: 'Walk-in Customer', amount: 10230, paymentMethod: 'MoMo', cashier: 'Lila Perry', status: 'Pending', date: '2026-08-08' },
    { id: 'TXN-452103', customer: 'Luis Brick', amount: 178900, paymentMethod: 'Online Banking', cashier: 'Linda Nelson', status: 'Completed', date: '2026-08-07' },
    { id: 'TXN-618305', customer: 'David Nguyen', amount: 54200, paymentMethod: 'MoMo', cashier: 'Lila Perry', status: 'Canceled', date: '2026-08-07' },
    { id: 'TXN-902847', customer: 'Sinikka Pham', amount: 27300, paymentMethod: 'Card', cashier: 'Linda Nelson', status: 'Pending', date: '2026-08-06' },
    { id: 'TXN-118563', customer: 'Walk-in Customer', amount: 8900, paymentMethod: 'Cash', cashier: 'Lila Perry', status: 'Canceled', date: '2026-08-06' },
];
