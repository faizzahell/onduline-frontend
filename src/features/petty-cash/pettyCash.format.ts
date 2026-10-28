import type { PettyCashStatus } from './api/pettyCash.api';

const STATUS_LABELS: Record<PettyCashStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REVISION_REQUESTED: 'Revision requested',
  POSTED: 'Posted',
  CANCELLED: 'Cancelled',
};

const STATUS_CLASSES: Record<PettyCashStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REVISION_REQUESTED: 'bg-red-50 text-red-700 border-red-200',
  POSTED: 'bg-purple-50 text-purple-700 border-purple-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function pettyCashStatusLabel(status: string): string {
  return STATUS_LABELS[status as PettyCashStatus] ?? status;
}

export function pettyCashStatusClass(status: string): string {
  return (
    STATUS_CLASSES[status as PettyCashStatus] ??
    'bg-slate-100 text-slate-600 border-slate-200'
  );
}
