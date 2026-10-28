import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Link2Off,
  Building2,
  Search,
  Layers,
  ArrowUpRight,
  FileCheck2,
  Loader2,
  Calendar,
  type LucideIcon
} from 'lucide-react';

import { ocrApi, type InvoiceStatus } from '../api/ocr.api';

interface SummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  badge?: React.ReactNode;
}

export default function ObmDashboardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['ocr', 'common']);
  const [activeTab, setActiveTab] = useState<
    'all' | 'ready' | 'po_needed' | 'posted'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: invoices = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: ocrApi.getInvoices,
    refetchInterval: 10000,
  });

  const totalInvoices = invoices.length;
  const matchedCount = invoices.filter(
    (i) => i.status === 'MATCHED' || i.status === 'VALIDATED',
  ).length;
  const poMissingCount = invoices.filter(
    (i) => !i.poNumber && i.status !== 'POSTED' && i.status !== 'SUBMITTED',
  ).length;
  const postedCount = invoices.filter(
    (i) => i.status === 'POSTED' || i.status === 'SUBMITTED',
  ).length;

  const autoMatchRate =
    totalInvoices > 0
      ? ((matchedCount / totalInvoices) * 100).toFixed(1)
      : '0.0';

  const formatCurrency = (
    amount?: number | string | null,
    currencyCode?: string | null,
  ) => {
    if (amount === undefined || amount === null || amount === '') return '-';

    const numAmount = Number(amount);
    if (isNaN(numAmount)) return '-';

    const validCurrency = (currencyCode || 'IDR').toUpperCase().trim();
    const currentLocale = i18n.language === 'id' ? 'id-ID' : 'en-US';

    try {
      return new Intl.NumberFormat(currentLocale, {
        style: 'currency',
        currency: validCurrency,
        minimumFractionDigits: validCurrency === 'IDR' ? 0 : 2,
        maximumFractionDigits: validCurrency === 'IDR' ? 0 : 2,
      }).format(numAmount);
    } catch {
      return `${validCurrency} ${numAmount.toLocaleString(currentLocale)}`;
    }
  };

  const postedInvoices = invoices.filter(
    (i) => i.status === 'POSTED' || i.status === 'SUBMITTED',
  );

  const postedTotalsByCurrency = postedInvoices.reduce<Record<string, number>>(
    (acc, inv) => {
      const curr = (inv.currency || 'IDR').toUpperCase();
      const amt = Number(inv.totalAmount) || 0;
      acc[curr] = (acc[curr] || 0) + amt;
      return acc;
    },
    {},
  );

  const currencyKeys = Object.keys(postedTotalsByCurrency);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      (inv.invoiceNumber?.toLowerCase() || '').includes(
        searchTerm.toLowerCase(),
      ) ||
      (inv.vendorName?.toLowerCase() || '').includes(
        searchTerm.toLowerCase(),
      ) ||
      (inv.poNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'ready')
      return inv.status === 'MATCHED' || inv.status === 'VALIDATED';
    if (activeTab === 'po_needed')
      return (
        !inv.poNumber && inv.status !== 'POSTED' && inv.status !== 'SUBMITTED'
      );
    if (activeTab === 'posted')
      return inv.status === 'POSTED' || inv.status === 'SUBMITTED';
    return true;
  });

  const formatScannedDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = i18n.language === 'id' ? 'id-ID' : 'en-US';

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const renderStatusBadge = (
    status: InvoiceStatus,
    poNumber?: string | null,
  ) => {
    if (status === 'POSTED' || status === 'SUBMITTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 font-bold text-[10px]">
          <FileCheck2 className="w-3 h-3 text-purple-600" />
          {t('ocr:dashboard.statusBadge.posted')}
        </span>
      );
    }

    if (status === 'MATCHED' || status === 'VALIDATED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-[10px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {t('ocr:dashboard.statusBadge.matched')}
        </span>
      );
    }

    if (!poNumber) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-bold text-[10px]">
          <Link2Off className="w-3 h-3 text-amber-600" />
          {t('ocr:dashboard.statusBadge.poMissing')}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 font-bold text-[10px]">
        <RefreshCw className="w-3 h-3 text-blue-600" />
        {t('ocr:dashboard.statusBadge.validating')}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6 select-none text-slate-800 antialiased font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {t('ocr:dashboard.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('ocr:dashboard.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`}
            />
            <span>{t('ocr:dashboard.syncBc')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/invoices/upload')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t('ocr:dashboard.uploadInvoice')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Auto Match Rate */}
        <SummaryCard
          icon={CheckCircle2}
          label={t('ocr:dashboard.stats.autoMatchRate')}
          value={`${autoMatchRate}%`}
          badge={
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
              {t('ocr:dashboard.stats.target', { percent: 80 })}
            </span>
          }
          sub={t('ocr:dashboard.stats.automatedSummary', {
            matched: matchedCount,
            total: totalInvoices,
          })}
        />

        {/* 2. Pending PO */}
        <SummaryCard
          icon={Link2Off}
          label={t('ocr:dashboard.stats.pendingPo')}
          value={poMissingCount}
          sub={
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {t('ocr:dashboard.stats.pendingPoSub')}
            </span>
          }
        />

        {/* 3. Variance Exceptions */}
        <SummaryCard
          icon={AlertTriangle}
          label={t('ocr:dashboard.stats.varianceExceptions')}
          value="0"
          sub={t('ocr:dashboard.stats.varianceSub')}
        />

        {/* 4. Posted to BC */}
        <SummaryCard
          icon={Building2}
          label={t('ocr:dashboard.stats.postedToBc')}
          value={
            currencyKeys.length === 0 ? (
              formatCurrency(0, 'IDR')
            ) : currencyKeys.length === 1 ? (
              <span className="truncate block">
                {formatCurrency(postedTotalsByCurrency[currencyKeys[0]], currencyKeys[0])}
              </span>
            ) : (
              <div className="space-y-0.5">
                {currencyKeys.slice(0, 2).map((curr) => (
                  <div key={curr} className="text-sm font-bold text-slate-900 truncate">
                    {formatCurrency(postedTotalsByCurrency[curr], curr)}
                  </div>
                ))}
              </div>
            )
          }
          sub={t('ocr:dashboard.stats.postedSub', { count: postedCount })}
        />
      </div>

      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('ocr:dashboard.stats.autoMatchRate')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {autoMatchRate}%
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                {t('ocr:dashboard.stats.target', { percent: 80 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {t('ocr:dashboard.stats.automatedSummary', {
                matched: matchedCount,
                total: totalInvoices,
              })}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('ocr:dashboard.stats.pendingPo')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 font-bold flex items-center justify-center shrink-0">
              <Link2Off className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {poMissingCount}
            </div>
            <p className="text-[11px] text-amber-600 font-bold flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              {t('ocr:dashboard.stats.pendingPoSub')}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('ocr:dashboard.stats.varianceExceptions')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#D32F2F] border border-red-100 font-bold flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">0</div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {t('ocr:dashboard.stats.varianceSub')}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('ocr:dashboard.stats.postedToBc')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 font-bold flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            {currencyKeys.length === 0 ? (
              <div className="text-xl font-black text-slate-900">
                {formatCurrency(0, 'IDR')}
              </div>
            ) : currencyKeys.length === 1 ? (
              <div className="text-xl font-black text-slate-900 truncate">
                {formatCurrency(
                  postedTotalsByCurrency[currencyKeys[0]],
                  currencyKeys[0],
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {currencyKeys.slice(0, 2).map((curr) => (
                  <div
                    key={curr}
                    className="text-sm font-black text-slate-900 truncate"
                  >
                    {formatCurrency(postedTotalsByCurrency[curr], curr)}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {t('ocr:dashboard.stats.postedSub', { count: postedCount })}
            </p>
          </div>
        </div>
      </div> */}

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-red-50 text-[#D32F2F] font-bold border border-red-100/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {t('ocr:dashboard.tabs.all', { count: totalInvoices })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ready')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'ready'
                ? 'bg-red-50 text-[#D32F2F] font-bold border border-red-100/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {t('ocr:dashboard.tabs.ready', { count: matchedCount })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('po_needed')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'po_needed'
                ? 'bg-red-50 text-[#D32F2F] font-bold border border-red-100/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {t('ocr:dashboard.tabs.poNeeded', { count: poMissingCount })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posted')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'posted'
                ? 'bg-red-50 text-[#D32F2F] font-bold border border-red-100/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {t('ocr:dashboard.tabs.posted', { count: postedCount })}
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('ocr:dashboard.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#D32F2F] focus:outline-none transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
            <span>{t('ocr:dashboard.table.loading')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">
                    {t('ocr:dashboard.table.invoiceNo')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:dashboard.table.vendor')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:dashboard.table.scannedDate')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:dashboard.table.totalAmount')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:dashboard.table.poNumber')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:dashboard.table.status')}
                  </th>
                  <th className="py-3.5 px-6 text-center">
                    {t('ocr:dashboard.table.action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-400 font-medium"
                    >
                      {t('ocr:dashboard.table.empty')}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/50 transition"
                    >
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {inv.invoiceNumber ||
                          t('ocr:dashboard.table.processing')}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">
                          {inv.vendorName ||
                            t('ocr:dashboard.table.exploringVendor')}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {inv.vendorTaxId || 'Tax ID: -'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatScannedDate(inv.createdAt)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </td>
                      <td className="py-4 px-6">
                        {inv.poNumber ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                            <Layers className="w-3 h-3 text-slate-500" />
                            {inv.poNumber}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            {t('ocr:dashboard.table.missingPo')}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {renderStatusBadge(inv.status, inv.poNumber)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {!inv.poNumber && inv.status !== 'POSTED' ? (
                          <button
                            type="button"
                            onClick={() => navigate('/invoices/po-resolution')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                          >
                            <span>{t('ocr:dashboard.actions.resolvePo')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/invoices/${inv.id}/review`)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer text-xs"
                          >
                            <span>
                              {t('ocr:dashboard.actions.verifyAndMatch')}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, badge }: SummaryCardProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <Icon className="w-4 h-4 text-[#D32F2F]" />
          <span>{label}</span>
        </div>
        {badge}
      </div>
      <div className="text-lg font-bold text-slate-900 mt-2">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{sub}</div>}
    </div>
  );
}
