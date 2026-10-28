import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  AlertTriangle,
  Layers,
  CheckCircle2,
  FileText,
  Link2,
  RefreshCw,
  Loader2,
  Building2,
  Check,
  Calendar,
  User,
  Eye,
  X,
  Package,
} from 'lucide-react';

import {
  ocrApi,
  type InvoiceResponse,
  type PurchaseOrderCandidate,
} from '../api/ocr.api';
import {
  CustomSelect,
  type SelectOption,
} from '../../../components/ui/CustomSelect';

export default function PoResolutionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation(['ocr', 'common']);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [searchPoTerm, setSearchPoTerm] = useState('');

  const [viewPoDetail, setViewPoDetail] =
    useState<PurchaseOrderCandidate | null>(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: ocrApi.getInvoices,
  });

  const missingPoInvoices = invoices.filter(
    (i) => !i.poNumber && i.status !== 'POSTED' && i.status !== 'SUBMITTED',
  );

  const activeInvoice: InvoiceResponse | undefined =
    missingPoInvoices.find((i) => i.id === selectedInvoiceId) ||
    missingPoInvoices[0];

  // PO candidates arrive from the backend already sorted by match score.
  const { data: poCandidates, isLoading: isLoadingPOs } = useQuery({
    queryKey: ['po-candidates', activeInvoice?.id],
    queryFn: () => ocrApi.getPurchaseOrderCandidates(activeInvoice!.id),
    enabled: Boolean(activeInvoice?.id),
  });

  const openPOs = poCandidates?.candidates ?? [];
  const isUsingMockedBcData = poCandidates?.mocked ?? false;

  const docSelectOptions: SelectOption[] = missingPoInvoices.map((inv) => ({
    value: inv.id,
    label: inv.invoiceNumber || t('ocr:poResolution.noNumber', 'No Number'),
    sublabel: inv.vendorName ?? undefined,
  }));

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

  const bindPoMutation = useMutation({
    mutationFn: ({ invId, poNum }: { invId: string; poNum: string }) =>
      ocrApi.bindPurchaseOrder(invId, poNum),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate(`/invoices/${data.id}/review`);
    },
  });

  const handleBindAndRunMatch = (poNumToBind?: string) => {
    const targetPo = poNumToBind || selectedPoNumber;
    if (!activeInvoice || !targetPo) return;
    bindPoMutation.mutate({ invId: activeInvoice.id, poNum: targetPo });
  };

  const filteredPOs = openPOs.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(searchPoTerm.toLowerCase()) ||
      po.purchaserName.toLowerCase().includes(searchPoTerm.toLowerCase()) ||
      po.status.toLowerCase().includes(searchPoTerm.toLowerCase()),
  );

  const renderGrnBadge = (grnStatus: string) => {
    switch (grnStatus) {
      case 'FULLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t('ocr:poResolution.grnStatus.fullyReceived', 'GRN Complete')}
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 font-bold text-[10px]">
            <RefreshCw className="w-3 h-3 text-blue-600" />
            {t('ocr:poResolution.grnStatus.partiallyReceived', 'GRN Partial')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-bold text-[10px]">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {t('ocr:poResolution.grnStatus.notReceived', 'No GRN Yet')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 p-6 select-none text-slate-800 antialiased font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {t('ocr:poResolution.title', 'Purchase Order Resolution Lookup')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              'ocr:poResolution.subtitle',
              'The supplier did not include a PO number on the document. Select the matching Business Central Open PO to continue with 3-Way Matching.',
            )}
          </p>
        </div>

        {activeInvoice && (
          <button
            type="button"
            onClick={() => handleBindAndRunMatch()}
            disabled={bindPoMutation.isPending || !selectedPoNumber}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {bindPoMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            <span>
              {t(
                'ocr:poResolution.bindAndMatchBtn',
                'Link PO & Continue to Match',
              )}
            </span>
          </button>
        )}
      </div>

      {missingPoInvoices.length > 0 ? (
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 font-bold flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-950">
                {t('ocr:poResolution.unlinkedDocLabel', 'Document Without PO')}:{' '}
                <span className="underline">
                  {activeInvoice?.invoiceNumber ||
                    t('ocr:poResolution.noNumber', 'No Number')}
                </span>
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {t('ocr:poResolution.vendorLabel', 'Vendor')}:{' '}
                <span className="font-bold">
                  {activeInvoice?.vendorName || '-'}
                </span>{' '}
                • {t('ocr:poResolution.totalBillLabel', 'Total Billed')}:{' '}
                <span className="font-bold text-slate-900">
                  {formatCurrency(
                    activeInvoice?.totalAmount,
                    activeInvoice?.currency,
                  )}
                </span>
              </p>
            </div>
          </div>

          {missingPoInvoices.length > 1 && (
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-amber-800 shrink-0">
                {t(
                  'ocr:poResolution.selectOtherDoc',
                  'Select Another Document',
                )}
                :
              </span>
              <CustomSelect
                options={docSelectOptions}
                value={activeInvoice?.id}
                onChange={(newId) => setSelectedInvoiceId(newId)}
                placeholder={t(
                  'ocr:poResolution.selectInvoicePlaceholder',
                  'Select an invoice document...',
                )}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-2xs text-center text-slate-500 text-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-slate-800">
            {t(
              'ocr:poResolution.emptyMissingTitle',
              'No invoices require PO resolution.',
            )}
          </p>
          <p className="text-slate-400 mt-0.5">
            {t(
              'ocr:poResolution.emptyMissingSub',
              'Every invoice is already linked to a Business Central Purchase Order.',
            )}
          </p>
        </div>
      )}

      {isUsingMockedBcData && (
        <div
          role="status"
          className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2.5 text-[11px] text-slate-600"
        >
          <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {t(
              'ocr:poResolution.mockedBcNotice',
              'The Business Central integration is not active yet. The Open PO list below is sample data, not production data.',
            )}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#D32F2F]" />
            <span className="text-xs font-bold text-slate-900">
              {t(
                'ocr:poResolution.tableTitle',
                'Vendor Open PO List in Business Central',
              )}
            </span>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchPoTerm}
              onChange={(e) => setSearchPoTerm(e.target.value)}
              placeholder={t(
                'ocr:poResolution.searchPlaceholder',
                'Search by PO No., purchaser, or status...',
              )}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#D32F2F] focus:outline-none transition"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
          {isLoadingPOs ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#D32F2F]" />
              <span>{t('common:loading', 'Loading Open PO list...')}</span>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12">
                      {t('ocr:poResolution.tableCol.select', 'Select')}
                    </th>
                    <th className="py-3.5 px-6">
                      {t('ocr:poResolution.tableCol.poNumber', 'BC PO No.')}
                    </th>
                    <th className="py-3.5 px-6">
                      {t('ocr:poResolution.tableCol.orderDate', 'Order Date')}
                    </th>
                    <th className="py-3.5 px-6">
                      {t(
                        'ocr:poResolution.tableCol.purchaser',
                        'Buyer / Purchaser',
                      )}
                    </th>
                    <th className="py-3.5 px-6 text-center">
                      {t('ocr:poResolution.tableCol.linesCount', 'Line Items')}
                    </th>
                    <th className="py-3.5 px-6 text-right">
                      {t(
                        'ocr:poResolution.tableCol.totalAmount',
                        'Total PO Value',
                      )}
                    </th>
                    <th className="py-3.5 px-6">
                      {t('ocr:poResolution.tableCol.grnStatus', 'GRN Status')}
                    </th>
                    <th className="py-3.5 px-6 text-center">
                      {t('ocr:poResolution.tableCol.status', 'BC Status')}
                    </th>
                    <th className="py-3.5 px-6 text-center">
                      {t('ocr:poResolution.tableCol.action', 'Action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-400 font-medium"
                      >
                        {t(
                          'ocr:poResolution.tableEmpty',
                          'No Open PO found for this vendor.',
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po) => {
                      const isSelected = selectedPoNumber === po.poNumber;

                      return (
                        <tr
                          key={po.poNumber}
                          onClick={() => setSelectedPoNumber(po.poNumber)}
                          className={`transition cursor-pointer ${
                            isSelected
                              ? 'bg-red-50/40 hover:bg-red-50/60'
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <td className="py-4 px-4 text-center">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center mx-auto transition ${
                                isSelected
                                  ? 'bg-[#D32F2F] border-[#D32F2F] text-white shadow-2xs'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 stroke-3" />
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="font-bold text-slate-900">
                              {po.poNumber}
                            </span>
                            <span
                              className="block text-[10px] font-semibold text-slate-400 mt-0.5"
                              title={t(
                                'ocr:poResolution.matchScoreHint',
                                'Heuristic match score based on the billed amount and the vendor name',
                              )}
                            >
                              {t('ocr:poResolution.matchScore', 'Match')}:{' '}
                              {po.matchScorePercent}%
                            </span>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium">
                                {po.orderDate}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-800">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold">
                                {po.purchaserName}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                              <Layers className="w-3 h-3 text-slate-400" />
                              {po.linesCount}{' '}
                              {t('ocr:poResolution.lines', 'Items')}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(po.totalAmount, po.currency)}
                          </td>

                          <td className="py-4 px-6 whitespace-nowrap">
                            {renderGrnBadge(po.grnStatus)}
                          </td>

                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase">
                              {po.status}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewPoDetail(po);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer text-xs"
                              title={t(
                                'ocr:poResolution.actions.viewDetail',
                                'View PO Data Details',
                              )}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>
                                {t('ocr:poResolution.actions.view', 'Detail')}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewPoDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D32F2F] border border-red-100 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {t(
                        'ocr:poResolution.modal.title',
                        'Business Central Purchase Order Details',
                      )}
                    </h3>
                    <span className="font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-xs">
                      {viewPoDetail.poNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vendor:{' '}
                    <strong className="text-slate-800">
                      {viewPoDetail.vendorName}
                    </strong>{' '}
                    ({viewPoDetail.vendorNo})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewPoDetail(null)}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 border border-slate-100 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {t('ocr:poResolution.modal.orderDate', 'Order Date')}
                  </span>
                  <span className="font-bold text-slate-800">
                    {viewPoDetail.orderDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {t('ocr:poResolution.modal.purchaser', 'Buyer / Purchaser')}
                  </span>
                  <span className="font-bold text-slate-800">
                    {viewPoDetail.purchaserName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {t('ocr:poResolution.modal.grnStatus', 'Receipt Status')}
                  </span>
                  <div className="mt-0.5">
                    {renderGrnBadge(viewPoDetail.grnStatus)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    {t('ocr:poResolution.modal.totalAmount', 'Total PO Value')}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(
                      viewPoDetail.totalAmount,
                      viewPoDetail.currency,
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>
                    {t(
                      'ocr:poResolution.modal.linesTitle',
                      'Goods / Service Item Details (PO Lines)',
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {viewPoDetail.linesCount} Items
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <th className="py-2.5 px-3">NO. ITEM</th>
                        <th className="py-2.5 px-3">DESCRIPTION</th>
                        <th className="py-2.5 px-3 text-center">QTY</th>
                        <th className="py-2.5 px-3 text-center">UNIT</th>
                        <th className="py-2.5 px-3 text-right">UNIT PRICE</th>
                        <th className="py-2.5 px-3 text-right">TOTAL AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {viewPoDetail.lines.length > 0 ? (
                        viewPoDetail.lines.map((line) => (
                          <tr
                            key={line.lineNumber}
                            className="hover:bg-slate-50/50"
                          >
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {line.itemNo}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              {line.description}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                              {line.quantity}
                              <span className="block text-[10px] font-normal text-slate-400">
                                {t(
                                  'ocr:poResolution.modal.received',
                                  'Received',
                                )}
                                : {line.receivedQuantity}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                              {line.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">
                              {formatCurrency(
                                line.unitPrice,
                                viewPoDetail.currency,
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatCurrency(
                                line.lineTotal,
                                viewPoDetail.currency,
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-6 text-center text-slate-400"
                          >
                            {t(
                              'ocr:poResolution.modal.noLines',
                              'There are no line item details for this PO.',
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewPoDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition cursor-pointer text-xs"
              >
                {t('common:close', 'Close')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPoNumber(viewPoDetail.poNumber);
                  setViewPoDetail(null);
                  handleBindAndRunMatch(viewPoDetail.poNumber);
                }}
                disabled={bindPoMutation.isPending}
                className="px-5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer text-xs shadow-xs disabled:opacity-50"
              >
                {bindPoMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {t(
                    'ocr:poResolution.modal.selectAndBindBtn',
                    'Select & Link This PO',
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
