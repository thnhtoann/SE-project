'use client';
import IconArrowBackward from '@/components/icon/icon-arrow-backward';
import IconAward from '@/components/icon/icon-award';
import IconCalendar from '@/components/icon/icon-calendar';
import IconFacebook from '@/components/icon/icon-facebook';
import IconFile from '@/components/icon/icon-file';
import IconGithub from '@/components/icon/icon-github';
import IconHome from '@/components/icon/icon-home';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconMail from '@/components/icon/icon-mail';
import IconPhone from '@/components/icon/icon-phone';
import IconStar from '@/components/icon/icon-star';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconTwitter from '@/components/icon/icon-twitter';
import { apiFetch, ApiError } from '@/lib/api-client';
import { getTranslation } from '@/i18n';
import { IRootState } from '@/store';
import { StaffCertificateRecord, StaffDocumentRecord, StaffPerformanceStatus, StaffRecord, StaffReviewRecord } from '@/types/admin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { ChangeEvent, FormEvent, useState } from 'react';
import { useSelector } from 'react-redux';

const performanceBadgeClass: Record<StaffPerformanceStatus, string> = {
    Excellent: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Good: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    'Needs Improvement': 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
};

const performanceKey: Record<StaffPerformanceStatus, string> = {
    Excellent: 'performance_excellent',
    Good: 'performance_good',
    'Needs Improvement': 'performance_needs_improvement',
};

const currency = (value: number) => (value > 0 ? `₫${value.toLocaleString('en-US')}` : '—');

interface Props {
    staff: StaffRecord;
    onStaffUpdated: (staff: StaffRecord) => void;
}

