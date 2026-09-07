'use client';
import ComponentsStaffDetails from '@/components/staff/components-staff-details';
import { ApiError } from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { getTranslation } from '@/i18n';
import { StaffRecord } from '@/types/admin';
import { notFound } from 'next/navigation';
import React, { useEffect } from 'react';

const StaffDetails = ({ params }: { params: { id: string } }) => {
    const { t } = getTranslation();
    const { data: staff, error, isLoading: loading, mutate } = useApi<StaffRecord>(`/staff/${params.id}/`);

    useEffect(() => {
        if (error instanceof ApiError && error.status === 404) notFound();
    }, [error]);

    if (loading) {
        return <div className="panel mt-5 flex items-center justify-center py-16 text-white-dark">{t('loading')}</div>;
    }

    if (error) {
        return (
            <div className="m-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">
                {error instanceof ApiError ? String((error.body as { detail?: string })?.detail ?? error.message) : t('error_loading_staff')}
            </div>
        );
    }

    if (!staff) {
        return null;
    }

    return <ComponentsStaffDetails staff={staff} onStaffUpdated={(updated) => mutate(updated, { revalidate: false })} />;
};

export default StaffDetails;
