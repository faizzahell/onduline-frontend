import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  ScanLine,
  X,
} from 'lucide-react';

import { api } from '../../../services/api';
import {
  expenseApi,
  type CreateEntryInput,
  type ExpenseEntry,
  type ExpenseOcrJob,
} from '../api/expense.api';
import { ManualExpenseFormFields } from '../components/ManualExpenseForm';
import { formatCurrency, formatDate } from '../expense.format';

const ACCEPTED = 'application/pdf,image/jpeg,image/png,image/webp,image/heic';

/** Turns a saved entry back into the editable form shape. */
function entryToForm(entry: ExpenseEntry): CreateEntryInput {
  const ent = entry.entertainment as Record<string, unknown> | null;
  const meal = entry.mealAllowance as Record<string, unknown> | null;
  const str = (value: unknown) =>
    value === null || value === undefined ? undefined : String(value);

  return {
    categoryId: entry.category.id,
    expenseDate: entry.expenseDate.slice(0, 10),
    quantity: Number(entry.quantity),
    unitPrice: Number(entry.unitPrice),
    description: entry.description ?? undefined,
    destination: entry.destination ?? undefined,
    remark: entry.remark ?? undefined,
    marketingCodeId: entry.marketingCode?.id,
    entertainmentMerchantName: str(ent?.merchantName),
    entertainmentMerchantAddress: str(ent?.merchantAddress),
    entertainmentKind: str(ent?.kind),
    entertainmentRelationName: str(ent?.relationName),
    entertainmentRelationPosition: str(ent?.relationPosition),
    entertainmentRelationPhone: str(ent?.relationPhone),
    entertainmentRelationCompany: str(ent?.relationCompany),
    entertainmentRelationBusinessType: str(ent?.relationBusinessType),
    entertainmentNotes: str(ent?.notes),
    mealStartDate: meal?.startDate
      ? String(meal.startDate).slice(0, 10)
      : undefined,
    mealEndDate: meal?.endDate ? String(meal.endDate).slice(0, 10) : undefined,
    mealDestination: str(meal?.destination),
    mealOneWayDistanceKm:
      meal?.oneWayDistanceKm === null || meal?.oneWayDistanceKm === undefined
        ? undefined
        : Number(meal.oneWayDistanceKm),
  };
}

/** Prefills the form from an extraction job. */
function ocrToForm(job: ExpenseOcrJob): CreateEntryInput {
  return {
    categoryId: job.suggestedCategory?.id ?? '',
    expenseDate: job.suggestedDate
      ? job.suggestedDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    quantity: 1,
    unitPrice:
      job.suggestedAmount === null ? undefined : Number(job.suggestedAmount),
    description: job.suggestedDescription ?? job.suggestedMerchant ?? undefined,
    ocrJobId: job.id,
  };
}

