import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarRange, Loader2, Send } from 'lucide-react';

import { expenseApi } from '../api/expense.api';
import {
  claimStatusClass,
  claimStatusLabel,
  formatCurrency,
  formatDate,
} from '../expense.format';

/** The default period follows the habit of submitting before the 20th. */
function defaultPeriod() {
  const today = new Date();
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 20),
  );
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 21),
  );

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function MyClaimsPage() {
  const queryClient = useQueryClient();
  const initial = defaultPeriod();

  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);
  const [error, setError] = useState<string | null>(null);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['my-claims'],
    queryFn: expenseApi.listMyClaims,
  });

  const { data: preview, isFetching: isPreviewing } = useQuery({
    queryKey: ['claim-preview', periodStart, periodEnd],
    queryFn: () => expenseApi.previewClaim(periodStart, periodEnd),
    enabled: Boolean(periodStart && periodEnd),
  });

  const submitMutation = useMutation({
    mutationFn: () => expenseApi.submitClaim(periodStart, periodEnd),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-claims'] });
      void queryClient.invalidateQueries({ queryKey: ['my-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['claim-preview'] });
      setError(null);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">My Claims</h1>
        <p className="text-xs text-slate-500 mt-1">
          A claim picks up every line that has never been claimed and was{' '}
          <strong>recorded</strong> within the selected date range.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <CalendarRange className="w-4 h-4 text-[#D32F2F]" />
          <span>Submit a new claim</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              className="block font-semibold text-slate-700"
              htmlFor="periodStart"
            >
              From recording date
            </label>
            <input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label
              className="block font-semibold text-slate-700"
              htmlFor="periodEnd"
            >
              To recording date
            </label>
            <input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => submitMutation.mutate()}
              disabled={
                submitMutation.isPending || !preview || preview.entryCount === 0
              }
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold shadow-sm transition disabled:opacity-50"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit claim
            </button>
          </div>
        </div>

        {isPreviewing ? (
          <p className="text-slate-400">Calculating preview...</p>
        ) : preview ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <p className="font-bold text-slate-800">
              {preview.entryCount} lines will be claimed, totalling{' '}
              {formatCurrency(preview.totalAmount)}
            </p>

            {preview.byCategory.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {preview.byCategory.map((group) => (
                  <li
                    key={group.categoryId}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100"
                  >
                    <span className="truncate text-slate-600">
                      {group.name}
                    </span>
                    <span className="font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(group.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {preview.entryCount === 0 && (
              <p className="text-slate-500">
                No lines were recorded within this range.
              </p>
            )}
          </div>
        ) : null}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Claim history</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" />
          </div>
        ) : claims.length === 0 ? (
          <p className="p-12 text-center text-xs text-slate-400">
            No claims have been submitted yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Claim No.</th>
                  <th className="py-3 px-4">Recording period</th>
                  <th className="py-3 px-4 text-center">Lines</th>
                  <th className="py-3 px-4 text-right">Submitted</th>
                  <th className="py-3 px-4 text-right">Approved</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Link
                        to={`/expense/claims/${claim.id}`}
                        className="font-bold text-[#D32F2F] hover:underline"
                      >
                        {claim.claimNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {formatDate(claim.periodStart)} —{' '}
                      {formatDate(claim.periodEnd)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {claim._count?.entries ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                      {formatCurrency(claim.submittedAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(claim.approvedAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full border font-bold text-[10px] ${claimStatusClass(claim.status)}`}
                      >
                        {claimStatusLabel(claim.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
