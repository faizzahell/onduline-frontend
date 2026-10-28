import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Eye,
  Inbox,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';

import { useAuth } from '../../../hooks/useAuth';
import { isSuperAdministrator } from '../../../utils/rbac.utils';
import { expenseApi, type PendingApprovalStep } from '../api/expense.api';
import {
  claimStatusClass,
  claimStatusLabel,
  formatCurrency,
  formatDate,
  stepTypeLabel,
} from '../expense.format';

/** A claim row flagged for deletion, kept for the confirmation modal. */
interface DeletionTarget {
  claimId: string;
  claimNumber: string;
  submitter: string;
}

export default function ApprovalInboxPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<DeletionTarget | null>(null);

  // Deleting a claim also wipes the submitter's expense data, so it is limited
  // to the two administrator roles.
  const canDelete =
    isSuperAdministrator(user) ||
    (user?.roles.includes('ADMINISTRATOR') ?? false);

  const {
    data: steps = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: expenseApi.listPendingApprovals,
    refetchInterval: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (claimId: string) => expenseApi.deleteClaim(claimId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['my-claims'] });
      setToDelete(null);
      setError(null);
    },
    onError: (mutationError: Error) => {
      setToDelete(null);
      setError(mutationError.message);
    },
  });

  const isClaimStep = (
    step: PendingApprovalStep,
  ): step is PendingApprovalStep & {
    claim: NonNullable<PendingApprovalStep['claim']>;
  } => step.claim !== null;

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Awaiting Your Action
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Documents whose active approval step is assigned to you, either as
            the position holder or as the role holder. Open a document to review
            it and act on its step.
          </p>
        </div>

        {isFetching && !isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-slate-300 shrink-0 mt-1" />
        )}
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

      {isLoading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" />
        </div>
      ) : steps.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
          <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-600">
            There are no documents awaiting your action.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Step</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {steps.map((step) => {
                  const document =
                    step.claim ?? step.pettyCashBatch ?? step.cashAdvance;

                  if (!document) {
                    return null;
                  }

                  const claimStep = isClaimStep(step);

                  const number =
                    step.claim?.claimNumber ??
                    step.pettyCashBatch?.batchNumber ??
                    step.cashAdvance?.advanceNumber ??
                    '-';

                  const amount =
                    step.claim?.submittedAmount ??
                    step.pettyCashBatch?.totalAmount ??
                    step.cashAdvance?.amount;

                  const submitter =
                    step.claim?.employee.name ??
                    step.cashAdvance?.type ??
                    'Petty Cash';

                  return (
                    <tr
                      key={step.id}
                      className="hover:bg-slate-50/50 align-middle"
                    >
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-800">
                        {number}
                      </td>
                      <td className="py-3 px-4">{submitter}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {step.claim
                          ? `${formatDate(step.claim.periodStart)} — ${formatDate(step.claim.periodEnd)}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                        {formatCurrency(amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-[10px]">
                          {stepTypeLabel(step.stepType)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border font-bold text-[10px] ${claimStatusClass(document.status)}`}
                        >
                          {claimStatusLabel(document.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {claimStep ? (
                            <Link
                              to={`/expense/claims/${step.claim.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-50 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Link>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Open the document
                            </span>
                          )}

                          {claimStep && canDelete && (
                            <button
                              type="button"
                              aria-label={`Delete ${number}`}
                              title="Delete the claim and the submitter's expense data"
                              onClick={() =>
                                setToDelete({
                                  claimId: step.claim.id,
                                  claimNumber: number,
                                  submitter,
                                })
                              }
                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Delete expense data
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-2">
              <p className="font-bold">This cannot be undone.</p>
              <p>
                Deleting claim{' '}
                <span className="font-bold">{toDelete.claimNumber}</span> also
                removes <span className="font-bold">all expense data</span>{' '}
                recorded by{' '}
                <span className="font-bold">{toDelete.submitter}</span> in this
                company: every expense entry and attachment, their claims, and
                any related OCR jobs and draft journals.
              </p>
            </div>

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
                onClick={() => deleteMutation.mutate(toDelete.claimId)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
