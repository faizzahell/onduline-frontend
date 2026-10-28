import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Trash2,
} from 'lucide-react';

import {
  companiesApi,
  type ClearScope,
} from '../../companies/api/companies.api';

const CONFIRM_PHRASE = 'CLEAR';

export default function DatabaseToolsPage() {
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<ClearScope>('all');
  const [clearCompanyId, setClearCompanyId] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const [exportCompanyId, setExportCompanyId] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: companiesApi.listSettings,
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      companiesApi.clearDatabase({
        scope,
        companyId: scope === 'company' ? clearCompanyId : undefined,
        confirm,
      }),
    onSuccess: async (result) => {
      setClearError(null);
      setClearResult(result.message);
      setConfirm('');
      // Everything may have changed; drop the whole cache.
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      setClearResult(null);
      setClearError(toMessage(error));
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => companiesApi.exportCompany(exportCompanyId),
    onSuccess: (data) => {
      setExportError(null);

      const company = companies.find((c) => c.id === exportCompanyId);
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `ofda-export-${company?.code ?? 'company'}-${stamp}.json`;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => setExportError(toMessage(error)),
  });

  const clearDisabled =
    clearMutation.isPending ||
    confirm !== CONFIRM_PHRASE ||
    (scope === 'company' && !clearCompanyId);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Database Tools</h2>
            <p className="text-xs text-slate-500 mt-1">
              Development utilities for resetting and exporting data. Limited to
              the super administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Export */}
      <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Export database</h3>
        </div>
        <p className="text-xs text-slate-500">
          Download a JSON snapshot of a single company — its master data and all
          transactions.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={exportCompanyId}
            onChange={(e) => setExportCompanyId(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:border-[#D32F2F] focus:outline-none"
          >
            <option value="" disabled>
              Select a company to export...
            </option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!exportCompanyId || exportMutation.isPending}
            onClick={() => exportMutation.mutate()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs disabled:opacity-50"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export
          </button>
        </div>

        {exportError && (
          <p className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{exportError}</span>
          </p>
        )}
      </section>

      {/* Clear */}
      <section className="bg-white p-6 rounded-2xl border border-red-200/70 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900">Clear database</h3>
        </div>

        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Destructive and irreversible. Clearing removes invoices, expenses,
            petty cash, and users —{' '}
            <strong>every user except the super administrators is kept</strong>{' '}
            only when clearing all. Intended for development.
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              name="scope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
              className="mt-0.5"
            />
            <span>
              <span className="block font-bold text-slate-800">
                Clear all database
              </span>
              <span className="block text-slate-500">
                Wipes every company and all non-super-administrator users.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              name="scope"
              checked={scope === 'company'}
              onChange={() => setScope('company')}
              className="mt-0.5"
            />
            <span className="flex-1">
              <span className="block font-bold text-slate-800">
                Clear by company
              </span>
              <span className="block text-slate-500 mb-2">
                Keeps the company record, clears its data.
              </span>
              {scope === 'company' && (
                <select
                  value={clearCompanyId}
                  onChange={(e) => setClearCompanyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-[#D32F2F] focus:outline-none"
                >
                  <option value="" disabled>
                    Select a company...
                  </option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </option>
                  ))}
                </select>
              )}
            </span>
          </label>
        </div>

        <div className="space-y-1 text-xs">
          <label className="block font-semibold text-slate-700">
            Type{' '}
            <span className="font-mono text-red-600">{CONFIRM_PHRASE}</span> to
            confirm
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none font-mono"
          />
        </div>

        <button
          type="button"
          disabled={clearDisabled}
          onClick={() => {
            setClearResult(null);
            clearMutation.mutate();
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {clearMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {scope === 'all' ? 'Clear all database' : 'Clear company data'}
        </button>

        {clearError && (
          <p className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{clearError}</span>
          </p>
        )}

        {clearResult && (
          <p className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{clearResult}</span>
          </p>
        )}
      </section>
    </div>
  );
}

function toMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: unknown } } })
    .response;
  const message = response?.data?.message;

  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return error instanceof Error ? error.message : 'Something went wrong';
}
