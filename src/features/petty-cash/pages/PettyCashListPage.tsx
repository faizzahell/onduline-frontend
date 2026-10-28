import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Plus, Trash2, Wallet, X } from 'lucide-react';

import { CustomSelect } from '../../../components/ui/CustomSelect';
import { useAuth } from '../../../hooks/useAuth';
import { hasPermission } from '../../../utils/rbac.utils';
import { expenseApi } from '../../expense/api/expense.api';
import { formatCurrency, formatDate } from '../../expense/expense.format';
import {
  pettyCashApi,
  pettyCashCategories,
  type CreatePettyCashBatchInput,
  type PettyCashEntryInput,
} from '../api/pettyCash.api';
import {
  pettyCashStatusClass,
  pettyCashStatusLabel,
} from '../pettyCash.format';

const today = () => new Date().toISOString().slice(0, 10);

function emptyLine(): PettyCashEntryInput {
  return { expenseDate: today(), categoryId: '', description: '', amount: 0 };
}

export default function PettyCashListPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canCreate = hasPermission(user, ['ADMINISTRATOR'], ['pettycash:entry']);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(today());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [lines, setLines] = useState<PettyCashEntryInput[]>([emptyLine()]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['petty-cash-batches'],
    queryFn: () => pettyCashApi.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseApi.getCategories,
    enabled: canCreate,
  });

  // Dimension helpers are optional, so the fetch is best-effort: if the role
  // cannot read them the batch can still be created with the codes left blank.
  const { data: areaCodes = [] } = useQuery({
    queryKey: ['dimensions', 'area-codes'],
    queryFn: () => expenseApi.getDimension('area-codes'),
    enabled: canCreate,
    retry: false,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['dimensions', 'departments'],
    queryFn: () => expenseApi.getDimension('departments'),
    enabled: canCreate,
    retry: false,
  });

  const categoryOptions = useMemo(
    () =>
      pettyCashCategories(categories).map((category) => ({
        value: category.id,
        label: category.name,
        sublabel: category.pettyCashCode
          ? `${category.code} · PC ${category.pettyCashCode}`
          : category.code,
      })),
    [categories],
  );

  const createMutation = useMutation({
    mutationFn: (input: CreatePettyCashBatchInput) =>
      pettyCashApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['petty-cash-batches'] });
      closeModal();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const total = lines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0,
  );

  const openModal = () => {
    setPeriodStart(today());
    setPeriodEnd(today());
    setLines([emptyLine()]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const updateLine = <K extends keyof PettyCashEntryInput>(
    index: number,
    key: K,
    value: PettyCashEntryInput[K],
  ) => {
    setLines((previous) =>
      previous.map((line, i) =>
        i === index ? { ...line, [key]: value } : line,
      ),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const cleaned = lines.filter(
      (line) => line.categoryId && line.description.trim() && line.amount > 0,
    );

    if (cleaned.length === 0) {
      setFormError(
        'Add at least one line with a category, a description, and an amount.',
      );
      return;
    }

    if (new Date(periodEnd) < new Date(periodStart)) {
      setFormError('The period end cannot be earlier than the start.');
      return;
    }

    createMutation.mutate({
      periodStart,
      periodEnd,
      entries: cleaned.map((line) => ({
        ...line,
        amount: Number(line.amount),
        areaCode: line.areaCode || undefined,
        departmentCode: line.departmentCode || undefined,
        employeeCode: line.employeeCode || undefined,
      })),
    });
  };

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D32F2F] border border-red-100 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Petty Cash</h1>
            <p className="text-xs text-slate-500 mt-1">
              Record a batch of small cash expenses at once, then submit it for
              approval and posting to Business Central.
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New batch
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Batches</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" />
          </div>
        ) : batches.length === 0 ? (
          <p className="p-12 text-center text-xs text-slate-400">
            No petty cash batches yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Batch No.</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-center">Lines</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {formatDate(batch.periodStart)} —{' '}
                      {formatDate(batch.periodEnd)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {batch._count?.entries ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(batch.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border font-bold text-[10px] ${pettyCashStatusClass(batch.status)}`}
                      >
                        {pettyCashStatusLabel(batch.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/expense/petty-cash/${batch.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-50 transition"
                      >
                        View
                      </Link>
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
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                New petty cash batch
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-4 text-xs"
            >
              {formError && (
                <p
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Period start
                  </label>
                  <input
                    type="date"
                    required
                    value={periodStart}
                    onChange={(event) => setPeriodStart(event.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Period end
                  </label>
                  <input
                    type="date"
                    required
                    value={periodEnd}
                    onChange={(event) => setPeriodEnd(event.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Lines ({lines.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => [...prev, emptyLine()])}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add line
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Line {index + 1}
                        </span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove line ${index + 1}`}
                            onClick={() =>
                              setLines((prev) =>
                                prev.filter((_, i) => i !== index),
                              )
                            }
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-600">
                            Date
                          </label>
                          <input
                            type="date"
                            required
                            value={line.expenseDate}
                            onChange={(event) =>
                              updateLine(
                                index,
                                'expenseDate',
                                event.target.value,
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-600">
                            Category
                          </label>
                          <CustomSelect
                            className="w-full"
                            aria-label={`Category for line ${index + 1}`}
                            options={categoryOptions}
                            value={line.categoryId}
                            onChange={(value) =>
                              updateLine(index, 'categoryId', value)
                            }
                            placeholder="Select a category..."
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-slate-600">
                          Description
                        </label>
                        <input
                          type="text"
                          required
                          value={line.description}
                          onChange={(event) =>
                            updateLine(index, 'description', event.target.value)
                          }
                          placeholder="e.g. Stamp duty, drinking water"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-600">
                            Amount
                          </label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={line.amount || ''}
                            onChange={(event) =>
                              updateLine(
                                index,
                                'amount',
                                Number(event.target.value),
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none bg-white font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-600">
                            Area
                          </label>
                          <CodeSelect
                            value={line.areaCode ?? ''}
                            options={areaCodes}
                            onChange={(value) =>
                              updateLine(index, 'areaCode', value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-600">
                            Department
                          </label>
                          <CodeSelect
                            value={line.departmentCode ?? ''}
                            options={departments}
                            onChange={(value) =>
                              updateLine(index, 'departmentCode', value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block font-semibold text-slate-600">
                            Employee
                          </label>
                          <input
                            type="text"
                            value={line.employeeCode ?? ''}
                            onChange={(event) =>
                              updateLine(
                                index,
                                'employeeCode',
                                event.target.value,
                              )
                            }
                            placeholder="Code"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Total:{' '}
                <span className="font-bold text-slate-900">
                  {formatCurrency(total)}
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A plain native select for the optional BC dimension codes. It falls back to
 * "no option" gracefully when the dimension list could not be loaded.
 */
function CodeSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; code: string; name: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none bg-white"
    >
      <option value="">—</option>
      {options.map((option) => (
        <option key={option.id} value={option.code}>
          {option.code}
        </option>
      ))}
    </select>
  );
}
