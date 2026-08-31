'use client';
import AdminTable, { AdminTableColumn } from '@/components/datatable/admin-table';
import IconEdit from '@/components/icon/icon-edit';
import IconPlus from '@/components/icon/icon-plus';
import IconSearch from '@/components/icon/icon-search';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconX from '@/components/icon/icon-x';
import { SUPPLIERS } from '@/data/mock-products';
import { getTranslation } from '@/i18n';
import { Supplier } from '@/types/admin';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { ChangeEvent, Fragment, FormEvent, useCallback, useMemo, useState } from 'react';

interface SupplierFormState {
    supplier_name: string;
    contact_phone: string;
    email: string;
    address: string;
}

const emptyForm: SupplierFormState = { supplier_name: '', contact_phone: '', email: '', address: '' };

const ComponentsProcurementSuppliers = () => {
    const { t } = getTranslation();
    const [suppliers, setSuppliers] = useState<Supplier[]>(SUPPLIERS);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<SupplierFormState>(emptyForm);
    const [error, setError] = useState('');

    const filtered = suppliers.filter(
        (s) =>
            s.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase()) ||
            s.contact_phone.includes(search),
    );

    const openAddModal = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    };

    const openEditModal = useCallback((supplier: Supplier) => {
        setEditingId(supplier.supplier_id);
        setForm({
            supplier_name: supplier.supplier_name,
            contact_phone: supplier.contact_phone,
            email: supplier.email,
            address: supplier.address,
        });
        setError('');
        setModalOpen(true);
    }, []);

    const closeModal = () => setModalOpen(false);

    const changeValue = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm((prev) => ({ ...prev, [id]: value }));
    };

    const deleteSupplier = useCallback(
        (id: number) => {
            if (window.confirm(t('confirm_delete_supplier'))) {
                setSuppliers((prev) => prev.filter((s) => s.supplier_id !== id));
            }
        },
        [t],
    );

    const submitForm = (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.supplier_name.trim()) {
            setError(t('error_supplier_name_required'));
            return;
        }
        if (!form.contact_phone.trim()) {
            setError(t('error_phone_required'));
            return;
        }
        if (!form.email.trim()) {
            setError(t('error_email_required'));
            return;
        }
        if (!form.address.trim()) {
            setError(t('error_address_required'));
            return;
        }

        if (editingId !== null) {
            setSuppliers((prev) => prev.map((s) => (s.supplier_id === editingId ? { ...s, ...form } : s)));
        } else {
            const nextId = suppliers.reduce((max, s) => Math.max(max, s.supplier_id), 0) + 1;
            setSuppliers((prev) => [...prev, { supplier_id: nextId, ...form }]);
        }
        setModalOpen(false);
    };

    const columns: AdminTableColumn<Supplier>[] = useMemo(
        () => [
            {
                key: 'name',
                header: t('supplier_name'),
                sortable: true,
                sortValue: (s) => s.supplier_name,
                render: (s) => <span className="font-semibold">{s.supplier_name}</span>,
            },
            { key: 'phone', header: t('phone'), sortable: true, sortValue: (s) => s.contact_phone, render: (s) => <span dir="ltr">{s.contact_phone}</span> },
            { key: 'email', header: t('email'), sortable: true, sortValue: (s) => s.email, render: (s) => s.email },
            { key: 'address', header: t('address'), render: (s) => <span className="text-white-dark">{s.address}</span> },
            {
                key: 'actions',
                header: t('actions'),
                align: 'center',
                render: (s) => (
                    <div className="mx-auto flex w-max items-center gap-4">
                        <button type="button" className="flex hover:text-info" onClick={() => openEditModal(s)} title={t('edit')}>
                            <IconEdit className="h-4.5 w-4.5" />
                        </button>
                        <button type="button" className="flex hover:text-danger" onClick={() => deleteSupplier(s.supplier_id)} title={t('delete')}>
                            <IconTrashLines />
                        </button>
                    </div>
                ),
            },
        ],
        [t, openEditModal, deleteSupplier],
    );

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <span>{t('admin_portal')}</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('suppliers')}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="panel">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-xl">{t('supplier_list')}</h2>
                        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                            <button type="button" className="btn btn-primary gap-2" onClick={openAddModal}>
                                <IconPlus />
                                {t('add_supplier')}
                            </button>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('search_suppliers_placeholder')}
                                    className="peer form-input py-2 ltr:pr-11 rtl:pl-11"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <span className="absolute top-1/2 -translate-y-1/2 peer-focus:text-primary ltr:right-[11px] rtl:left-[11px]">
                                    <IconSearch className="mx-auto" />
                                </span>
                            </div>
                        </div>
                    </div>

                    <AdminTable columns={columns} rows={filtered} rowKey={(s) => s.supplier_id} emptyMessage={t('no_suppliers_found')} />
                </div>
            </div>

            <Transition appear show={modalOpen} as={Fragment}>
                <Dialog as="div" open={modalOpen} onClose={closeModal}>
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-[black]/60" />
                    </TransitionChild>
                    <div className="fixed inset-0 z-[999] overflow-y-auto">
                        <div className="flex min-h-screen items-start justify-center px-4 py-8">
                            <TransitionChild
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <DialogPanel as="div" className="panel my-8 w-full max-w-lg overflow-hidden rounded-lg border-0 p-0 text-black dark:text-white-dark">
                                    <div className="flex items-center justify-between bg-[#fbfbfb] px-5 py-3 dark:bg-[#121c2c]">
                                        <div className="text-lg font-bold">{editingId !== null ? t('edit_supplier') : t('add_supplier')}</div>
                                        <button type="button" className="text-white-dark hover:text-dark" onClick={closeModal}>
                                            <IconX />
                                        </button>
                                    </div>

                                    <form onSubmit={submitForm} className="p-5">
                                        {error && <div className="mb-5 rounded border border-danger bg-danger-light px-4 py-3 text-danger">{error}</div>}

                                        <div className="mb-4">
                                            <label htmlFor="supplier_name">{t('supplier_name')}</label>
                                            <input
                                                id="supplier_name"
                                                type="text"
                                                placeholder={t('enter_supplier_name')}
                                                className="form-input"
                                                value={form.supplier_name}
                                                onChange={changeValue}
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="contact_phone">{t('phone')}</label>
                                            <input
                                                id="contact_phone"
                                                type="text"
                                                placeholder={t('enter_phone')}
                                                className="form-input"
                                                value={form.contact_phone}
                                                onChange={changeValue}
                                            />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="email">{t('email')}</label>
                                            <input id="email" type="email" placeholder={t('enter_email')} className="form-input" value={form.email} onChange={changeValue} />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="address">{t('address')}</label>
                                            <textarea
                                                id="address"
                                                rows={2}
                                                placeholder={t('enter_address')}
                                                className="form-textarea resize-none"
                                                value={form.address}
                                                onChange={changeValue}
                                            ></textarea>
                                        </div>

                                        <div className="flex items-center justify-end gap-4">
                                            <button type="button" className="btn btn-outline-danger" onClick={closeModal}>
                                                {t('cancel')}
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                {editingId !== null ? t('save_changes') : t('add_supplier')}
                                            </button>
                                        </div>
                                    </form>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default ComponentsProcurementSuppliers;
