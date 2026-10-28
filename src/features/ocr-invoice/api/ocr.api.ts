import { api } from '../../../services/api';

export type InvoiceStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'VALIDATION_REQUIRED'
  | 'VALIDATED'
  | 'MATCHED'
  | 'SUBMITTED'
  | 'POSTED'
  | 'FAILED';

export type OCRJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type GrnStatus =
  'FULLY_RECEIVED' | 'PARTIALLY_RECEIVED' | 'NOT_RECEIVED';

export interface UserAuditInfo {
  id: string;
  name: string;
  email: string;
}

export interface InvoiceFileItem {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface OCRResult {
  id: string;
  ocrJobId: string;
  rawText?: string | null;
  rawJson?: unknown;
  /** `null` when the extraction provider does not report a confidence score. */
  confidence?: number | null;
  createdAt: string;
}

export interface OCRJob {
  id: string;
  invoiceId: string;
  status: OCRJobStatus;
  provider?: string | null;
  model?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  result?: OCRResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id?: string;
  lineNumber: number;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  taxAmount?: number;
  lineTotal?: number;
}

/**
 * The line fields the backend accepts on write. `id` and `lineNumber` are
 * server-managed — the backend numbers lines from their order — so they are
 * deliberately left out of the write payload, which the strict whitelist on
 * the API would otherwise reject.
 */
export type InvoiceLineInput = Omit<InvoiceLineItem, 'id' | 'lineNumber'>;

export interface InvoiceResponse {
  id: string;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  vendorTaxId?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  poNumber?: string | null;
  currency: string;
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  status: InvoiceStatus;
  createdById: string;
  createdBy?: UserAuditInfo;
  validatedById?: string | null;
  validatedBy?: UserAuditInfo | null;
  validatedAt?: string | null;
  files: InvoiceFileItem[];
  ocrJobs: OCRJob[];
  lines: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OpenPurchaseOrderLine {
  lineNumber: number;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  receivedQuantity: number;
}

export interface PurchaseOrderCandidate {
  poNumber: string;
  vendorNo: string;
  vendorName: string;
  orderDate: string;
  purchaserName: string;
  currency: string;
  totalAmount: number;
  status: string;
  grnStatus: GrnStatus;
  linesCount: number;
  lines: OpenPurchaseOrderLine[];
  /** Heuristic score from the backend, used to rank the candidates. */
  matchScorePercent: number;
}

export interface PurchaseOrderCandidatesResponse {
  /** `true` when Business Central is still served by a mock client. */
  mocked: boolean;
  candidates: PurchaseOrderCandidate[];
}

export interface InvoiceUpdatePayload {
  invoiceNumber?: string;
  vendorName?: string;
  vendorTaxId?: string;
  poNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  currency?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  lines?: InvoiceLineInput[];
}

export interface SubmitToBcResponse {
  message: string;
  bcInvoiceNo: string;
  mocked: boolean;
}

export const ocrApi = {
  createInvoice: async (dto?: {
    invoiceNumber?: string;
    vendorName?: string;
    vendorTaxId?: string;
    currency?: string;
  }): Promise<InvoiceResponse> => {
    const res = await api.post<InvoiceResponse>('/ocr/invoices', dto ?? {});
    return res.data;
  },

  /**
   * Uploads an invoice file. `runOcr` may only be `true` when OCR is enabled
   * for the active company; otherwise the file is stored as an attachment and
   * its data is filled in manually.
   */
  uploadInvoiceFile: async (invoiceId: string, file: File, runOcr = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('runOcr', String(runOcr));

    const res = await api.post<{
      invoiceFile: InvoiceFileItem;
      ocrJob: OCRJob | null;
    }>(`/ocr/invoices/${invoiceId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data;
  },

  /** Records a complete invoice without OCR. */
  createManualInvoice: async (data: {
    invoiceNumber?: string;
    vendorName?: string;
    vendorTaxId?: string;
    poNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    currency?: string;
    subtotal?: number;
    taxAmount?: number;
    totalAmount?: number;
    lines?: InvoiceLineInput[];
  }): Promise<InvoiceResponse> => {
    const res = await api.post<InvoiceResponse>('/ocr/invoices/manual', data);
    return res.data;
  },

  getInvoices: async (): Promise<InvoiceResponse[]> => {
    const res = await api.get<InvoiceResponse[]>('/ocr/invoices');
    return res.data;
  },

  getInvoiceById: async (id: string): Promise<InvoiceResponse> => {
    const res = await api.get<InvoiceResponse>(`/ocr/invoices/${id}`);
    return res.data;
  },

  getOCRJobs: async (invoiceId: string): Promise<OCRJob[]> => {
    const res = await api.get<OCRJob[]>(`/ocr/invoices/${invoiceId}/jobs`);
    return res.data;
  },

  /**
   * Invoice files sit behind a guard, so they must be fetched through the axios
   * instance that attaches the token rather than used directly as a URL in an
   * `embed` tag.
   */
  downloadInvoiceFile: async (
    invoiceId: string,
    fileId: string,
  ): Promise<Blob> => {
    const res = await api.get<Blob>(
      `/ocr/invoices/${invoiceId}/files/${fileId}/download`,
      { responseType: 'blob' },
    );

    return res.data;
  },

  getPurchaseOrderCandidates: async (
    invoiceId: string,
  ): Promise<PurchaseOrderCandidatesResponse> => {
    const res = await api.get<PurchaseOrderCandidatesResponse>(
      `/ocr/invoices/${invoiceId}/po-candidates`,
    );

    return res.data;
  },

  bindPurchaseOrder: async (
    invoiceId: string,
    poNumber: string,
  ): Promise<InvoiceResponse> => {
    const res = await api.post<InvoiceResponse>(
      `/ocr/invoices/${invoiceId}/bind-po`,
      { poNumber },
    );

    return res.data;
  },

  /** A true PATCH: only the fields that are included will change. */
  updateInvoiceData: async (
    id: string,
    data: InvoiceUpdatePayload,
  ): Promise<InvoiceResponse> => {
    const res = await api.patch<InvoiceResponse>(`/ocr/invoices/${id}`, data);
    return res.data;
  },

  validateInvoiceStatus: async (
    id: string,
    status: 'VALIDATED' | 'MATCHED',
  ): Promise<InvoiceResponse> => {
    const res = await api.put<InvoiceResponse>(`/ocr/invoices/${id}/validate`, {
      status,
    });

    return res.data;
  },

  submitToBusinessCentral: async (id: string): Promise<SubmitToBcResponse> => {
    const res = await api.post<SubmitToBcResponse>(
      `/ocr/invoices/${id}/submit-bc`,
    );

    return res.data;
  },

  deleteInvoice: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/ocr/invoices/${id}`);
    return res.data;
  },
};
