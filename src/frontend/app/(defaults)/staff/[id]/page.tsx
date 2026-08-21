'use client';
import ComponentsStaffDetails from '@/components/staff/components-staff-details';
import { apiFetch, ApiError } from '@/lib/api-client';
import { getTranslation } from '@/i18n';
import { StaffRecord } from '@/types/admin';
import { notFound } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const StaffDetails = ({ params }: { params: { id: string } }) => {
    const { t } = getTranslation();
    const [staff, setStaff] = useState<StaffRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        apiFetch<StaffRecord>(`/staff/${params.id}/`)
            .then((data) => {
                if (!cancelled) setStaff(data);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err instanceof ApiError && err.status === 404) {
                    notFound();
                    return;
                }
                setError(err instanceof ApiError ? String((err.body as { detail?: string })?.detail ?? err.message) : t('error_loading_staff'));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    if (loading) {
        return <div className="panel mt-5 flex items-center justify-center py-16 text-white-dark">{t('loading')}</div>;
    }

    if (error) {
        return <div className="m-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{error}</div>;
    }

    if (!staff) {
        return null;
    }

    return <ComponentsStaffDetails staff={staff} onStaffUpdated={setStaff} />;
};

export default StaffDetails;
