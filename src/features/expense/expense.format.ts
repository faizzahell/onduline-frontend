/** Amounts from the backend can be strings because the column is a Decimal. */
export function formatCurrency(
  value: string | number | null | undefined,
  currency = 'IDR',
): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return '-';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const CLAIM_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  ACCRUED: 'Accrued',
  UNDER_REVIEW: 'Under review',
  REVISION_REQUESTED: 'Revision requested',
  APPROVED: 'Approved',
  POSTED: 'Posted',
  CANCELLED: 'Cancelled',
};

const CLAIM_STATUS_CLASSES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  ACCRUED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  REVISION_REQUESTED: 'bg-red-50 text-red-700 border-red-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POSTED: 'bg-purple-50 text-purple-700 border-purple-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function claimStatusLabel(status: string): string {
  return CLAIM_STATUS_LABELS[status] ?? status;
}

export function claimStatusClass(status: string): string {
  return (
    CLAIM_STATUS_CLASSES[status] ??
    'bg-slate-100 text-slate-600 border-slate-200'
  );
}

const STEP_TYPE_LABELS: Record<string, string> = {
  ACCRUE: 'Accrue',
  REVIEW: 'Review',
  APPROVE: 'Approve',
  POST: 'Posting',
};

export function stepTypeLabel(stepType: string): string {
  return STEP_TYPE_LABELS[stepType] ?? stepType;
}
