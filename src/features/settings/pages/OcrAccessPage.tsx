import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';

import {
  companiesApi,
  type CompanySettings,
} from '../../companies/api/companies.api';

type OcrFeature = 'ocrInvoiceEnabled' | 'ocrExpenseEnabled';

/** The two places OCR can be opened, and the page each one unlocks. */
const FEATURES: {
  key: OcrFeature;
  title: string;
  page: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    key: 'ocrInvoiceEnabled',
    title: 'Invoice OCR',
    page: 'Batch Upload Invoices',
    description:
      'Lets the purchasing team upload an invoice document and have the header and line items extracted. While it is closed, invoices are recorded through the manual form.',
    icon: FileText,
  },
  {
    key: 'ocrExpenseEnabled',
    title: 'Expense Receipt OCR',
    page: 'Record Expense',
    description:
      'Lets employees scan a receipt and have the merchant, date, amount, and category suggested. While it is closed, every expense line is keyed in by hand.',
    icon: Receipt,
  },
];

export default function OcrAccessPage() {
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [savedCompanyId, setSavedCompanyId] = useState<string | null>(null);

  const {
    data: companies = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['company-settings'],
    queryFn: companiesApi.listSettings,
  });

  const mutation = useMutation({
    mutationFn: ({
      companyId,
      feature,
      enabled,
    }: {
      companyId: string;
      feature: OcrFeature;
      enabled: boolean;
    }) => companiesApi.updateOcrSettings(companyId, { [feature]: enabled }),
    onSuccess: async (updated) => {
      setError(null);
      setSavedCompanyId(updated.id);

      // The upload pages read these flags from the active company, so both
      // caches have to move together or a page would still refuse OCR.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['company-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['accessible-companies'] }),
      ]);
    },
    onError: (mutationError: Error) => {
      setSavedCompanyId(null);
      setError(mutationError.message);
    },
  });

  const toggle = (
    company: CompanySettings,
    feature: OcrFeature,
    enabled: boolean,
  ) => {
    mutation.mutate({ companyId: company.id, feature, enabled });
  };

  const isBusy = (companyId: string, feature: OcrFeature) =>
    mutation.isPending &&
    mutation.variables?.companyId === companyId &&
    mutation.variables?.feature === feature;

  return (
    <div className="space-y-6 text-slate-800 antialiased font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D32F2F] border border-red-100 flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">OCR Access</h2>
            <p className="text-xs text-slate-500 mt-1">
              Open or close document extraction per company. OCR is an option,
              not a requirement: every page it serves keeps working manually
              while it is closed.
            </p>
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span>
            This screen is limited to the super administrator. Turning a switch
            off never deletes anything: documents that were already extracted
            stay exactly as they are, only the path for new extractions closes.
          </span>
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" />
        </div>
      ) : isError ? (
        <p className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-100">
          Company settings could not be loaded. This screen needs super
          administrator access.
        </p>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 text-[11px] font-bold">
                    {company.code}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      {company.name}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {company.currency}
                      {company.isActive ? '' : ' · inactive'}
                    </p>
                  </div>
                </div>

                {savedCompanyId === company.id && !mutation.isPending && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Saved
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  const enabled = company[feature.key];
                  const busy = isBusy(company.id, feature.key);

                  return (
                    <div
                      key={feature.key}
                      className="p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800">
                            {feature.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Page: {feature.page}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1.5 max-w-xl">
                            {feature.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide ${
                            enabled ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {enabled ? 'Open' : 'Closed'}
                        </span>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={`${feature.title} for ${company.code}`}
                          disabled={busy}
                          onClick={() => toggle(company, feature.key, !enabled)}
                          className={`relative w-11 h-6 rounded-full transition cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F] ${
                            enabled ? 'bg-[#D32F2F]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all flex items-center justify-center ${
                              enabled ? 'left-[22px]' : 'left-0.5'
                            }`}
                          >
                            {busy && (
                              <Loader2 className="w-3 h-3 animate-spin text-[#D32F2F]" />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {companies.length === 0 && (
            <p className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-100">
              <Building2 className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              No companies have been registered yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
