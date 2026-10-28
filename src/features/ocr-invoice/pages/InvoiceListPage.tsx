import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileCheck2,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Trash2,
  Calendar,
  Layers,
  X,
} from 'lucide-react';

import {
  ocrApi,
  type InvoiceStatus,
  type InvoiceResponse,
} from '../api/ocr.api';

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation(['ocr', 'common']);

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InvoiceResponse | null>(
    null,
  );

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: ocrApi.getInvoices,
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ocrApi.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteTarget(null);
    },
  });

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

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    return (
      (inv.invoiceNumber?.toLowerCase() || '').includes(term) ||
      (inv.vendorName?.toLowerCase() || '').includes(term) ||
      (inv.poNumber?.toLowerCase() || '').includes(term)
    );
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'UPLOADED':
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            {t('ocr:list.status.ocrProcessing', 'OCR Extraction')}
          </span>
        );
      case 'EXTRACTED':
      case 'VALIDATION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 text-blue-600" />
            {t('ocr:list.status.needsReview', 'Needs Review')}
          </span>
        );
      case 'MATCHED':
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t('ocr:list.status.matched', '3-Way Matched')}
          </span>
        );
      case 'SUBMITTED':
      case 'POSTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
            <FileCheck2 className="w-3 h-3 text-purple-600" />
            {t('ocr:list.status.postedBc', 'Posted BC')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
            {t('ocr:list.status.failed', 'OCR Failed')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 p-6 select-none text-slate-800 antialiased font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {t(
              'ocr:list.title',
              'Building Material Invoice Verification (OBM)',
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'ocr:list.subtitle',
              'Track OCR extraction status, PO/GRN 3-way matching, and document posting to Microsoft Dynamics 365 Business Central.',
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/invoices/upload')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>{t('ocr:list.uploadBtn', 'Upload New Invoice')}</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t(
              'ocr:list.searchPlaceholder',
              'Search by invoice no., vendor, or PO no....',
            )}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#D32F2F] focus:outline-none transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
            <span>{t('ocr:list.loading', 'Loading invoice files...')}</span>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">
                    {t('ocr:list.tableCol.invoiceNo', 'Invoice No.')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:list.tableCol.vendor', 'Vendor / Supplier')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:list.tableCol.scannedDate', 'Scanned Date')}
                  </th>
                  <th className="py-3.5 px-6 text-center">
                    {t('ocr:list.tableCol.linesCount', 'Line Items')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:list.tableCol.poNumber', 'BC PO No.')}
                  </th>
                  <th className="py-3.5 px-6 text-right">
                    {t('ocr:list.tableCol.totalAmount', 'Total Billed')}
                  </th>
                  <th className="py-3.5 px-6">
                    {t('ocr:list.tableCol.status', 'Workflow Status')}
                  </th>
                  <th className="py-3.5 px-6 text-center">
                    {t('ocr:list.tableCol.action', 'Action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 text-center text-slate-400 font-medium"
                    >
                      {t('ocr:list.tableEmpty', 'No invoices found yet.')}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/50 transition"
                    >
                      <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber || (
                          <span className="text-slate-400 font-normal italic">
                            {t('ocr:list.processingNo', 'Not Extracted')}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">
                          {inv.vendorName || (
                            <span className="text-slate-400 font-normal italic">
                              {t(
                                'ocr:list.exploringVendor',
                                'Detecting Vendor...',
                              )}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {inv.vendorTaxId
                            ? `Tax ID: ${inv.vendorTaxId}`
                            : 'Tax ID: -'}
                        </p>
                      </td>

                      <td className="py-4 px-6 text-slate-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatScannedDate(inv.createdAt)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {inv.lines?.length || 0}{' '}
                          {t('ocr:list.itemsLabel', 'Items')}
                        </span>
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-700 whitespace-nowrap">
                        {inv.poNumber ? (
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {inv.poNumber}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold text-[11px]">
                            {t('ocr:list.missingPo', 'PO Required')}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 font-bold text-slate-900 text-right whitespace-nowrap">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(inv.status)}
                      </td>

                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/invoices/${inv.id}/review`)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer text-xs"
                            title={t(
                              'ocr:list.actions.review',
                              'Review & Matching',
                            )}
                          >
                            <span>
                              {t('ocr:list.actions.reviewBtn', 'Review')}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(inv)}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition cursor-pointer"
                            title={t(
                              'ocr:list.actions.delete',
                              'Delete Invoice',
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#D32F2F] border border-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {t('ocr:list.deleteModal.title', 'Confirm Invoice Deletion')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-600">
              <p>
                {t(
                  'ocr:list.deleteModal.message',
                  'Are you sure you want to delete the following invoice file? This action permanently removes the data from the database along with the related physical files.',
                )}
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <p className="font-bold text-slate-900">
                  {deleteTarget.invoiceNumber ||
                    t('ocr:list.processingNo', 'No Number')}
                </p>
                <p className="text-[11px] text-slate-500">
                  Vendor:{' '}
                  <strong className="text-slate-700">
                    {deleteTarget.vendorName || '-'}
                  </strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Total:{' '}
                  <strong className="text-slate-900">
                    {formatCurrency(
                      deleteTarget.totalAmount,
                      deleteTarget.currency,
                    )}
                  </strong>
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition cursor-pointer text-xs"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer text-xs shadow-xs disabled:opacity-50"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{t('common:delete', 'Delete Permanently')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
