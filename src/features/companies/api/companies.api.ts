import { api } from '../../../services/api';

export interface AccessibleCompany {
  id: string;
  code: string;
  name: string;
  currency: string;
  isDefault: boolean;
  /** Invoice OCR is only available when a super administrator enables it. */
  ocrInvoiceEnabled: boolean;
  /** Expense receipt OCR is only available when a super administrator enables it. */
  ocrExpenseEnabled: boolean;
}

export interface CompanySettings extends Omit<AccessibleCompany, 'isDefault'> {
  isActive: boolean;
  accruedAccountNo: string;
  accruedAccountName: string;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  journalInitials: string;
  pettyCashJournalInitials: string;
  accrualAreaCode: string;
}

export interface CreateCompanyInput {
  code: string;
  name: string;
  currency?: string;
  journalInitials?: string;
  pettyCashJournalInitials?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  currency?: string;
  journalInitials?: string;
  pettyCashJournalInitials?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  isActive?: boolean;
}

export type ClearScope = 'all' | 'company';

export interface ClearDatabaseInput {
  scope: ClearScope;
  companyId?: string;
  confirm: string;
}

export interface ClearDatabaseResult {
  message: string;
  scope: ClearScope;
  company?: { id: string; code: string; name: string };
  deleted: Record<string, number | boolean>;
}

export const companiesApi = {
  listAccessible: async (): Promise<AccessibleCompany[]> => {
    const res = await api.get<AccessibleCompany[]>('/companies/accessible');
    return res.data;
  },

  setDefault: async (companyId: string): Promise<void> => {
    await api.put('/companies/default', { companyId });
  },

  /** Accessible only to a super administrator. */
  listSettings: async (): Promise<CompanySettings[]> => {
    const res = await api.get<CompanySettings[]>('/companies/settings');
    return res.data;
  },

  create: async (input: CreateCompanyInput): Promise<CompanySettings> => {
    const res = await api.post<CompanySettings>('/companies', input);
    return res.data;
  },

  update: async (
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<CompanySettings> => {
    const res = await api.put<CompanySettings>(
      `/companies/${companyId}`,
      input,
    );
    return res.data;
  },

  remove: async (companyId: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(
      `/companies/${companyId}`,
    );
    return res.data;
  },

  updateOcrSettings: async (
    companyId: string,
    settings: { ocrInvoiceEnabled?: boolean; ocrExpenseEnabled?: boolean },
  ): Promise<CompanySettings> => {
    const res = await api.put<CompanySettings>(
      `/companies/${companyId}/ocr-settings`,
      settings,
    );
    return res.data;
  },

  clearDatabase: async (
    input: ClearDatabaseInput,
  ): Promise<ClearDatabaseResult> => {
    const res = await api.post<ClearDatabaseResult>(
      '/companies/maintenance/clear',
      input,
    );
    return res.data;
  },

  /** Returns the full JSON snapshot of one company's data. */
  exportCompany: async (companyId: string): Promise<unknown> => {
    const res = await api.get<unknown>(`/companies/${companyId}/export`);
    return res.data;
  },
};
