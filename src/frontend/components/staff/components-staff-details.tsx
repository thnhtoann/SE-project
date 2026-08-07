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
import IconTwitter from '@/components/icon/icon-twitter';
import { StaffAccount, StaffPerformanceStatus } from '@/types/admin';
import Link from 'next/link';
import React from 'react';

const performanceBadgeClass: Record<StaffPerformanceStatus, string> = {
    Excellent: 'bg-success-light text-success dark:bg-success dark:text-success-light',
    Good: 'bg-info-light text-info dark:bg-info dark:text-info-light',
    'Needs Improvement': 'bg-warning-light text-warning dark:bg-warning dark:text-warning-light',
};

const ComponentsStaffDetails = ({ staff }: { staff: StaffAccount }) => {
    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/staff" className="text-primary hover:underline">
                        Staff
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{staff.name}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3 xl:grid-cols-4">
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Profile</h5>
                            <Link href="/staff" className="btn btn-outline-primary rounded-full p-2 ltr:ml-auto rtl:mr-auto">
                                <IconArrowBackward />
                            </Link>
                        </div>
                        <div className="mb-5">
                            <div className="flex flex-col items-center justify-center">
                                <img src={`/assets/images/${staff.photo}`} alt={staff.name} className="mb-5 h-24 w-24 rounded-full object-cover" />
                                <p className="text-xl font-semibold text-primary">{staff.name}</p>
                                <span className={`badge mt-2 ${performanceBadgeClass[staff.performanceStatus]}`}>{staff.performanceStatus}</span>
                            </div>
                            <ul className="m-auto mt-5 flex max-w-[220px] flex-col space-y-4 font-semibold text-white-dark">
                                <li className="flex items-center gap-2">
                                    <IconHome className="shrink-0" /> {staff.role} · {staff.branch}
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconCalendar className="shrink-0" />
                                    Joined {new Date(staff.joinedAt).toLocaleDateString()}
                                </li>
                                <li>
                                    <button className="flex items-center gap-2">
                                        <IconMail className="h-5 w-5 shrink-0" />
                                        <span className="truncate text-primary">{staff.email}</span>
                                    </button>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconPhone className="shrink-0" />
                                    <span dir="ltr">{staff.phone}</span>
                                </li>
                            </ul>
                            {(staff.socialLinks.linkedin || staff.socialLinks.twitter || staff.socialLinks.facebook || staff.socialLinks.github) && (
                                <ul className="mt-7 flex items-center justify-center gap-2">
                                    {staff.socialLinks.linkedin && (
                                        <li>
                                            <button className="btn btn-info flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconLinkedin className="h-5 w-5" />
                                            </button>
                                        </li>
                                    )}
                                    {staff.socialLinks.twitter && (
                                        <li>
                                            <button className="btn btn-primary flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconTwitter className="h-5 w-5" />
                                            </button>
                                        </li>
                                    )}
                                    {staff.socialLinks.facebook && (
                                        <li>
                                            <button className="btn btn-secondary flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconFacebook className="h-5 w-5" />
                                            </button>
                                        </li>
                                    )}
                                    {staff.socialLinks.github && (
                                        <li>
                                            <button className="btn btn-dark flex h-10 w-10 items-center justify-center rounded-full p-0">
                                                <IconGithub />
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="panel lg:col-span-2 xl:col-span-3">
                        <div className="mb-5 flex items-center gap-2">
                            <IconStar className="text-warning" />
                            <h5 className="text-lg font-semibold dark:text-white-light">Reviews</h5>
                        </div>
                        {staff.reviews.length === 0 ? (
                            <p className="text-white-dark">No reviews recorded yet.</p>
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
                                        <p className="mt-1 text-xs text-white-dark">{new Date(review.date).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="panel">
                        <div className="mb-5 flex items-center gap-2">
                            <IconFile className="shrink-0" />
                            <h5 className="text-lg font-semibold dark:text-white-light">Documents</h5>
                        </div>
                        {staff.documents.length === 0 ? (
                            <p className="text-white-dark">No documents on file.</p>
                        ) : (
                            <ul className="space-y-3">
                                {staff.documents.map((doc) => (
                                    <li key={doc.id} className="flex items-center justify-between border-b border-[#ebedf2] pb-2 last:border-0 dark:border-[#1b2e4b]">
                                        <div className="flex items-center gap-2">
                                            <IconFile className="h-4 w-4 shrink-0 text-white-dark" />
                                            <span>{doc.name}</span>
                                        </div>
                                        <span className="text-xs text-white-dark">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="panel">
                        <div className="mb-5 flex items-center gap-2">
                            <IconAward className="shrink-0" />
                            <h5 className="text-lg font-semibold dark:text-white-light">Certificates</h5>
                        </div>
                        {staff.certificates.length === 0 ? (
                            <p className="text-white-dark">No certificates on file.</p>
                        ) : (
                            <ul className="space-y-3">
                                {staff.certificates.map((cert) => (
                                    <li key={cert.id} className="border-b border-[#ebedf2] pb-2 last:border-0 dark:border-[#1b2e4b]">
                                        <h6 className="font-semibold text-[#515365] dark:text-white-dark">{cert.name}</h6>
                                        <p className="text-xs text-white-dark">
                                            {cert.issuedBy} · {new Date(cert.issuedAt).toLocaleDateString()}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentsStaffDetails;