export default function ExpenseEntryReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const ocrJobId = searchParams.get('ocrJobId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // `new` is the create-from-OCR path; any other id edits an existing entry.
  const isNew = id === 'new';

  const [form, setForm] = useState<CreateEntryInput | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseApi.getCategories,
  });
  const { data: marketingCodes = [] } = useQuery({
    queryKey: ['marketing-codes'],
    queryFn: expenseApi.getMarketingCodes,
  });

  const { data: entry, isLoading: entryLoading } = useQuery({
    queryKey: ['expense-entry', id],
    queryFn: () => expenseApi.getEntry(id!),
    enabled: !isNew && Boolean(id),
  });

  const { data: ocrJob, isLoading: ocrLoading } = useQuery({
    queryKey: ['expense-ocr-job', ocrJobId],
    queryFn: () => expenseApi.getOcrJob(ocrJobId!),
    enabled: isNew && Boolean(ocrJobId),
  });

  // Seed the editable form once the source data arrives.
  useEffect(() => {
    if (form) return;
    if (!isNew && entry) setForm(entryToForm(entry));
    if (isNew && ocrJob) setForm(ocrToForm(ocrJob));
    if (isNew && !ocrJobId)
      setForm({
        categoryId: '',
        expenseDate: new Date().toISOString().slice(0, 10),
      });
  }, [form, isNew, entry, ocrJob, ocrJobId]);

  const update = <K extends keyof CreateEntryInput>(
    key: K,
    value: CreateEntryInput[K],
  ) => {
    setSuccess(null);
    setForm((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  };

  const selected = categories.find((c) => c.id === form?.categoryId);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('Nothing to save');
      return isNew
        ? expenseApi.createEntry(form, files)
        : expenseApi.updateEntry(id!, form);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['my-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['expense-entry', id] });
      setError(null);

      // A new OCR entry is recorded then the user is returned to the list. An
      // edit stays on the page so the user can keep reviewing and then verify.
      if (isNew) {
        navigate('/expense/entries');
        return;
      }

      setForm(entryToForm(saved));
      setSuccess('Changes saved');
    },
    onError: (mutationError: Error) => {
      setSuccess(null);
      setError(mutationError.message);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => expenseApi.verifyEntry(id!),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['my-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['expense-entry', id] });
      setForm(entryToForm(saved));
      setError(null);
      setSuccess('Expense line verified — it is now ready to claim');
    },
    onError: (mutationError: Error) => {
      setSuccess(null);
      setError(mutationError.message);
    },
  });

  const unverifyMutation = useMutation({
    mutationFn: () => expenseApi.unverifyEntry(id!),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['my-entries'] });
      void queryClient.invalidateQueries({ queryKey: ['expense-entry', id] });
      setForm(entryToForm(saved));
      setError(null);
      setSuccess('Moved back to draft');
    },
    onError: (mutationError: Error) => {
      setSuccess(null);
      setError(mutationError.message);
    },
  });

  const previewUrl = useMemo(() => {
    if (isNew || !entry) return null;
    const proof = entry.attachments[0];
    return proof ? `/expense/entries/attachments/${proof.id}/download` : null;
  }, [isNew, entry]);

  if ((!isNew && entryLoading) || (isNew && ocrJobId && ocrLoading) || !form) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#D32F2F]" />
      </div>
    );
  }

  const claimed = !isNew && entry?.claim && entry.claim.status !== 'DRAFT';
  const isVerified = !isNew && entry?.status === 'VERIFIED';

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/expense/entries')}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {isNew ? 'Review and record expense' : 'Review expense line'}
              </h1>
              {!isNew && entry && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    isVerified
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isVerified ? 'Verified' : 'Draft'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isNew
                ? 'Check the extracted values, correct anything, then record the entry.'
                : 'Fill in any missing fields, save your changes, then verify it so it can be claimed.'}
            </p>
          </div>
        </div>

        {/* Verification controls — only a verified line can be claimed. */}
        {!isNew && entry && !claimed && (
          <div className="flex items-center gap-2 shrink-0">
            {isVerified ? (
              <button
                type="button"
                onClick={() => unverifyMutation.mutate()}
                disabled={unverifyMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition disabled:opacity-50"
              >
                {unverifyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Back to draft
              </button>
            ) : (
              <button
                type="button"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BadgeCheck className="w-4 h-4" />
                )}
                Verify &amp; mark ready
              </button>
            )}
          </div>
        )}
      </div>

      {claimed && (
        <p className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This line is part of claim {entry?.claim?.claimNumber} and can no
            longer be edited.
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4 text-xs"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            saveMutation.mutate();
          }}
        >
          {form.ocrJobId && (
            <p
              role="status"
              className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600"
            >
              <ScanLine className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
              <span>
                Prefilled from the extracted receipt. The receipt is attached
                automatically as proof.
              </span>
            </p>
          )}

          <fieldset
            disabled={Boolean(claimed)}
            className="space-y-4 disabled:opacity-60"
          >
            <ManualExpenseFormFields
              form={form}
              categories={categories}
              marketingCodes={marketingCodes}
              update={update}
            />

            {/* Only a brand-new entry uploads proof here; an OCR entry reuses
                its receipt, and an existing entry keeps the proof it has. */}
            {isNew && !form.ocrJobId && (
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
            )}
          </fieldset>

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

          {!claimed && (
            <div className="flex items-center justify-end gap-2">
              <Link
                to="/expense/entries"
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saveMutation.isPending || !form.categoryId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold shadow-sm transition disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isNew ? 'Record entry' : 'Save changes'}
              </button>
            </div>
          )}
        </form>

        <div className="lg:col-span-5 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-4 text-xs space-y-2">
            <h2 className="text-sm font-bold text-slate-900">Summary</h2>
            <dl className="space-y-1 text-slate-600">
              <div className="flex justify-between gap-2">
                <dt>Quantity</dt>
                <dd className="font-semibold text-slate-800">
                  {form.quantity ?? 1}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Unit price</dt>
                <dd className="font-semibold text-slate-800">
                  {formatCurrency(form.unitPrice)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 pt-1 border-t border-slate-100">
                <dt className="font-bold text-slate-700">Amount</dt>
                <dd className="font-bold text-slate-900">
                  {formatCurrency(
                    (Number(form.quantity) || 1) *
                      (Number(form.unitPrice) || 0),
                  )}
                </dd>
              </div>
            </dl>
            {!isNew && entry && (
              <p className="text-[11px] text-slate-400 pt-1">
                Receipt date {formatDate(entry.expenseDate)} · recorded{' '}
                {formatDate(entry.enteredAt)}
              </p>
            )}
          </section>

          {!isNew && entry && entry.attachments.length > 0 && (
            <ProofPreview
              attachmentId={entry.attachments[0].id}
              name={entry.attachments[0].originalName}
              mimeType={entry.attachments[0].mimeType}
              count={entry.attachments.length}
              previewUrl={previewUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The attached receipt preview. Files sit behind the auth guard, so they are
 * fetched through the API instance and shown from an object URL.
 */
function ProofPreview({
  attachmentId,
  name,
  mimeType,
  count,
}: {
  attachmentId: string;
  name: string;
  mimeType: string;
  count: number;
  previewUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    void api
      .get<Blob>(`/expense/entries/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      })
      .then((res) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId]);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden text-xs">
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <span className="flex items-center gap-2 min-w-0">
          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate font-bold text-slate-800">{name}</span>
        </span>
        {count > 1 && (
          <span className="text-[10px] text-slate-400">+{count - 1} more</span>
        )}
      </div>
      <div className="p-3">
        {!url ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : mimeType === 'application/pdf' ? (
          <embed
            src={url}
            type="application/pdf"
            className="w-full h-72 rounded-lg"
          />
        ) : (
          <img
            src={url}
            alt={name}
            className="w-full max-h-72 object-contain rounded-lg"
          />
        )}
      </div>
    </section>
  );
}
