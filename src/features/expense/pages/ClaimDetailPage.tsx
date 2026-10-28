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
  Pencil,
  RotateCcw,
} from 'lucide-react';

import { useAuth } from '../../../hooks/useAuth';
import { expenseApi } from '../api/expense.api';
import {
  claimStatusClass,
  claimStatusLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  stepTypeLabel,
} from '../expense.format';

type ClaimAction = 'accrue' | 'review' | 'approve' | 'post' | 'resubmit';

const ACTION_PERMISSION: Record<ClaimAction, string[]> = {
  accrue: ['expense:accrue'],
  review: ['expense:approve'],
  approve: ['expense:approve'],
  post: ['expense:post'],
  resubmit: ['expense:entry'],
};

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [revisionRemark, setRevisionRemark] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editRemark, setEditRemark] = useState('');

  const {
    data: claim,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => expenseApi.getClaim(id!),
    enabled: Boolean(id),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['claim', id] });
    void queryClient.invalidateQueries({ queryKey: ['my-claims'] });
    void queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
  };

  const actionMutation = useMutation({
    mutationFn: (action: ClaimAction) => expenseApi.claimAction(id!, action),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const revisionMutation = useMutation({
    mutationFn: () => expenseApi.requestClaimRevision(id!, revisionRemark),
    onSuccess: () => {
      invalidate();
      setRevisionRemark('');
      setError(null);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const reviseAmountMutation = useMutation({
    mutationFn: () =>
      expenseApi.reviseEntryAmount(
        editingEntryId!,
        Number(editAmount),
        editRemark,
      ),
    onSuccess: () => {
      invalidate();
      setEditingEntryId(null);
      setEditRemark('');
      setError(null);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const can = (action: ClaimAction) =>
    user?.roles.includes('ADMINISTRATOR') ||
    ACTION_PERMISSION[action].some((permission) =>
      user?.permissions.includes(permission),
    );

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#D32F2F]" />
      </div>
    );
  }

  if (isError || !claim) {
    return (
      <div className="p-8 m-6 bg-white rounded-2xl border border-slate-100 text-center text-xs">
        <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
        <p className="font-bold text-slate-800">Claim not found.</p>
      </div>
    );
  }

  const pendingStep = claim.approvalSteps.find(
    (step) => step.status === 'PENDING',
  );

  const canRevise = ['SUBMITTED', 'ACCRUED', 'UNDER_REVIEW'].includes(
    claim.status,
  );

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {claim.claimNumber}
              </h1>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full border font-bold text-[10px] ${claimStatusClass(claim.status)}`}
              >
                {claimStatusLabel(claim.status)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {claim.employee.name} ({claim.employee.employeeCode}) · recording
              period {formatDate(claim.periodStart)} —{' '}
              {formatDate(claim.periodEnd)}
            </p>
          </div>
        </div>

        <div className="text-right text-xs">
          <p className="text-slate-500">
            Submitted{' '}
            <span className="font-bold text-slate-800">
              {formatCurrency(claim.submittedAmount)}
            </span>
          </p>
          <p className="text-slate-500">
            Approved{' '}
            <span className="font-bold text-slate-900">
              {formatCurrency(claim.approvedAmount)}
            </span>
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
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              Summary by category
            </h2>
            <ul className="space-y-2">
              {claim.byCategory.map((group) => (
                <li
                  key={group.categoryId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-slate-600 truncate">{group.name}</span>
                  <span className="font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(group.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs text-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3">
              Approval flow
            </h2>
            <ol className="space-y-3">
              {claim.approvalSteps.map((step) => (
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
                      {step.actedAt ? ` · ${formatDateTime(step.actedAt)}` : ''}
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
          </section>

          {claim.journalBatches.length > 0 && (
            <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs text-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3">
                Business Central Journal
              </h2>
              <ul className="space-y-2">
                {claim.journalBatches.map((batch) => (
                  <li
                    key={batch.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="font-mono font-bold text-slate-800">
                      {batch.documentNo}
                    </span>
                    <span className="text-slate-500">{batch.type}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="lg:col-span-8 space-y-4">
          {pendingStep && (
            <section className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-3 text-xs">
              <h2 className="text-sm font-bold text-slate-900">
                Action: {stepTypeLabel(pendingStep.stepType)}
              </h2>

              <div className="flex flex-wrap gap-2">
                {pendingStep.stepType === 'ACCRUE' && can('accrue') && (
                  <ActionButton
                    label="Accrue to BC"
                    pending={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('accrue')}
                  />
                )}
                {pendingStep.stepType === 'REVIEW' && can('review') && (
                  <ActionButton
                    label="Mark as reviewed"
                    pending={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('review')}
                  />
                )}
                {pendingStep.stepType === 'APPROVE' && can('approve') && (
                  <ActionButton
                    label="Approve claim"
                    pending={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('approve')}
                  />
                )}
                {pendingStep.stepType === 'POST' && can('post') && (
                  <ActionButton
                    label="Post payment"
                    pending={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('post')}
                  />
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label
                  className="block font-semibold text-slate-700"
                  htmlFor="revisionRemark"
                >
                  Request a revision from the submitter
                </label>
                <textarea
                  id="revisionRemark"
                  rows={2}
                  value={revisionRemark}
                  onChange={(event) => setRevisionRemark(event.target.value)}
                  placeholder="A revision reason is required"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => revisionMutation.mutate()}
                  disabled={
                    revisionMutation.isPending || revisionRemark.trim() === ''
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Request revision
                </button>
              </div>
            </section>
          )}

          {claim.status === 'REVISION_REQUESTED' && can('resubmit') && (
            <section className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-xs space-y-2">
              <p className="font-bold text-amber-900">
                This claim was returned for correction.
              </p>
              <p className="text-amber-800">
                Correct the requested lines, then submit it again.
              </p>
              <ActionButton
                label="Resubmit"
                pending={actionMutation.isPending}
                onClick={() => actionMutation.mutate('resubmit')}
              />
            </section>
          )}

          <section className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Expense lines ({claim.entries.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Receipt date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Submitted</th>
                    <th className="py-3 px-4 text-right">Approved</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claim.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/50 align-top"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-semibold">
                        {formatDate(entry.expenseDate)}
                      </td>
                      <td className="py-3 px-4">{entry.category.name}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {entry.destination ?? entry.description ?? '-'}
                        {entry.revisions.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {entry.revisions.map((revision) => (
                              <li
                                key={revision.id}
                                className="text-[10px] text-amber-700"
                              >
                                {formatCurrency(revision.previousAmount)} →{' '}
                                {formatCurrency(revision.newAmount)}:{' '}
                                {revision.remark}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(entry.approvedAmount ?? entry.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canRevise && can('approve') && (
                          <button
                            type="button"
                            aria-label="Revise amount"
                            onClick={() => {
                              setEditingEntryId(entry.id);
                              setEditAmount(
                                String(entry.approvedAmount ?? entry.amount),
                              );
                              setEditRemark('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#D32F2F] hover:bg-red-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {editingEntryId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Revise line amount
            </h3>
            <p className="text-slate-500">
              A rejection is a revision, not an outright rejection. The new
              amount may not exceed the submitted amount.
            </p>

            <div className="space-y-1">
              <label
                className="block font-semibold text-slate-700"
                htmlFor="editAmount"
              >
                Approved amount
              </label>
              <input
                id="editAmount"
                type="number"
                min={0}
                value={editAmount}
                onChange={(event) => setEditAmount(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-1">
              <label
                className="block font-semibold text-slate-700"
                htmlFor="editRemark"
              >
                Revision reason (required)
              </label>
              <textarea
                id="editRemark"
                rows={3}
                value={editRemark}
                onChange={(event) => setEditRemark(event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingEntryId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => reviseAmountMutation.mutate()}
                disabled={
                  reviseAmountMutation.isPending || editRemark.trim() === ''
                }
                className="px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                Save revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  pending,
  onClick,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold shadow-sm transition disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Check className="w-4 h-4" />
      )}
      {label}
    </button>
  );
}
