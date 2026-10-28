import { api } from '../../../services/api';
import type {
  ApprovalStep,
  DimensionItem,
  ExpenseCategory,
} from '../../expense/api/expense.api';

export type PettyCashStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REVISION_REQUESTED'
  | 'POSTED'
  | 'CANCELLED';

export interface PettyCashAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface PettyCashEntry {
  id: string;
  expenseDate: string;
  description: string;
  amount: string | number;
  areaCode: string | null;
  employeeCode: string | null;
  departmentCode: string | null;
  category: {
    id: string;
    code: string;
    name: string;
    glAccountNo: string | null;
    pettyCashCode: string | null;
  };
  attachments: PettyCashAttachment[];
}

/** List rows carry only a line count, not the full entries. */
export interface PettyCashBatchSummary {
  id: string;
  batchNumber: string;
  status: PettyCashStatus;
  periodStart: string;
  periodEnd: string;
  totalAmount: string | number;
  submittedAt: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  createdAt: string;
  _count?: { entries: number };
}

export interface PettyCashBatch extends PettyCashBatchSummary {
  entries: PettyCashEntry[];
  approvalSteps: ApprovalStep[];
  journalBatches: {
    id: string;
    documentNo: string;
    type: string;
    status: string;
  }[];
}

/** A line as typed into the create/edit form, before it is sent. */
export interface PettyCashEntryInput {
  expenseDate: string;
  categoryId: string;
  description: string;
  amount: number;
  areaCode?: string;
  employeeCode?: string;
  departmentCode?: string;
}

export interface CreatePettyCashBatchInput {
  periodStart: string;
  periodEnd: string;
  entries: PettyCashEntryInput[];
}

export const pettyCashApi = {
  list: async (status?: string): Promise<PettyCashBatchSummary[]> => {
    const res = await api.get<PettyCashBatchSummary[]>('/petty-cash/batches', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },

  getById: async (id: string): Promise<PettyCashBatch> => {
    const res = await api.get<PettyCashBatch>(`/petty-cash/batches/${id}`);
    return res.data;
  },

  create: async (input: CreatePettyCashBatchInput): Promise<PettyCashBatch> => {
    const res = await api.post<PettyCashBatch>('/petty-cash/batches', input);
    return res.data;
  },

  update: async (
    id: string,
    input: Partial<CreatePettyCashBatchInput>,
  ): Promise<PettyCashBatch> => {
    const res = await api.put<PettyCashBatch>(
      `/petty-cash/batches/${id}`,
      input,
    );
    return res.data;
  },

  submit: async (id: string): Promise<PettyCashBatch> => {
    const res = await api.post<PettyCashBatch>(
      `/petty-cash/batches/${id}/submit`,
      {},
    );
    return res.data;
  },

  approve: async (id: string, remark?: string): Promise<PettyCashBatch> => {
    const res = await api.post<PettyCashBatch>(
      `/petty-cash/batches/${id}/approve`,
      remark ? { remark } : {},
    );
    return res.data;
  },

  requestRevision: async (
    id: string,
    remark: string,
  ): Promise<PettyCashBatch> => {
    const res = await api.post<PettyCashBatch>(
      `/petty-cash/batches/${id}/request-revision`,
      { remark },
    );
    return res.data;
  },

  post: async (id: string, remark?: string): Promise<PettyCashBatch> => {
    const res = await api.post<PettyCashBatch>(
      `/petty-cash/batches/${id}/post`,
      remark ? { remark } : {},
    );
    return res.data;
  },
};

/** Categories offered for petty cash, with a usable G/L account. */
export function pettyCashCategories(
  categories: ExpenseCategory[],
): ExpenseCategory[] {
  return categories.filter(
    (category) => category.availableForPettyCash && category.glAccountNo,
  );
}

export type { DimensionItem };
