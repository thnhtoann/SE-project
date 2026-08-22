'use client';
import IconGlobe from '@/components/icon/icon-globe';
import { apiFetch, ApiError } from '@/lib/api-client';
import { getTranslation } from '@/i18n';
import { StoreRecord } from '@/types/admin';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LazadaStatus {
    connected: boolean;
    store?: string;
    store_id?: number;
    account?: string;
    last_synced_at?: string | null;
}

interface SyncResult {
    fetched: number;
    synced: number[];
    skipped: { order_id: unknown; reason: string }[];
    errors: { order_id: unknown; reason: string }[];
}

// Wired to the real OAuth-based Lazada integration (omnichannel/lazada.py) —
// deliberately kept separate from the mock channel toggle grid below it,
// which simulates GrabMart/ShopeeFood/BeMart/Lazada-style webhook payloads
// rather than talking to any real marketplace account.
const ComponentsSettingsLazadaConnect = () => {
    const { t } = getTranslation();
    const searchParams = useSearchParams();

    const [lazadaStatus, setLazadaStatus] = useState<LazadaStatus | null>(null);
    const [stores, setStores] = useState<StoreRecord[]>([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadStatus = () => {
        apiFetch<LazadaStatus>('/lazada/status/')
            .then(setLazadaStatus)
            .catch(() => setLazadaStatus(null));
    };

    useEffect(() => {
        loadStatus();
        apiFetch<StoreRecord[]>('/stores/')
            .then(setStores)
            .catch(() => setStores([]));
    }, []);

    useEffect(() => {
        const outcome = searchParams.get('lazada');
        if (outcome === 'connected') {
            setNotice(t('lazada_connected_notice'));
            loadStatus();
        } else if (outcome === 'error') {
            setError(t('lazada_connect_error'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const connect = async () => {
        setError('');
        if (!selectedStore) {
            setError(t('error_store_required'));
            return;
        }
        setConnecting(true);
        try {
            const { authorize_url } = await apiFetch<{ authorize_url: string }>(`/lazada/authorize/?store=${selectedStore}`);
            window.open(authorize_url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            setError(err instanceof ApiError ? String((err.body as { error?: string })?.error ?? err.message) : t('lazada_connect_error'));
        } finally {
            setConnecting(false);
        }
    };

    const syncNow = async () => {
        setError('');
        setSyncResult(null);
        setSyncing(true);
        try {
            const result = await apiFetch<SyncResult>('/lazada/sync/', { method: 'POST' });
            setSyncResult(result);
            loadStatus();
        } catch (err) {
            setError(err instanceof ApiError ? String((err.body as { error?: string })?.error ?? err.message) : t('lazada_sync_error'));
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="mb-5 rounded-md border border-[#ebedf2] p-4 dark:border-[#1b2e4b]">
            <div className="mb-3 flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-content-center rounded-full bg-info-light text-info dark:bg-info dark:text-info-light">
                    <IconGlobe className="h-5 w-5" />
                </div>
                <div>
                    <h6 className="text-[15px] font-bold text-[#515365] dark:text-white-dark">{t('lazada_real_account')}</h6>
                    <span
                        className={`badge mt-1 ${lazadaStatus?.connected ? 'bg-success-light text-success dark:bg-success dark:text-success-light' : 'bg-white-dark/20 text-white-dark dark:bg-[#1b2e4b]'}`}
                    >
                        {lazadaStatus?.connected ? t('connected') : t('not_connected')}
                    </span>
                </div>
            </div>

            {notice && <p className="mb-3 text-success">{notice}</p>}
            {error && <p className="mb-3 text-danger">{error}</p>}

            {lazadaStatus?.connected ? (
                <div className="space-y-2">
                    <p className="text-white-dark">
                        {t('lazada_connected_to')} <span className="font-semibold text-[#515365] dark:text-white-light">{lazadaStatus.store}</span>
                        {lazadaStatus.account ? ` (${lazadaStatus.account})` : ''}
                    </p>
                    <p className="text-white-dark">{t('lazada_last_synced')}: {lazadaStatus.last_synced_at ? new Date(lazadaStatus.last_synced_at).toLocaleString() : t('lazada_never_synced')}</p>
                    <button type="button" onClick={syncNow} disabled={syncing} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                        {syncing ? t('loading') : t('lazada_sync_now')}
                    </button>
                    {syncResult && (
                        <p className="text-white-dark">
                            {t('lazada_sync_result')
                                .replace('{fetched}', String(syncResult.fetched))
                                .replace('{synced}', String(syncResult.synced.length))
                                .replace('{errors}', String(syncResult.skipped.length + syncResult.errors.length))}
                        </p>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label htmlFor="lazadaStore">{t('branch')}</label>
                        <select id="lazadaStore" className="form-select" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                            <option value="">{t('select_branch')}</option>
                            {stores.map((s) => (
                                <option key={s.store_id} value={s.store_id}>
                                    {s.store_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="button" onClick={connect} disabled={connecting} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                        {connecting ? t('loading') : t('lazada_connect')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ComponentsSettingsLazadaConnect;
