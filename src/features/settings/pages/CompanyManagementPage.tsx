import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import {
  companiesApi,
  type CompanySettings,
  type CreateCompanyInput,
} from '../../companies/api/companies.api';

interface FormState {
  code: string;
  name: string;
  currency: string;
  journalInitials: string;
  pettyCashJournalInitials: string;
  bankAccountNo: string;
  bankAccountName: string;
}

const emptyForm: FormState = {
  code: '',
  name: '',
  currency: 'IDR',
  journalInitials: 'IS',
  pettyCashJournalInitials: 'RE',
  bankAccountNo: '',
  bankAccountName: '',
};

export default function CompanyManagementPage() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompanySettings | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CompanySettings | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: companiesApi.listSettings,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    void queryClient.invalidateQueries({ queryKey: ['accessible-companies'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: CreateCompanyInput = {
        code: form.code.trim(),
        name: form.name.trim(),
        currency: form.currency.trim() || 'IDR',
        journalInitials: form.journalInitials.trim() || 'IS',
        pettyCashJournalInitials: form.pettyCashJournalInitials.trim() || 'RE',
        bankAccountNo: form.bankAccountNo.trim() || undefined,
        bankAccountName: form.bankAccountName.trim() || undefined,
      };

      return editing
        ? companiesApi.update(editing.id, {
            name: payload.name,
            currency: payload.currency,
            journalInitials: payload.journalInitials,
            pettyCashJournalInitials: payload.pettyCashJournalInitials,
            bankAccountNo: form.bankAccountNo.trim(),
            bankAccountName: form.bankAccountName.trim(),
          })
        : companiesApi.create(payload);
    },
    onSuccess: () => {
      invalidate();
      setIsModalOpen(false);
    },
    onError: (error: Error) => setFormError(toMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companiesApi.remove(id),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
    },
    onError: (error: Error) => setDeleteError(toMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (company: CompanySettings) => {
    setEditing(company);
    setForm({
      code: company.code,
      name: company.name,
      currency: company.currency,
      journalInitials: company.journalInitials,
      pettyCashJournalInitials: company.pettyCashJournalInitials,
      bankAccountNo: company.bankAccountNo ?? '',
      bankAccountName: company.bankAccountName ?? '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const update = (key: keyof FormState, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Company Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Add, edit, and remove the legal entities the portal serves. A new
            company starts with the standard categories, dimensions, and
            approval matrix.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New company
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" />
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No companies yet.</p>
            <p>Create your first company to start using the portal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Company</th>
                  <th className="py-3.5 px-6">Currency</th>
                  <th className="py-3.5 px-6">Journal</th>
                  <th className="py-3.5 px-6">Bank account</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 text-[11px] font-bold">
                          {company.code}
                        </div>
                        <span className="font-bold text-slate-900">
                          {company.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {company.currency}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {company.journalInitials} /{' '}
                      {company.pettyCashJournalInitials}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {company.bankAccountNo ? (
                        <span>
                          {company.bankAccountNo}
                          {company.bankAccountName
                            ? ` · ${company.bankAccountName}`
                            : ''}
                        </span>
                      ) : (
                        <span className="text-slate-300">not set</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          company.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {company.isActive ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          aria-label={`Edit ${company.code}`}
                          onClick={() => openEdit(company)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${company.code}`}
                          onClick={() => {
                            setToDelete(company);
                            setDeleteError(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editing ? 'Edit company' : 'New company'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setFormError(null);
                saveMutation.mutate();
              }}
              className="p-5 space-y-4 text-xs"
            >
              {formError && (
                <p className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Code
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editing)}
                    value={form.code}
                    onChange={(e) =>
                      update('code', e.target.value.toUpperCase())
                    }
                    placeholder="OI"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="PT Onduline Indonesia"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={(e) => update('currency', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Journal initials
                  </label>
                  <input
                    type="text"
                    value={form.journalInitials}
                    onChange={(e) => update('journalInitials', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Petty cash initials
                  </label>
                  <input
                    type="text"
                    value={form.pettyCashJournalInitials}
                    onChange={(e) =>
                      update('pettyCashJournalInitials', e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Bank account no.
                  </label>
                  <input
                    type="text"
                    value={form.bankAccountNo}
                    onChange={(e) => update('bankAccountNo', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Bank account name
                  </label>
                  <input
                    type="text"
                    value={form.bankAccountName}
                    onChange={(e) => update('bankAccountName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold disabled:opacity-50"
                >
                  {saveMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {editing ? 'Save changes' : 'Create company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Delete company
            </h3>

            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-2">
              <p className="font-bold">This cannot be undone.</p>
              <p>
                Deleting <span className="font-bold">{toDelete.name}</span>{' '}
                removes the company together with every invoice, expense, petty
                cash, master data, and user access tied to it.
              </p>
            </div>

            {deleteError && (
              <p className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(toDelete.id)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: unknown } } })
    .response;
  const message = response?.data?.message;

  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return error instanceof Error ? error.message : 'Something went wrong';
}
