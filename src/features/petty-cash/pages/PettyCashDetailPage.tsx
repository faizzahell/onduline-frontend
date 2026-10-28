import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleDashed,
  Loader2,
  MinusCircle,
  Paperclip,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';

import { useAuth } from '../../../hooks/useAuth';
import { hasPermission } from '../../../utils/rbac.utils';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  stepTypeLabel,
} from '../../expense/expense.format';
import { pettyCashApi, type PettyCashBatch } from '../api/pettyCash.api';
import {
  pettyCashStatusClass,
  pettyCashStatusLabel,
} from '../pettyCash.format';

export default function PettyCashDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionRemark, setRevisionRemark] = useState('');

  const {
    data: batch,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['petty-cash-batch', id],
    queryFn: () => pettyCashApi.getById(id!),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['petty-cash-batch', id] });
    void queryClient.invalidateQueries({ queryKey: ['petty-cash-batches'] });
  };

  const actionMutation = useMutation({
    mutationFn: (action: 'submit' | 'approve' | 'post') =>
      pettyCashApi[action](id!),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const revisionMutation = useMutation({
    mutationFn: () => pettyCashApi.requestRevision(id!, revisionRemark),
    onSuccess: () => {
      invalidate();
      setRevisionOpen(false);
      setRevisionRemark('');
      setError(null);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const canEntry = hasPermission(user, ['ADMINISTRATOR'], ['pettycash:entry']);
  const canApprove = hasPermission(
    user,
    ['ADMINISTRATOR'],
    ['pettycash:approve'],
  );
  const canPost = hasPermission(user, ['ADMINISTRATOR'], ['pettycash:post']);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#D32F2F]" />
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="p-8 m-6 bg-white rounded-2xl border border-slate-100 text-center text-xs">
        <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
        <p className="font-bold text-slate-800">Batch not found.</p>
      </div>
    );
  }

  const canSubmit = canEntry && isEditable(batch);
  const canApproveNow = canApprove && batch.status === 'SUBMITTED';
  const canRevise = canApprove && batch.status === 'SUBMITTED';
  const canPostNow = canPost && batch.status === 'APPROVED';

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/expense/petty-cash')}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {batch.batchNumber}
              </h1>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full border font-bold text-[10px] ${pettyCashStatusClass(batch.status)}`}
              >
                {pettyCashStatusLabel(batch.status)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Period {formatDate(batch.periodStart)} —{' '}
              {formatDate(batch.periodEnd)}
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <p className="text-slate-500">Total</p>
          <p className="text-lg font-bold text-slate-900">
            {formatCurrency(batch.totalAmount)}
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4">
          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs text-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Actions</h2>

            {!canSubmit &&
              !canApproveNow &&
              !canRevise &&
              !canPostNow &&
              batch.status !== 'POSTED' && (
                <p className="text-slate-400">
                  Nothing to do on this batch right now.
                </p>
              )}

            <div className="flex flex-wrap gap-2">
              {canSubmit && (
                <ActionButton
                  label="Submit"
                  icon={Send}
                  pending={actionMutation.isPending}
                  onClick={() => actionMutation.mutate('submit')}
                />
              )}
              {canApproveNow && (
                <ActionButton
                  label="Approve"
                  icon={Check}
                  pending={actionMutation.isPending}
                  onClick={() => actionMutation.mutate('approve')}
                />
              )}
              {canPostNow && (
                <ActionButton
                  label="Post to BC"
                  icon={Check}
                  pending={actionMutation.isPending}
                  onClick={() => actionMutation.mutate('post')}
                />
              )}
              {canRevise && (
                <button
                  type="button"
                  onClick={() => {
                    setRevisionOpen(true);
                    setRevisionRemark('');
                    setError(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Request revision
                </button>
              )}
            </div>

            {batch.status === 'POSTED' && (
              <p className="mt-2 text-emerald-700 font-semibold">
                This batch has been posted and is now closed.
              </p>
            )}
          </section>

          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs text-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              Approval flow
            </h2>
            {batch.approvalSteps.length === 0 ? (
              <p className="text-slate-400">
                Steps appear once the batch is submitted.
              </p>
            ) : (
              <ol className="space-y-3">
                {batch.approvalSteps.map((step) => (
                  <li key={step.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5">
                      {step.status === 'APPROVED' ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : step.status === 'REVISION_REQUESTED' ? (
                        <RotateCcw className="w-4 h-4 text-red-600" />
                      ) : step.status === 'SKIPPED' ? (
                        <MinusCircle className="w-4 h-4 text-slate-300" />
                      ) : (
                        <CircleDashed className="w-4 h-4 text-amber-500" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">
                        {stepTypeLabel(step.stepType)}
                        {step.label ? ` · ${step.label}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {step.assignedEmployee?.name ??
                          step.assignedRoleName ??
                          'Not yet assigned'}
                        {step.actedAt
                          ? ` · ${formatDateTime(step.actedAt)}`
                          : ''}
                      </p>
                      {step.remark && (
                        <p className="text-[11px] text-slate-600 mt-0.5 italic">
                          “{step.remark}”
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {batch.journalBatches.length > 0 && (
            <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs text-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3">
                Business Central Journal
              </h2>
              <ul className="space-y-2">
                {batch.journalBatches.map((journal) => (
                  <li
                    key={journal.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="font-mono font-bold text-slate-800">
                      {journal.documentNo}
                    </span>
                    <span className="text-slate-500">{journal.type}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="lg:col-span-8">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Lines ({batch.entries.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Dimensions</th>
                    <th className="py-3 px-4 text-center">Proof</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batch.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/50 align-top"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                        {formatDate(entry.expenseDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="block text-slate-800">
                          {entry.category.name}
                        </span>
                        {entry.category.pettyCashCode && (
                          <span className="text-[10px] text-slate-400">
                            PC {entry.category.pettyCashCode} ·{' '}
                            {entry.category.glAccountNo ?? 'no GL'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {[
                          entry.areaCode,
                          entry.departmentCode,
                          entry.employeeCode,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {entry.attachments.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Paperclip className="w-3 h-3" />
                            {entry.attachments.length}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-100 bg-slate-50/60">
                    <td
                      colSpan={5}
                      className="py-3 px-4 text-right font-bold text-slate-600"
                    >
                      Total
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(batch.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      </div>

      {revisionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Request a revision
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setRevisionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-500">
              The batch goes back to the submitter for correction. A reason is
              required.
            </p>

            <textarea
              rows={3}
              value={revisionRemark}
              onChange={(event) => setRevisionRemark(event.target.value)}
              placeholder="Explain what needs to be corrected"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevisionOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => revisionMutation.mutate()}
                disabled={
                  revisionMutation.isPending || revisionRemark.trim() === ''
                }
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                {revisionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Request revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isEditable(batch: PettyCashBatch): boolean {
  return batch.status === 'DRAFT' || batch.status === 'REVISION_REQUESTED';
}

function ActionButton({
  label,
  icon: Icon,
  pending,
  onClick,
}: {
  label: string;
  icon: typeof Check;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold shadow-sm transition disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
