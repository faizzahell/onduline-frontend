import { api } from '../../../services/api';

export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACCRUED'
  | 'UNDER_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'POSTED'
  | 'CANCELLED';

export type ApprovalStepType = 'ACCRUE' | 'REVIEW' | 'APPROVE' | 'POST';

export type ApprovalStepStatus =
  'PENDING' | 'APPROVED' | 'REVISION_REQUESTED' | 'SKIPPED';

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  glAccountNo: string | null;
  pettyCashCode: string | null;
  requiresProof: boolean;
  requiresMarketingCode: boolean;
  requiresDestination: boolean;
  isFixedRate: boolean;
  isEntertainment: boolean;
  isMealAllowance: boolean;
  unitOfMeasure: string | null;
  perTransactionApprovalThreshold: string | number | null;
  availableForExpense: boolean;
  availableForPettyCash: boolean;
  rates?: { id: string; amount: string | number; effectiveFrom: string }[];
}

export interface DimensionItem {
  id: string;
  code: string;
  name: string;
}

export interface ExpenseAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ExpenseRevision {
  id: string;
  previousAmount: string | number;
  newAmount: string | number;
  remark: string;
  revisedAt: string;
}

export interface ExpenseEntry {
  id: string;
  expenseDate: string;
  enteredAt: string;
  quantity: string | number;
  unitPrice: string | number;
  amount: string | number;
  approvedAmount: string | number | null;
  description: string | null;
  destination: string | null;
  remark: string | null;
  category: { id: string; code: string; name: string };
  marketingCode: { id: string; code: string; name: string } | null;
  attachments: ExpenseAttachment[];
  revisions: ExpenseRevision[];
  entertainment: Record<string, unknown> | null;
  mealAllowance: Record<string, unknown> | null;
  claim: { id: string; claimNumber: string; status: ClaimStatus } | null;
  /** DRAFT = incomplete, not claimable; VERIFIED = reviewed and ready to claim. */
  status: ExpenseEntryStatus;
  source: ExpenseSource;
}

export type ExpenseEntryStatus = 'DRAFT' | 'VERIFIED';

export type ExpenseSource = 'MANUAL' | 'OCR' | 'TIKET_IMPORT';

export interface CategorySummary {
  categoryId: string;
  code: string;
  name: string;
  amount: number;
  count: number;
}

export interface ApprovalStep {
  id: string;
  sequence: number;
  stepType: ApprovalStepType;
  status: ApprovalStepStatus;
  label: string | null;
  remark: string | null;
  actedAt: string | null;
  assignedRoleName: string | null;
  assignedEmployee: { id: string; name: string; employeeCode: string } | null;
}

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  status: ClaimStatus;
  periodStart: string;
  periodEnd: string;
  submittedAmount: string | number;
  approvedAmount: string | number | null;
  submittedAt: string | null;
  employee: { id: string; name: string; employeeCode: string };
  entries: ExpenseEntry[];
  approvalSteps: ApprovalStep[];
  byCategory: CategorySummary[];
  journalBatches: {
    id: string;
    documentNo: string;
    type: string;
    status: string;
  }[];
  _count?: { entries: number };
}

export interface ClaimPreview {
  periodStart: string;
  periodEnd: string;
  entryCount: number;
  totalAmount: number;
  byCategory: CategorySummary[];
  entries: ExpenseEntry[];
}

export interface DeleteClaimResult {
  message: string;
  submitter: { name: string; employeeCode: string };
  deleted: {
    claims: number;
    entries: number;
    ocrJobs: number;
    journalBatches: number;
  };
}

export interface PendingApprovalStep extends ApprovalStep {
  claim: {
    id: string;
    claimNumber: string;
    status: ClaimStatus;
    submittedAmount: string | number;
    periodStart: string;
    periodEnd: string;
    employee: { name: string; employeeCode: string };
  } | null;
  pettyCashBatch: {
    id: string;
    batchNumber: string;
    status: string;
    totalAmount: string | number;
  } | null;
  cashAdvance: {
    id: string;
    advanceNumber: string;
    status: string;
    amount: string | number;
    type: string;
  } | null;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  position: string | null;
  level: string;
  division: string;
  homeBase: string | null;
  department: DimensionItem | null;
  areaCode: DimensionItem | null;
  salesArea: DimensionItem | null;
}

export type ExpenseOcrStatus =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Receipt extraction job. The suggested values are only proposals; the
 * employee still reviews them before the entry is saved.
 */
export interface ExpenseOcrJob {
  id: string;
  status: ExpenseOcrStatus;
  originalName: string;
  mimeType: string;
  provider: string | null;
  model: string | null;
  confidence: string | number | null;
  /** Raw provider JSON, shown on the review panel for transparency. */
  rawJson: unknown;
  errorMessage: string | null;
  suggestedCategory: { id: string; code: string; name: string } | null;
  suggestedCategoryRaw: string | null;
  suggestedDate: string | null;
  suggestedAmount: string | number | null;
  suggestedTaxAmount: string | number | null;
  suggestedMerchant: string | null;
  suggestedDescription: string | null;
  expenseEntryId: string | null;
  createdAt: string;
}

