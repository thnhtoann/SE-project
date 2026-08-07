'use client';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGithub from '@/components/icon/icon-github';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconTwitter from '@/components/icon/icon-twitter';
import { StaffRole } from '@/types/admin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface FormState {
    name: string;
    email: string;
    phone: string;
    role: StaffRole | '';
    branch: string;
    address: string;
    city: string;
    country: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    github: string;
}

const emptyForm: FormState = {
    name: '',
    email: '',
    phone: '',
    role: '',
    branch: '',
    address: '',
    city: '',
    country: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    github: '',
};

const ComponentsStaffAddForm = () => {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(emptyForm);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const changeValue = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm((prev) => ({ ...prev, [id]: value }));
    };

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name) {
            setError('Full name is required.');
            return;
        }
        if (!form.email) {
            setError('Email is required.');
            return;
        }
        if (!form.phone) {
            setError('Phone number is required.');
            return;
        }
        if (!form.role) {
            setError('Role is required.');
            return;
        }
        if (!form.branch) {
            setError('Branch is required.');
            return;
        }

        // No backend yet — this feature is frontend-only for now, so the new
        // staff record isn't persisted into the mock Staff List.
        setSuccess(true);
    };

    if (success) {
        return (
            <div>
                <div className="panel mx-auto mt-10 max-w-lg text-center">
                    <h5 className="mb-2 text-lg font-semibold text-success">Staff account created</h5>
                    <p className="text-white-dark">{form.name} has been added as a {form.role} at {form.branch}.</p>
                    <Link href="/staff" className="btn btn-primary mt-6">
                        Back to Staff List
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/staff" className="text-primary hover:underline">
                        Staff
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Add Staff</span>
                </li>
            </ul>

            <div className="pt-5">
                {error && <div className="mb-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{error}</div>}

                <form onSubmit={submitForm}>
                    <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                        <h6 className="mb-5 text-lg font-bold">General Information</h6>
                        <div className="flex flex-col sm:flex-row">
                            <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                                <img src="/assets/images/user-profile.jpeg" alt="staff photo preview" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32" />
                                <input id="photo" type="file" accept="image/*" className="form-input mt-3 p-1 text-xs" />
                            </div>
                            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="name">Full Name</label>
                                    <input id="name" type="text" placeholder="Enter full name" className="form-input" value={form.name} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="role">Role</label>
                                    <select id="role" className="form-select" value={form.role} onChange={changeValue} required>
                                        <option value="">Select a role</option>
                                        <option value="Cashier">Cashier</option>
                                        <option value="Store Manager">Store Manager</option>
                                        <option value="Chain Manager">Chain Manager</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="branch">Branch</label>
                                    <input id="branch" type="text" placeholder="e.g. District 1 Branch" className="form-input" value={form.branch} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="email">Email</label>
                                    <input id="email" type="email" placeholder="Enter email" className="form-input" value={form.email} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="phone">Phone</label>
                                    <input id="phone" type="text" placeholder="+1 (530) 555-12121" className="form-input" value={form.phone} onChange={changeValue} required />
                                </div>
                                <div>
                                    <label htmlFor="country">Country</label>
                                    <input id="country" type="text" placeholder="Enter country" className="form-input" value={form.country} onChange={changeValue} />
                                </div>
                                <div>
                                    <label htmlFor="city">City</label>
                                    <input id="city" type="text" placeholder="Enter city" className="form-input" value={form.city} onChange={changeValue} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="address">Address</label>
                                    <textarea id="address" rows={2} placeholder="Enter address" className="form-textarea resize-none" value={form.address} onChange={changeValue}></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                        <h6 className="mb-5 text-lg font-bold">Social Links</h6>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconLinkedin className="h-5 w-5" />
                                </div>
                                <input id="linkedin" type="text" placeholder="linkedin handle" className="form-input" value={form.linkedin} onChange={changeValue} />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconTwitter className="h-5 w-5" />
                                </div>
                                <input id="twitter" type="text" placeholder="twitter handle" className="form-input" value={form.twitter} onChange={changeValue} />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconFacebook className="h-5 w-5" />
                                </div>
                                <input id="facebook" type="text" placeholder="facebook handle" className="form-input" value={form.facebook} onChange={changeValue} />
                            </div>
                            <div className="flex">
                                <div className="flex items-center justify-center rounded bg-[#eee] px-3 font-semibold ltr:mr-2 rtl:ml-2 dark:bg-[#1b2e4b]">
                                    <IconGithub />
                                </div>
                                <input id="github" type="text" placeholder="github handle" className="form-input" value={form.github} onChange={changeValue} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4">
                        <Link href="/staff" className="btn btn-outline-danger">
                            Cancel
                        </Link>
                        <button type="submit" className="btn btn-primary">
                            Add Staff
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComponentsStaffAddForm;
