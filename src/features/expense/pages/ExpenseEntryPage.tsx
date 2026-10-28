import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Keyboard,
  Loader2,
  Paperclip,
  Plus,
  Receipt,
  ScanLine,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import { useCompany } from '../../../hooks/useCompany';
import {
  expenseApi,
  type CreateEntryInput,
  type ExpenseEntryStatus,
  type ExpenseOcrJob,
} from '../api/expense.api';
import { ManualExpenseFormFields } from '../components/ManualExpenseForm';
import { formatCurrency, formatDate } from '../expense.format';

const emptyForm: CreateEntryInput = {
  categoryId: '',
  expenseDate: new Date().toISOString().slice(0, 10),
};

const ACCEPTED = 'application/pdf,image/jpeg,image/png,image/webp,image/heic';

export default function ExpenseEntryPage() {
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  const [form, setForm] = useState<CreateEntryInput>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manual entry is the default; OCR is an explicit choice.
  const [mode, setMode] = useState<'manual' | 'ocr'>('manual');
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savedFromOcr, setSavedFromOcr] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseApi.getCategories,
  });

  const { data: marketingCodes = [] } = useQuery({
    queryKey: ['marketing-codes'],
    queryFn: expenseApi.getMarketingCodes,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['my-entries', 'unclaimed'],
    queryFn: () => expenseApi.listMyEntries(true),
  });

  // OCR is only available when a super administrator enabled it for this
  // company. Without it, every entry is filled in manually.
  const ocrAvailable = activeCompany?.ocrExpenseEnabled ?? false;

  const ocrMutation = useMutation({
    mutationFn: (uploaded: File[]) => expenseApi.createOcrJobs(uploaded),
    onSuccess: (jobs) => {
      setJobIds((previous) => [...jobs.map((job) => job.id), ...previous]);
      setError(null);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const selected = categories.find(
    (category) => category.id === form.categoryId,
  );

  const createMutation = useMutation({
    mutationFn: () => expenseApi.createEntry(form, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-entries'] });
      setForm({ ...emptyForm, categoryId: form.categoryId });
      setFiles([]);
      setError(null);
      setSuccess('Expense line recorded');
    },
    onError: (mutationError: Error) => {
      setSuccess(null);
      setError(mutationError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.deleteEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-entries'] });
    },
  });

  const update = useCallback(
    <K extends keyof CreateEntryInput>(key: K, value: CreateEntryInput[K]) => {
      setForm((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const uploadForOcr = (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (picked.length > 0) {
      ocrMutation.mutate(picked);
    }
  };

  const unclaimedTotal = entries.reduce(
    (total, entry) => total + Number(entry.amount),
    0,
  );

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">
            {mode === 'manual' ? 'Record Expense' : 'Scan Receipt'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'manual'
              ? 'Record the expense together with its proof. The receipt date and the entry date are stored separately, and claims pick up lines by entry date.'
              : 'Drop one or more receipts and let the extraction engine read them. Review each result, then open it to record the entry.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'manual' ? (
            <button
              type="button"
              onClick={() => setMode('ocr')}
              disabled={!ocrAvailable}
              title={
                ocrAvailable
                  ? undefined
                  : `OCR is not enabled for company ${activeCompany?.code ?? ''}. Ask a super administrator to enable it.`
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ScanLine className="w-4 h-4" />
              OCR Process
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('manual')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
              Manual Input
            </button>
          )}
        </div>
      </div>

      {mode === 'manual' && !ocrAvailable && (
        <p
          role="status"
          className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span>
            OCR is currently closed for company {activeCompany?.code ?? '-'}, so
            expenses are recorded manually. A super administrator can open it
            per company.
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {mode === 'ocr' ? (
          <div className="lg:col-span-5 space-y-4">
            {/* Multi-file drop zone, mirroring the batch invoice upload. */}
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                uploadForOcr(event.dataTransfer.files);
              }}
              onClick={() => dropInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 px-4 py-12 rounded-2xl border-2 border-dashed cursor-pointer text-center transition ${
                isDragging
                  ? 'border-[#D32F2F] bg-red-50/60'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {ocrMutation.isPending ? (
                <Loader2 className="w-7 h-7 animate-spin text-[#D32F2F]" />
              ) : (
                <UploadCloud className="w-7 h-7 text-[#D32F2F]" />
              )}
              <span className="font-bold text-slate-800 text-sm">
                Drop receipts here or click to browse
              </span>
              <span className="text-[11px] text-slate-400">
                PDF or image, multiple files, up to 10 MB each
              </span>
              <input
                ref={dropInputRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) uploadForOcr(event.target.files);
                  event.target.value = '';
                }}
              />
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

            {jobIds.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-100">
                Uploaded receipts and their extraction results appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {jobIds.map((jobId) => (
                  <OcrJobCard
                    key={jobId}
                    jobId={jobId}
                    saved={savedJobIds.includes(jobId)}
                    onSaved={() => {
                      setSavedJobIds((previous) => [...previous, jobId]);
                      setSavedFromOcr(
                        'Saved to Unclaimed as a draft — open it to review and verify',
                      );
                      void queryClient.invalidateQueries({
                        queryKey: ['my-entries'],
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <form
            className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4 text-xs"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <ManualExpenseFormFields
              form={form}
              categories={categories}
              marketingCodes={marketingCodes}
              update={update}
            />

            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">
                Proof{' '}
                {selected && !selected.requiresProof
                  ? '(optional)'
                  : '(required)'}
              </label>

              <label className="flex items-center justify-center gap-2 px-3 py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 cursor-pointer text-slate-500">
                <Plus className="w-4 h-4" />
                <span>Add photo / PDF</span>
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files) {
                      setFiles((previous) => [
                        ...previous,
                        ...Array.from(event.target.files!),
                      ]);
                    }
                  }}
                />
              </label>

              {files.length > 0 && (
                <ul className="space-y-1.5">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setFiles((previous) =>
                            previous.filter((_, i) => i !== index),
                          )
                        }
                        className="p-1 rounded-md text-slate-400 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={form.allowDuplicate ?? false}
                onChange={(event) =>
                  update('allowDuplicate', event.target.checked)
                }
              />
              Legitimate duplicate expense, skip the similarity check
            </label>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}

            {success && (
              <p
                role="status"
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending || !form.categoryId}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold shadow-sm transition disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
              Save expense line
            </button>
          </form>
        )}

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Unclaimed</h2>
              <p className="text-[11px] text-slate-400">
                {entries.length} lines, total {formatCurrency(unclaimedTotal)}
              </p>
            </div>
            {savedFromOcr && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {savedFromOcr}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" />
            </div>
          ) : entries.length === 0 ? (
            <p className="p-12 text-center text-xs text-slate-400">
              No expense lines are waiting to be claimed.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Receipt date</th>
                    <th className="py-3 px-4">Recorded</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Proof</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800">
                        {formatDate(entry.expenseDate)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {formatDate(entry.enteredAt)}
                      </td>
                      <td className="py-3 px-4">{entry.category.name}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {entry.destination ?? entry.description ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <EntryStatusBadge status={entry.status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {entry.attachments.length}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/expense/entries/${entry.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-50 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>
                          <button
                            type="button"
                            aria-label="Delete line"
                            onClick={() => deleteMutation.mutate(entry.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );
}

/**
 * One uploaded receipt: polls until extraction settles, shows the suggested
 * fields and the raw provider JSON, and saves the extracted line straight into
 * the Unclaimed table. The receipt itself becomes the entry's proof.
 */
function OcrJobCard({
  jobId,
  saved,
  onSaved,
}: {
  jobId: string;
  saved: boolean;
  onSaved: () => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: job } = useQuery({
    queryKey: ['expense-ocr-job', jobId],
    queryFn: () => expenseApi.getOcrJob(jobId),
    refetchInterval: (query) =>
      query.state.data &&
      ['COMPLETED', 'FAILED'].includes(query.state.data.status)
        ? false
        : 2_000,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!job) throw new Error('No extraction to save');
      // The receipt that was extracted becomes the proof, so no file upload is
      // needed here; the category and figures come from the suggestions.
      return expenseApi.createEntry(
        {
          categoryId: job.suggestedCategory?.id ?? '',
          expenseDate: job.suggestedDate
            ? job.suggestedDate.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          quantity: 1,
          unitPrice:
            job.suggestedAmount === null
              ? undefined
              : Number(job.suggestedAmount),
          description:
            job.suggestedDescription ?? job.suggestedMerchant ?? undefined,
          ocrJobId: job.id,
          // Saved as a draft: it lands in Unclaimed right away even when the
          // receipt is missing fields a category needs (such as a Toll
          // destination). The employee completes and verifies it afterwards.
          saveAsDraft: true,
        },
        [],
      );
    },
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  if (!job) {
    return (
      <div className="p-4 rounded-2xl border border-slate-100 bg-white text-center">
        <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-300" />
      </div>
    );
  }

  // The category is required to save. When extraction could not resolve it, the
  // line is completed on the review page instead of saved blindly.
  const canQuickSave = Boolean(job.suggestedCategory?.id);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden text-xs">
      <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-100">
        <span className="flex items-center gap-2 min-w-0">
          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-bold text-slate-800">
            {job.originalName}
          </span>
        </span>
        <OcrStatusBadge status={job.status} />
      </div>

      <div className="p-3 space-y-2">
        {job.status !== 'COMPLETED' && job.status !== 'FAILED' && (
          <p className="flex items-center gap-2 text-[11px] text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Reading the receipt...
          </p>
        )}

        {job.status === 'FAILED' && (
          <p className="text-[11px] text-amber-700">
            Extraction failed
            {job.errorMessage ? `: ${job.errorMessage}` : ''}. Record this one
            manually instead.
          </p>
        )}

        {job.status === 'COMPLETED' && (
          <>
            <dl className="space-y-1 text-[11px] text-slate-600">
              <Row label="Merchant" value={job.suggestedMerchant ?? '-'} />
              <Row
                label="Date"
                value={job.suggestedDate ? formatDate(job.suggestedDate) : '-'}
              />
              <Row label="Amount" value={formatCurrency(job.suggestedAmount)} />
              <Row
                label="Category"
                value={
                  job.suggestedCategory?.name ??
                  job.suggestedCategoryRaw ??
                  'Not detected'
                }
              />
            </dl>

            <button
              type="button"
              onClick={() => setShowJson((previous) => !previous)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
            >
              {showJson ? 'Hide' : 'Show'} extraction JSON
            </button>

            {showJson && (
              <pre className="max-h-56 overflow-auto rounded-lg bg-slate-900 text-slate-100 text-[10px] leading-relaxed p-3">
                {JSON.stringify(job.rawJson ?? {}, null, 2)}
              </pre>
            )}

            {error && (
              <p className="flex items-start gap-2 text-[11px] text-red-700 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}

            {saved ? (
              <p className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved to Unclaimed
              </p>
            ) : canQuickSave ? (
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-[11px] disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Receipt className="w-3.5 h-3.5" />
                )}
                Save expense line
              </button>
            ) : (
              <Link
                to={`/expense/entries/new?ocrJobId=${job.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-white font-bold text-[11px] hover:bg-slate-900"
              >
                <Eye className="w-3.5 h-3.5" />
                Complete and save
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EntryStatusBadge({ status }: { status: ExpenseEntryStatus }) {
  const isVerified = status === 'VERIFIED';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
        isVerified
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      {isVerified ? 'Verified' : 'Draft'}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-semibold text-slate-800 truncate">{value}</dd>
    </div>
  );
}

function OcrStatusBadge({ status }: { status: ExpenseOcrJob['status'] }) {
  const style =
    status === 'COMPLETED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'FAILED'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border shrink-0 ${style}`}
    >
      {status}
    </span>
  );
}