const ComponentsStaffDetails = ({ staff, onStaffUpdated }: Props) => {
    const { t } = getTranslation();
    const router = useRouter();
    const role = useSelector((state: IRootState) => state.session.role);
    const canManage = role === 'Chain Manager' || role === 'Admin';

    const [deleting, setDeleting] = useState(false);
    const [actionError, setActionError] = useState('');

    const [reviewForm, setReviewForm] = useState({ reviewer: '', rating: '5', comment: '' });
    const [certForm, setCertForm] = useState({ name: '', issued_by: '', issued_at: '' });
    const [documentName, setDocumentName] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [submittingSubResource, setSubmittingSubResource] = useState(false);

    const toggleActive = async () => {
        setActionError('');
        try {
            const updated = await apiFetch<StaffRecord>(`/staff/${staff.staff_id}/`, { method: 'PATCH', body: { is_active: !staff.is_active } });
            onStaffUpdated(updated);
        } catch (err) {
            setActionError(err instanceof ApiError ? String((err.body as { detail?: string })?.detail ?? err.message) : t('error_saving_staff'));
        }
    };

    const deleteStaff = async () => {
        if (!window.confirm(t('confirm_delete_staff'))) return;
        setDeleting(true);
        setActionError('');
        try {
            await apiFetch(`/staff/${staff.staff_id}/`, { method: 'DELETE' });
            router.push('/staff');
        } catch (err) {
            setActionError(err instanceof ApiError ? String((err.body as { detail?: string })?.detail ?? err.message) : t('error_deleting_staff'));
            setDeleting(false);
        }
    };

    const submitReview = async (e: FormEvent) => {
        e.preventDefault();
        if (!reviewForm.reviewer.trim()) return;
        setSubmittingSubResource(true);
        setActionError('');
        try {
            const review = await apiFetch<StaffReviewRecord>('/staff-reviews/', {
                method: 'POST',
                body: { staff: staff.staff_id, reviewer: reviewForm.reviewer, rating: Number(reviewForm.rating), comment: reviewForm.comment },
            });
            onStaffUpdated({ ...staff, reviews: [review, ...staff.reviews] });
            setReviewForm({ reviewer: '', rating: '5', comment: '' });
        } catch (err) {
            setActionError(err instanceof ApiError ? String((err.body as { detail?: string })?.detail ?? err.message) : t('error_saving_review'));
        } finally {
            setSubmittingSubResource(false);
        }
    };

    const submitCertificate = async (e: FormEvent) => {
        e.preventDefault();
        if (!certForm.name.trim() || !certForm.issued_by.trim() || !certForm.issued_at) return;
        setSubmittingSubResource(true);
        setActionError('');
        try {
            const cert = await apiFetch<StaffCertificateRecord>('/staff-certificates/', {
                method: 'POST',
                body: { staff: staff.staff_id, ...certForm },
            });
            onStaffUpdated({ ...staff, certificates: [cert, ...staff.certificates] });
            setCertForm({ name: '', issued_by: '', issued_at: '' });
        } catch (err) {
            setActionError(err instanceof ApiError ? String((err.body as { detail?: string })?.detail ?? err.message) : t('error_saving_certificate'));
        } finally {
            setSubmittingSubResource(false);
        }
    };

    const submitDocument = async (e: FormEvent) => {
        e.preventDefault();
        if (!documentName.trim() || !documentFile) return;
        setSubmittingSubResource(true);
        setActionError('');
        try {
            const formData = new FormData();
            formData.append('staff', String(staff.staff_id));
            formData.append('name', documentName);
            formData.append('file', documentFile);
            const doc = await apiFetch<StaffDocumentRecord>('/staff-documents/', { method: 'POST', body: formData });
            onStaffUpdated({ ...staff, documents: [doc, ...staff.documents] });
            setDocumentName('');
            setDocumentFile(null);
        } catch (err) {
            setActionError(err instanceof ApiError ? String((err.body as { detail?: string })?.detail ?? err.message) : t('error_saving_document'));
        } finally {
            setSubmittingSubResource(false);
        }
    };

    const socialLinks = staff.social_links ?? {};

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/staff" className="text-primary hover:underline">
                        {t('staff')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{staff.full_name}</span>
                </li>
            </ul>

            <div className="pt-5">
                {actionError && <div className="mb-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{actionError}</div>}

                <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3 xl:grid-cols-4">
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('profile')}</h5>
                            <Link href="/staff" className="btn btn-outline-primary rounded-full p-2 ltr:ml-auto rtl:mr-auto">
                                <IconArrowBackward />
                            </Link>
                        </div>
                        <div className="mb-5">
                            <div className="flex flex-col items-center justify-center">
                                <img src="/assets/images/user-profile.jpeg" alt={staff.full_name} className="mb-5 h-24 w-24 rounded-full object-cover" />
                                <p className="text-xl font-semibold text-primary">{staff.full_name}</p>
                                <span className={`badge mt-2 ${performanceBadgeClass[staff.performance_status]}`}>{t(performanceKey[staff.performance_status])}</span>
                                {!staff.is_active && <span className="badge mt-2 bg-danger-light text-danger dark:bg-danger dark:text-danger-light">{t('inactive')}</span>}
                            </div>
                            <ul className="m-auto mt-5 flex max-w-[220px] flex-col space-y-4 font-semibold text-white-dark">
                                <li className="flex items-center gap-2">
                                    <IconHome className="shrink-0" /> {staff.role_name} · {staff.store_name ?? t('no_branch_assigned')}
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconCalendar className="shrink-0" />
                                    {t('joined')} {new Date(staff.joined_at).toLocaleDateString()}
                                </li>
                                <li>
                                    <button type="button" className="flex items-center gap-2">
                                        <IconMail className="h-5 w-5 shrink-0" />
                                        <span className="truncate text-primary">{staff.email ?? '—'}</span>
                                    </button>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconPhone className="shrink-0" />
                                    <span dir="ltr">{staff.phone ?? '—'}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-info">{currency(staff.monthly_sales)}</span> · {t('monthly_sales')}
                                </li>
                            </ul>
                            {(socialLinks.linkedin || socialLinks.twitter || socialLinks.facebook || socialLinks.github) && (
                                <ul className="mt-7 flex items-center justify-center gap-2">
                                    {socialLinks.linkedin && (
                                        <li>
                                            <button type="button" className="btn btn-info flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconLinkedin className="h-5 w-5" />
                                            </button>
                                        </li>
                                    )}
                                    {socialLinks.twitter && (
                                        <li>
                                            <button type="button" className="btn btn-primary flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconTwitter className="h-5 w-5" />
                                            </button>
                                        </li>
                                    )}
                                    {socialLinks.facebook && (
                                        <li>
                                            <button type="button" className="btn btn-secondary flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconFacebook className="h-5 w-5" />
                                            </button>
                                        </li>
                                    )}
                                    {socialLinks.github && (
                                        <li>
                                            <button type="button" className="btn btn-dark flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconGithub />
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            )}
                            {canManage && (
                                <div className="mt-7 flex items-center justify-center gap-3">
                                    <button type="button" className="btn btn-outline-warning" onClick={toggleActive}>
                                        {staff.is_active ? t('deactivate') : t('activate')}
                                    </button>
                                    <button type="button" disabled={deleting} className="btn btn-outline-danger" onClick={deleteStaff}>
                                        <IconTrashLines className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                        {t('delete')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="panel lg:col-span-2 xl:col-span-3">
                        <div className="mb-5 flex items-center gap-2">
                            <IconStar className="text-warning" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('reviews')}</h5>
                        </div>
                        {staff.reviews.length === 0 ? (
                            <p className="text-white-dark">{t('no_reviews_recorded')}</p>
                        ) : (
                            <div className="space-y-4">
                                {staff.reviews.map((review) => (
                                    <div key={review.id} className="rounded border border-[#ebedf2] p-4 dark:border-[#1b2e4b]">
                                        <div className="flex items-center justify-between">
                                            <h6 className="font-semibold text-[#515365] dark:text-white-dark">{review.reviewer}</h6>
                                            <div className="flex items-center gap-1 text-warning">
                                                {Array.from({ length: review.rating }).map((_, i) => (
                                                    <IconStar key={i} className="h-4 w-4" />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="mt-2 text-white-dark">{review.comment}</p>
                                        <p className="mt-1 text-xs text-white-dark">{new Date(review.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {canManage && (
                            <form onSubmit={submitReview} className="mt-5 flex flex-col gap-3 border-t border-[#ebedf2] pt-5 dark:border-[#1b2e4b] sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <label htmlFor="reviewer">{t('reviewer')}</label>
                                    <input
                                        id="reviewer"
                                        type="text"
                                        className="form-input"
                                        value={reviewForm.reviewer}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setReviewForm((p) => ({ ...p, reviewer: e.target.value }))}
                                    />
                                </div>
                                <div className="w-full sm:w-24">
                                    <label htmlFor="rating">{t('rating')}</label>
                                    <select
                                        id="rating"
                                        className="form-select"
                                        value={reviewForm.rating}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setReviewForm((p) => ({ ...p, rating: e.target.value }))}
                                    >
                                        {[5, 4, 3, 2, 1].map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="comment">{t('comment')}</label>
                                    <input
                                        id="comment"
                                        type="text"
                                        className="form-input"
                                        value={reviewForm.comment}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                                    />
                                </div>
                                <button type="submit" disabled={submittingSubResource} className="btn btn-primary">
                                    {t('add_review')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-2">
                            <IconFile className="shrink-0" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('documents')}</h5>
                        </div>
                        {staff.documents.length === 0 ? (
                            <p className="text-white-dark">{t('no_documents_on_file')}</p>
                        ) : (
                            <ul className="space-y-3">
                                {staff.documents.map((doc) => (
                                    <li key={doc.id} className="flex items-center justify-between border-b border-[#ebedf2] pb-2 last:border-0 dark:border-[#1b2e4b]">
                                        <a href={doc.file} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary">
                                            <IconFile className="h-4 w-4 shrink-0 text-white-dark" />
                                            <span>{doc.name}</span>
                                        </a>
                                        <span className="text-xs text-white-dark">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {canManage && (
                            <form onSubmit={submitDocument} className="mt-5 flex flex-col gap-3 border-t border-[#ebedf2] pt-5 dark:border-[#1b2e4b]">
                                <input
                                    type="text"
                                    placeholder={t('document_name_placeholder')}
                                    className="form-input"
                                    value={documentName}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDocumentName(e.target.value)}
                                />
                                <input
                                    type="file"
                                    className="form-input p-1 text-xs"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDocumentFile(e.target.files?.[0] ?? null)}
                                />
                                <button type="submit" disabled={submittingSubResource} className="btn btn-primary self-start">
                                    {t('add_document')}
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="panel">
                        <div className="mb-5 flex items-center gap-2">
                            <IconAward className="shrink-0" />
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('certificates')}</h5>
                        </div>
                        {staff.certificates.length === 0 ? (
                            <p className="text-white-dark">{t('no_certificates_on_file')}</p>
                        ) : (
                            <ul className="space-y-3">
                                {staff.certificates.map((cert) => (
                                    <li key={cert.id} className="border-b border-[#ebedf2] pb-2 last:border-0 dark:border-[#1b2e4b]">
                                        <h6 className="font-semibold text-[#515365] dark:text-white-dark">{cert.name}</h6>
                                        <p className="text-xs text-white-dark">
                                            {cert.issued_by} · {new Date(cert.issued_at).toLocaleDateString()}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {canManage && (
                            <form onSubmit={submitCertificate} className="mt-5 flex flex-col gap-3 border-t border-[#ebedf2] pt-5 dark:border-[#1b2e4b]">
                                <input
                                    type="text"
                                    placeholder={t('certificate_name_placeholder')}
                                    className="form-input"
                                    value={certForm.name}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCertForm((p) => ({ ...p, name: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder={t('issued_by_placeholder')}
                                    className="form-input"
                                    value={certForm.issued_by}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCertForm((p) => ({ ...p, issued_by: e.target.value }))}
                                />
                                <input
                                    type="date"
                                    className="form-input"
                                    value={certForm.issued_at}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCertForm((p) => ({ ...p, issued_at: e.target.value }))}
                                />
                                <button type="submit" disabled={submittingSubResource} className="btn btn-primary self-start">
                                    {t('add_certificate')}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentsStaffDetails;