/** Flat fields because the entry is submitted as multipart with its files. */
export interface CreateEntryInput {
  categoryId: string;
  expenseDate: string;
  quantity?: number;
  unitPrice?: number;
  description?: string;
  destination?: string;
  remark?: string;
  marketingCodeId?: string;
  allowDuplicate?: boolean;
  /** Save an incomplete draft (OCR flow), skipping the requirement/proof checks. */
  saveAsDraft?: boolean;
  entertainmentMerchantName?: string;
  entertainmentMerchantAddress?: string;
  entertainmentKind?: string;
  entertainmentRelationName?: string;
  entertainmentRelationPosition?: string;
  entertainmentRelationPhone?: string;
  entertainmentRelationCompany?: string;
  entertainmentRelationBusinessType?: string;
  entertainmentNotes?: string;
  mealStartDate?: string;
  mealEndDate?: string;
  mealDestination?: string;
  mealOneWayDistanceKm?: number;
  /** The receipt already uploaded for extraction becomes this entry's proof. */
  ocrJobId?: string;
}

function toFormData(input: CreateEntryInput, files: File[]): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    formData.append(key, String(value));
  }

  for (const file of files) {
    formData.append('files', file);
  }

  return formData;
}

export const expenseApi = {
  getMyEmployee: async (): Promise<Employee> => {
    const res = await api.get<Employee>('/employees/me');
    return res.data;
  },

  getCategories: async (): Promise<ExpenseCategory[]> => {
    const res = await api.get<ExpenseCategory[]>('/expense/master/categories');
    return res.data;
  },

  getMarketingCodes: async (): Promise<DimensionItem[]> => {
    const res = await api.get<DimensionItem[]>(
      '/expense/master/dimensions/marketing-codes',
    );
    return res.data;
  },

  /** BC dimension list by kind: area-codes, departments, sales-areas, marketing-codes. */
  getDimension: async (
    kind: 'area-codes' | 'departments' | 'sales-areas' | 'marketing-codes',
  ): Promise<DimensionItem[]> => {
    const res = await api.get<DimensionItem[]>(
      `/expense/master/dimensions/${kind}`,
    );
    return res.data;
  },

  listMyEntries: async (unclaimedOnly = false): Promise<ExpenseEntry[]> => {
    const res = await api.get<ExpenseEntry[]>('/expense/entries', {
      params: unclaimedOnly ? { unclaimedOnly: true } : undefined,
    });
    return res.data;
  },

  createEntry: async (
    input: CreateEntryInput,
    files: File[],
  ): Promise<ExpenseEntry> => {
    const res = await api.post<ExpenseEntry>(
      '/expense/entries',
      toFormData(input, files),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  deleteEntry: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/expense/entries/${id}`);
    return res.data;
  },

  addEntryAttachments: async (
    id: string,
    files: File[],
  ): Promise<ExpenseEntry> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await api.post<ExpenseEntry>(
      `/expense/entries/${id}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  downloadAttachment: async (attachmentId: string): Promise<Blob> => {
    const res = await api.get<Blob>(
      `/expense/entries/attachments/${attachmentId}/download`,
      { responseType: 'blob' },
    );
    return res.data;
  },

  /**
   * Uploads one or more receipts for extraction, one job per file. Only
   * available when expense OCR is enabled for the active company.
   */
  createOcrJobs: async (files: File[]): Promise<ExpenseOcrJob[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await api.post<ExpenseOcrJob[]>('/expense/ocr-jobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data;
  },

  getOcrJob: async (id: string): Promise<ExpenseOcrJob> => {
    const res = await api.get<ExpenseOcrJob>(`/expense/ocr-jobs/${id}`);
    return res.data;
  },

  getEntry: async (id: string): Promise<ExpenseEntry> => {
    const res = await api.get<ExpenseEntry>(`/expense/entries/${id}`);
    return res.data;
  },

  updateEntry: async (
    id: string,
    input: CreateEntryInput,
  ): Promise<ExpenseEntry> => {
    const res = await api.put<ExpenseEntry>(`/expense/entries/${id}`, input);
    return res.data;
  },

  /** Marks a reviewed entry as verified and ready to claim. */
  verifyEntry: async (id: string): Promise<ExpenseEntry> => {
    const res = await api.put<ExpenseEntry>(`/expense/entries/${id}/verify`);
    return res.data;
  },

  /** Sends a verified entry back to draft for reworking. */
  unverifyEntry: async (id: string): Promise<ExpenseEntry> => {
    const res = await api.put<ExpenseEntry>(`/expense/entries/${id}/unverify`);
    return res.data;
  },

  reviseEntryAmount: async (
    id: string,
    approvedAmount: number,
    remark: string,
  ): Promise<ExpenseEntry> => {
    const res = await api.put<ExpenseEntry>(`/expense/entries/${id}/revise`, {
      approvedAmount,
      remark,
    });
    return res.data;
  },

  previewClaim: async (
    periodStart: string,
    periodEnd: string,
  ): Promise<ClaimPreview> => {
    const res = await api.get<ClaimPreview>('/expense/claims/preview', {
      params: { periodStart, periodEnd },
    });
    return res.data;
  },

  submitClaim: async (
    periodStart: string,
    periodEnd: string,
  ): Promise<ExpenseClaim> => {
    const res = await api.post<ExpenseClaim>('/expense/claims', {
      periodStart,
      periodEnd,
    });
    return res.data;
  },

  listMyClaims: async (): Promise<ExpenseClaim[]> => {
    const res = await api.get<ExpenseClaim[]>('/expense/claims/mine');
    return res.data;
  },

  listAllClaims: async (params: {
    status?: string;
    minAmount?: number;
  }): Promise<ExpenseClaim[]> => {
    const res = await api.get<ExpenseClaim[]>('/expense/claims', { params });
    return res.data;
  },

  listPendingApprovals: async (): Promise<PendingApprovalStep[]> => {
    const res = await api.get<PendingApprovalStep[]>(
      '/expense/claims/pending-approval',
    );
    return res.data;
  },

  getClaim: async (id: string): Promise<ExpenseClaim> => {
    const res = await api.get<ExpenseClaim>(`/expense/claims/${id}`);
    return res.data;
  },

  claimAction: async (
    id: string,
    action: 'accrue' | 'review' | 'approve' | 'post' | 'resubmit',
    remark?: string,
  ): Promise<ExpenseClaim> => {
    const res = await api.post<ExpenseClaim>(
      `/expense/claims/${id}/${action}`,
      remark ? { remark } : {},
    );
    return res.data;
  },

  requestClaimRevision: async (
    id: string,
    remark: string,
  ): Promise<ExpenseClaim> => {
    const res = await api.post<ExpenseClaim>(
      `/expense/claims/${id}/request-revision`,
      { remark },
    );
    return res.data;
  },

  /**
   * Administrator-only: deletes the claim together with the whole expense
   * footprint of the employee who submitted it.
   */
  deleteClaim: async (id: string): Promise<DeleteClaimResult> => {
    const res = await api.delete<DeleteClaimResult>(`/expense/claims/${id}`);
    return res.data;
  },

  // -------------------------------------------------------------------------
  // Reports
  // -------------------------------------------------------------------------

  /** Every employee in the active company (admin / master data only). */
  listEmployees: async (): Promise<Employee[]> => {
    const res = await api.get<Employee[]>('/employees');
    return res.data;
  },

  /** The signed-in employee's own recap for a period. */
  myExpenseForm: async (
    periodStart: string,
    periodEnd: string,
  ): Promise<ExpenseFormReport> => {
    const res = await api.get<ExpenseFormReport>(
      '/expense/reports/me/expense-form',
      { params: { periodStart, periodEnd } },
    );
    return res.data;
  },

  /** An employee's recap for a period (admin / report access). */
  employeeExpenseForm: async (
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ExpenseFormReport> => {
    const res = await api.get<ExpenseFormReport>(
      `/expense/reports/employees/${employeeId}/expense-form`,
      { params: { periodStart, periodEnd } },
    );
    return res.data;
  },

  /** Management dashboard summary for a given month. */
  reportDashboard: async (
    year: number,
    month: number,
  ): Promise<ExpenseDashboard> => {
    const res = await api.get<ExpenseDashboard>('/expense/reports/dashboard', {
      params: { year, month },
    });
    return res.data;
  },
};

export interface ExpenseFormRow {
  date: string;
  amounts: Record<string, number>;
  remarks: string[];
  total: number;
}

export interface ExpenseFormReport {
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    position: string | null;
    department: string | null;
  };
  periodStart: string;
  periodEnd: string;
  categories: { code: string; name: string }[];
  rows: ExpenseFormRow[];
  totalsByCategory: { code: string; name: string; amount: number }[];
  grandTotal: number;
}

export interface SummaryBucket {
  label: string;
  amount: number;
}

export interface ExpenseDashboard {
  year: number;
  month: number;
  currentMonthTotal: number;
  yearToDateTotal: number;
  lastYearTotal: number;
  yearOverYearChangePercent: number | null;
  byCategory: SummaryBucket[];
  byArea: SummaryBucket[];
  byMonth: SummaryBucket[];
  claimsByStatus: { status: string; count: number; amount: number }[];
}
