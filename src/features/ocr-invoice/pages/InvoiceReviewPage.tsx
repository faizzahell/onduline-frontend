import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  FileText,
  Save,
  Send,
  Loader2,
  Layers,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Eye,
  Search,
  FileCode2,
  CheckCircle2,
  Plus,
  Trash2,
  UserCheck,
  Building2,
  Check,
  X,
  Lock,
} from 'lucide-react';

import { ocrApi, type InvoiceLineItem } from '../api/ocr.api';
import {
  COST_CENTER_OPTIONS,
  DEFAULT_COST_CENTER,
  DEFAULT_GL_ACCOUNT,
  GL_ACCOUNT_OPTIONS,
} from '../gl-allocation.constants';
import {
  CustomSelect,
  type SelectOption,
} from '../../../components/ui/CustomSelect';

const BASE_CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'IDR', label: 'IDR', sublabel: 'Indonesian Rupiah' },
  { value: 'MYR', label: 'MYR', sublabel: 'Malaysian Ringgit' },
  { value: 'USD', label: 'USD', sublabel: 'US Dollar' },
  { value: 'EUR', label: 'EUR', sublabel: 'Euro' },
  { value: 'SGD', label: 'SGD', sublabel: 'Singapore Dollar' },
];

export default function InvoiceReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation(['ocr', 'common']);

  const [activeTab, setActiveTab] = useState<'extraction' | 'match' | 'gl'>(
    'extraction',
  );

  const [viewMode, setViewMode] = useState<'asli' | 'result'>('asli');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0, show: false });

  const [fileObjectUrl, setFileObjectUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const [vendorName, setVendorName] = useState('');
  const [vendorTaxId, setVendorTaxId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  const [currencyOptions, setCurrencyOptions] = useState<SelectOption[]>(
    BASE_CURRENCY_OPTIONS,
  );

  const [lines, setLines] = useState<InvoiceLineItem[]>([]);

  const [glAccount, setGlAccount] = useState(DEFAULT_GL_ACCOUNT);
  const [costCenter, setCostCenter] = useState(DEFAULT_COST_CENTER);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);

  const {
    data: invoice,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => ocrApi.getInvoiceById(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (invoice) {
      setVendorName(invoice.vendorName || '');
      setVendorTaxId(invoice.vendorTaxId || '');
      setInvoiceNumber(invoice.invoiceNumber || '');
      setPoNumber(invoice.poNumber || '');
      setInvoiceDate(
        invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : '',
      );
      setDueDate(invoice.dueDate ? invoice.dueDate.split('T')[0] : '');

      const dbCurrency = (invoice.currency || 'IDR').toUpperCase();
      setCurrency(dbCurrency);

      const exists = BASE_CURRENCY_OPTIONS.some(
        (opt) => opt.value === dbCurrency,
      );
      if (!exists) {
        setCurrencyOptions([
          ...BASE_CURRENCY_OPTIONS,
          {
            value: dbCurrency,
            label: dbCurrency,
            sublabel: 'Database Currency',
          },
        ]);
      } else {
        setCurrencyOptions(BASE_CURRENCY_OPTIONS);
      }

      setSubtotal(Number(invoice.subtotal) || 0);
      setTaxAmount(Number(invoice.taxAmount) || 0);
      setTotalAmount(Number(invoice.totalAmount) || 0);
      setLines(invoice.lines && invoice.lines.length > 0 ? invoice.lines : []);
    }
  }, [invoice]);

  // Returning the zoom to 100% means the document fits the canvas again, so the
  // pan offset is reset in the same event handler rather than through an effect.
  const adjustZoom = (delta: number) => {
    const next = Math.min(200, Math.max(50, zoomLevel + delta));

    setZoomLevel(next);

    if (next === 100) {
      setPanPos({ x: 0, y: 0 });
    }
  };

  const mainFileId = invoice?.files?.[0]?.id ?? null;

  // Invoice files are protected by a guard, so they cannot be used directly as
  // the URL of an <embed>/<img> tag: the browser would not send the
  // Authorization header. The file is fetched through axios and then turned
  // into an object URL.
  useEffect(() => {
    if (!id || !mainFileId) {
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    ocrApi
      .downloadInvoiceFile(id, mainFileId)
      .then((blob) => {
        if (!active) return;

        objectUrl = URL.createObjectURL(blob);
        setFileObjectUrl(objectUrl);
      })
      .catch((error: Error) => {
        if (active) setFileError(error.message);
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id, mainFileId]);

  const formatCurrency = (
    amount?: number | string | null,
    currCode?: string | null,
  ) => {
    if (amount === undefined || amount === null || amount === '') return '-';
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return '-';

    const validCurrency = (currCode || currency || 'IDR').toUpperCase().trim();
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const locale = i18n.language === 'id' ? 'id-ID' : 'en-US';

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMagnifierActive) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isMagnifierActive) {
      setMagnifierPos({ x, y, show: true });
      return;
    }

    if (isDragging) {
      setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
    setIsDragging(false);
    setMagnifierPos((prev) => ({ ...prev, show: false }));
  };

  const handleLineChange = (
    index: number,
    field: keyof InvoiceLineItem,
    value: any,
  ) => {
    const updated = [...lines];
    const current = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const q =
        field === 'quantity'
          ? Number(value) || 0
          : Number(current.quantity) || 0;
      const p =
        field === 'unitPrice'
          ? Number(value) || 0
          : Number(current.unitPrice) || 0;
      current.lineTotal = q * p;
    }

    updated[index] = current;
    setLines(updated);

    const newSubtotal = updated.reduce(
      (sum, item) => sum + (Number(item.lineTotal) || 0),
      0,
    );
    setSubtotal(newSubtotal);
    setTotalAmount(newSubtotal + (Number(taxAmount) || 0));
  };

  const handleAddLine = () => {
    const newLine: InvoiceLineItem = {
      id: `temp-${Date.now()}`,
      lineNumber: lines.length + 1,
      description: '',
      quantity: 1,
      unit: 'PCS',
      unitPrice: 0,
      taxAmount: 0,
      lineTotal: 0,
    };
    setLines([...lines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = lines.filter((_, idx) => idx !== index);
    setLines(updated);
    const newSubtotal = updated.reduce(
      (sum, item) => sum + (Number(item.lineTotal) || 0),
      0,
    );
    setSubtotal(newSubtotal);
    setTotalAmount(newSubtotal + (Number(taxAmount) || 0));
  };

  // The backend whitelist rejects unknown properties and renumbers the lines
  // itself from their order, so neither `id` nor `lineNumber` is sent.
  const sanitizeLinesPayload = (lineItems: InvoiceLineItem[]) => {
    return lineItems.map((line) => ({
      description: line.description || '',
      quantity: Number(line.quantity) || 0,
      unit: line.unit || 'PCS',
      unitPrice: Number(line.unitPrice) || 0,
      taxAmount: Number(line.taxAmount) || 0,
      lineTotal: Number(line.lineTotal) || 0,
    }));
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      // Empty date fields are not sent: the backend validates them as ISO 8601,
      // and an empty string is not a valid date.
      ocrApi.updateInvoiceData(id!, {
        vendorName,
        vendorTaxId,
        invoiceNumber,
        poNumber,
        ...(invoiceDate ? { invoiceDate } : {}),
        ...(dueDate ? { dueDate } : {}),
        currency,
        subtotal: Number(subtotal) || 0,
        taxAmount: Number(taxAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        lines: sanitizeLinesPayload(lines),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowUpdateModal(false);
    },
  });

  const validateStatusMutation = useMutation({
    mutationFn: (targetStatus: 'VALIDATED' | 'MATCHED') =>
      ocrApi.validateInvoiceStatus(id!, targetStatus),
    onSuccess: (_, targetStatus) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (targetStatus === 'VALIDATED') {
        setShowValidateModal(false);
        setActiveTab('match');
      }
      if (targetStatus === 'MATCHED') {
        setShowMatchModal(false);
        setActiveTab('gl');
      }
    },
  });

  const submitBcMutation = useMutation({
    mutationFn: () => ocrApi.submitToBusinessCentral(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/invoices');
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#D32F2F]" />
        <span>
          {t('ocr:review.loading', 'Loading invoice verification data...')}
        </span>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-xs font-bold text-slate-800">
          {t('ocr:review.notFound', 'Invoice not found or an error occurred.')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
        >
          {t('common:back', 'Back to List')}
        </button>
      </div>
    );
  }

  const mainFile = invoice.files.length > 0 ? invoice.files[0] : null;
  const isPdf =
    mainFile?.mimeType?.includes('pdf') ||
    mainFile?.originalName?.toLowerCase().endsWith('.pdf');

  // const latestOcrResult = invoice.ocrJobs.find((job) => job.result)?.result;
  // const confidencePercent =
  //   latestOcrResult?.confidence === undefined ||
  //   latestOcrResult?.confidence === null
  //     ? null
  //     : Number(latestOcrResult.confidence) * 100;

  const isValidated = ['VALIDATED', 'MATCHED', 'SUBMITTED', 'POSTED'].includes(
    invoice.status,
  );
  const isMatched = ['MATCHED', 'SUBMITTED', 'POSTED'].includes(invoice.status);

  return (
    <div className="space-y-6 p-6 select-none text-slate-800 antialiased font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                {t('ocr:review.title', 'Review Invoice')}:{' '}
                {invoice.invoiceNumber || t('ocr:review.noNumber', 'No Number')}
              </h1>
              {/* <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[#D32F2F] text-[10px] font-bold border border-red-100/80">
                <Sparkles className="w-3 h-3" />
                {invoice.ocrJobs[0]?.provider ??
                  t('ocr:review.extractionLabel', 'AI Extraction')}
                {confidencePercent !== null &&
                  `: ${confidencePercent.toFixed(1)}%`}
              </span> */}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('ocr:review.vendorLabel', 'Vendor')}:{' '}
              <span className="font-semibold text-slate-700">
                {invoice.vendorName || '-'}
              </span>{' '}
              | {t('ocr:review.poRefLabel', 'PO Ref')}:{' '}
              <span className="font-semibold text-slate-700">
                {invoice.poNumber || t('ocr:review.unlinkedPo', 'Not Linked')}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => submitBcMutation.mutate()}
            disabled={submitBcMutation.isPending || !isMatched}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 ${
              isMatched
                ? 'bg-[#D32F2F] hover:bg-red-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
            title={
              !isMatched
                ? t(
                    'ocr:review.submitDisabledTooltip',
                    'Requires MATCHED status first',
                  )
                : ''
            }
          >
            {submitBcMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {t('ocr:review.submitBcBtn', 'Submit to Business Central')}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-180px)] min-h-150">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-2xs flex flex-col overflow-hidden h-full">
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-w-0">
              <FileText className="w-4 h-4 text-[#D32F2F] shrink-0" />
              <span className="truncate max-w-44">
                {mainFile?.originalName || 'Invoice_Document.pdf'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center p-0.5 bg-slate-200/80 rounded-xl text-[10px] font-bold mr-1">
                <button
                  type="button"
                  onClick={() => setViewMode('asli')}
                  className={`px-2 py-1 rounded-lg transition ${
                    viewMode === 'asli'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />{' '}
                    {t('ocr:review.viewerOriginal', 'Original')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('result')}
                  className={`px-2 py-1 rounded-lg transition ${
                    viewMode === 'result'
                      ? 'bg-white text-[#D32F2F] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <FileCode2 className="w-3 h-3" />{' '}
                    {t('ocr:review.viewerResult', 'Result')}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMagnifierActive(!isMagnifierActive);
                  setMagnifierPos((prev) => ({ ...prev, show: false }));
                }}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isMagnifierActive
                    ? 'bg-red-50 border-[#D32F2F] text-[#D32F2F]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => adjustZoom(-10)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold text-slate-500 min-w-9 text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => adjustZoom(10)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            className={`flex-1 bg-slate-200/60 p-4 overflow-hidden relative flex items-center justify-center select-none ${
              isMagnifierActive
                ? 'cursor-crosshair'
                : isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
            }`}
          >
            {isMagnifierActive && magnifierPos.show && (
              <div
                style={{
                  position: 'absolute',
                  left: `${magnifierPos.x - 60}px`,
                  top: `${magnifierPos.y - 60}px`,
                  width: '120px',
                  height: '120px',
                  pointerEvents: 'none',
                }}
                className="z-30 rounded-full border-2 border-[#D32F2F] bg-white/90 shadow-xl flex items-center justify-center overflow-hidden"
              >
                <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  {zoomLevel * 2}%
                </span>
              </div>
            )}

            {viewMode === 'asli' ? (
              mainFile && fileObjectUrl ? (
                <div
                  style={{
                    transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomLevel / 100})`,
                    transformOrigin: 'center center',
                  }}
                  className="w-full h-full flex items-center justify-center transition-transform duration-75"
                >
                  {isPdf ? (
                    <embed
                      src={`${fileObjectUrl}#toolbar=0`}
                      type="application/pdf"
                      className="w-full h-full min-h-125 rounded-lg border border-slate-300 shadow-md bg-white pointer-events-auto"
                    />
                  ) : (
                    <img
                      src={fileObjectUrl}
                      alt={mainFile.originalName}
                      className="max-w-full max-h-full object-contain rounded-lg border border-slate-300 shadow-md"
                    />
                  )}
                </div>
              ) : (
                <div className="text-slate-400 text-xs flex flex-col items-center gap-1">
                  {mainFile && !fileError ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                      <span>
                        {t('ocr:review.loadingDocument', 'Loading document...')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-6 h-6 text-slate-300" />
                      <span>
                        {fileError ??
                          t(
                            'ocr:review.noDocumentFile',
                            'The document file could not be found',
                          )}
                      </span>
                    </>
                  )}
                </div>
              )
            ) : (
              <div
                style={{
                  transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomLevel / 100})`,
                  transformOrigin: 'center center',
                }}
                className="bg-white shadow-md border border-slate-300 w-full min-h-125 rounded-lg p-6 flex flex-col justify-between text-xs transition-transform duration-150"
              >
                <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm uppercase text-slate-900">
                      {vendorName || 'PT SUPPLIER UTAMA'}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Tax ID: {vendorTaxId || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-[#D32F2F]">
                      INVOICE
                    </span>
                    <p className="font-bold text-slate-800">
                      {invoiceNumber || '-'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {t('ocr:review.form.invoiceDate', 'Invoice Date')}:{' '}
                      {invoiceDate || '-'}
                    </p>
                  </div>
                </div>

                <div className="my-4 space-y-2 overflow-y-auto max-h-60 scrollbar-thin">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-500 font-bold">
                        <th className="text-left py-1">
                          {t('ocr:review.tableCol.description', 'DESCRIPTION')}
                        </th>
                        <th className="text-center py-1">
                          {t('ocr:review.tableCol.qty', 'QTY')}
                        </th>
                        <th className="text-right py-1">
                          {t('ocr:review.tableCol.unitPrice', 'PRICE')}
                        </th>
                        <th className="text-right py-1">
                          {t('ocr:review.tableCol.lineTotal', 'TOTAL')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {lines.length > 0 ? (
                        lines.map((l, idx) => (
                          <tr key={l.id || idx}>
                            <td className="py-1">{l.description}</td>
                            <td className="text-center py-1">{l.quantity}</td>
                            <td className="text-right py-1">
                              {formatCurrency(l.unitPrice, currency)}
                            </td>
                            <td className="text-right py-1 font-bold">
                              {formatCurrency(l.lineTotal, currency)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 text-center text-slate-400"
                          >
                            {t(
                              'ocr:review.emptyLinesPreview',
                              'No Line Items to Preview',
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 pt-3 text-right space-y-0.5 text-[11px]">
                  <p className="text-slate-500">
                    {t('ocr:review.form.subtotal', 'Subtotal')}:{' '}
                    <span className="font-bold text-slate-800">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    {t('ocr:review.form.taxAmount', 'VAT / Tax')}:{' '}
                    <span className="font-bold text-slate-800">
                      {formatCurrency(taxAmount, currency)}
                    </span>
                  </p>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {t('ocr:review.form.totalAmount', 'Grand Total')}:{' '}
                    {formatCurrency(totalAmount, currency)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-2xs flex flex-col overflow-hidden h-full">
          <div className="p-4 bg-slate-50/80 border-b border-slate-100">
            <div className="relative flex items-center justify-between max-w-xl mx-auto px-4">
              <div className="absolute top-1/2 left-10 right-10 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />

              <div
                className="absolute top-1/2 left-10 -translate-y-1/2 h-0.5 bg-[#D32F2F] transition-all duration-300 z-0"
                style={{
                  width:
                    activeTab === 'extraction'
                      ? '0%'
                      : activeTab === 'match'
                        ? '50%'
                        : '100%',
                }}
              />

              <button
                type="button"
                onClick={() => setActiveTab('extraction')}
                className="relative z-10 flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition border-2 ${
                    activeTab === 'extraction'
                      ? 'bg-[#D32F2F] text-white border-[#D32F2F] ring-4 ring-red-100'
                      : isValidated
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  {isValidated ? <Check className="w-4 h-4 stroke-3" /> : '1'}
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    activeTab === 'extraction'
                      ? 'text-[#D32F2F]'
                      : 'text-slate-600'
                  }`}
                >
                  {t('ocr:review.tabs.extraction', 'OCR Extraction Result')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => isValidated && setActiveTab('match')}
                disabled={!isValidated}
                className={`relative z-10 flex flex-col items-center gap-1 group focus:outline-none ${
                  isValidated
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed opacity-60'
                }`}
                title={
                  !isValidated
                    ? t(
                        'ocr:review.lockExtractionTooltip',
                        'Validate the extraction first',
                      )
                    : ''
                }
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition border-2 ${
                    activeTab === 'match'
                      ? 'bg-[#D32F2F] text-white border-[#D32F2F] ring-4 ring-red-100'
                      : isMatched
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {!isValidated ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : isMatched ? (
                    <Check className="w-4 h-4 stroke-3" />
                  ) : (
                    '2'
                  )}
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    activeTab === 'match' ? 'text-[#D32F2F]' : 'text-slate-600'
                  }`}
                >
                  {t('ocr:review.tabs.match', '3-Way Matching')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => isMatched && setActiveTab('gl')}
                disabled={!isMatched}
                className={`relative z-10 flex flex-col items-center gap-1 group focus:outline-none ${
                  isMatched ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
                title={
                  !isMatched
                    ? t(
                        'ocr:review.lockMatchTooltip',
                        'Confirm the 3-Way match first',
                      )
                    : ''
                }
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition border-2 ${
                    activeTab === 'gl'
                      ? 'bg-[#D32F2F] text-white border-[#D32F2F] ring-4 ring-red-100'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {!isMatched ? <Lock className="w-3.5 h-3.5" /> : '3'}
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    activeTab === 'gl' ? 'text-[#D32F2F]' : 'text-slate-600'
                  }`}
                >
                  {t('ocr:review.tabs.gl', 'G/L Allocation & Dimensions')}
                </span>
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-5 scrollbar-thin">
            {activeTab === 'extraction' && (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      {t(
                        'ocr:review.form.vendorName',
                        'Vendor / Supplier Name',
                      )}
                    </label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      {t('ocr:review.form.vendorTaxId', 'Vendor Tax ID')}
                    </label>
                    <input
                      type="text"
                      value={vendorTaxId}
                      onChange={(e) => setVendorTaxId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      {t(
                        'ocr:review.form.invoiceNumber',
                        'Vendor Invoice Number',
                      )}
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition font-bold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      {t('ocr:review.form.poNumber', 'SAP / BC PO Number')}
                    </label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition font-bold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      {t('ocr:review.form.invoiceDate', 'Invoice Date')}
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      {t('ocr:review.form.dueDate', 'Due Date')}
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#D32F2F]" />
                      <span>
                        {t(
                          'ocr:review.linesTitle',
                          'Line Item Details (Invoice Lines)',
                        )}
                      </span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D32F2F]" />
                      <span>{t('ocr:review.addItemBtn', 'Add Item')}</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <th className="py-2.5 px-3">
                            {t(
                              'ocr:review.tableCol.description',
                              'Item Description',
                            )}
                          </th>
                          <th className="py-2.5 px-2 text-center w-16">
                            {t('ocr:review.tableCol.qty', 'Qty')}
                          </th>
                          <th className="py-2.5 px-2 text-center w-16">
                            {t('ocr:review.tableCol.unit', 'Unit')}
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            {t('ocr:review.tableCol.unitPrice', 'Unit Price')}
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            {t('ocr:review.tableCol.lineTotal', 'Line Total')}
                          </th>
                          <th className="py-2.5 px-2 text-center w-10">
                            {t('ocr:review.tableCol.delete', 'Delete')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lines.map((line, idx) => (
                          <tr
                            key={line.id || idx}
                            className="hover:bg-slate-50/50"
                          >
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={line.description || ''}
                                onChange={(e) =>
                                  handleLineChange(
                                    idx,
                                    'description',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none text-xs"
                                placeholder={t(
                                  'ocr:review.itemNamePlaceholder',
                                  'Goods / service name',
                                )}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={line.quantity ?? 0}
                                onChange={(e) =>
                                  handleLineChange(
                                    idx,
                                    'quantity',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1.5 py-1 text-center rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none font-bold text-xs"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={line.unit || 'PCS'}
                                onChange={(e) =>
                                  handleLineChange(idx, 'unit', e.target.value)
                                }
                                className="w-full px-1.5 py-1 text-center rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none uppercase text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={line.unitPrice ?? 0}
                                onChange={(e) =>
                                  handleLineChange(
                                    idx,
                                    'unitPrice',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 text-right rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none font-semibold text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(line.lineTotal, currency)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="p-1 rounded-md text-slate-400 hover:text-red-600 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs">
                      {t(
                        'ocr:review.summaryTitle',
                        'Transaction Value Summary',
                      )}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {t('ocr:review.currencyLabel', 'Currency')}:
                      </span>
                      <CustomSelect
                        options={currencyOptions}
                        value={currency}
                        onChange={(val) => setCurrency(val)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600">
                        {t(
                          'ocr:review.form.subtotal',
                          'Subtotal (Taxable Base)',
                        )}
                      </label>
                      <input
                        type="number"
                        value={subtotal}
                        onChange={(e) => setSubtotal(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600">
                        {t('ocr:review.form.taxAmount', 'VAT / Tax')}
                      </label>
                      <input
                        type="number"
                        value={taxAmount}
                        onChange={(e) => {
                          const tax = Number(e.target.value);
                          setTaxAmount(tax);
                          setTotalAmount(subtotal + tax);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600">
                        {t('ocr:review.form.totalAmount', 'Grand Total')}
                      </label>
                      <input
                        type="number"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-black text-[#D32F2F]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs"
                  >
                    <Save className="w-4 h-4 text-slate-500" />
                    <span>
                      {t('ocr:review.updateInvoiceBtn', 'Save Invoice Changes')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowValidateModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {t(
                        'ocr:review.validateExtractionBtn',
                        'Validate Extracted Data',
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'match' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">
                        {t(
                          'ocr:review.validatedByLabel',
                          'OCR Extraction Validator',
                        )}
                      </p>
                      <p className="font-bold text-slate-900 text-sm">
                        {invoice.validatedBy
                          ? invoice.validatedBy.name
                          : t('ocr:review.notValidatedYet', 'Not Verified')}
                      </p>
                    </div>
                  </div>

                  {invoice.validatedAt && (
                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        {t('ocr:review.validatedAtLabel', 'Validated At')}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatDate(invoice.validatedAt)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-950">
                        {t(
                          'ocr:review.matchTitle',
                          'Automatic 3-Way Match Reconciliation Result',
                        )}
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        {t('ocr:review.matchSubtitle', {
                          po: invoice.poNumber || 'PO-BC',
                          defaultValue:
                            'The Invoice, Purchase Order ({{po}}), and GRN documents are a perfect match.',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    100% Matched
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <th className="py-3 px-4">
                          {t(
                            'ocr:review.tableCol.description',
                            'ITEM DESCRIPTION',
                          )}
                        </th>
                        <th className="py-3 px-2 text-center">
                          {t('ocr:review.tableCol.invQty', 'INV QTY')}
                        </th>
                        <th className="py-3 px-2 text-center">
                          {t('ocr:review.tableCol.poQty', 'PO QTY')}
                        </th>
                        <th className="py-3 px-2 text-center">
                          {t('ocr:review.tableCol.grnQty', 'GRN QTY')}
                        </th>
                        <th className="py-3 px-4 text-right">
                          {t('ocr:review.tableCol.totalAmount', 'TOTAL AMOUNT')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, idx) => (
                        <tr
                          key={line.id || idx}
                          className="hover:bg-slate-50/50"
                        >
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {line.description}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-900">
                            {line.quantity}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-600">
                            {line.quantity}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-emerald-600">
                            {line.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(line.lineTotal, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowMatchModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {t('ocr:review.validateMatchBtn', 'Confirm 3-Way Match')}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'gl' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-800">
                  <p className="font-bold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-700" />
                    <span>
                      {t(
                        'ocr:review.glTitle',
                        'Business Central G/L Account & Cost Center Allocation',
                      )}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {t(
                      'ocr:review.glSubtitle',
                      'Assign the main G/L account number and the department dimension that bears the cost before the document is sent to Business Central.',
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-700">
                      {t('ocr:review.glAccountLabel', 'Main G/L Account')}
                    </label>
                    <CustomSelect
                      options={GL_ACCOUNT_OPTIONS}
                      value={glAccount}
                      onChange={(val) => setGlAccount(val)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-700">
                      {t(
                        'ocr:review.costCenterLabel',
                        'Department Dimension / Cost Center',
                      )}
                    </label>
                    <CustomSelect
                      options={COST_CENTER_OPTIONS}
                      value={costCenter}
                      onChange={(val) => setCostCenter(val)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUpdateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Save className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {t('ocr:review.modals.updateTitle', 'Confirm Save Changes')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs text-slate-600">
              <p>
                {t(
                  'ocr:review.modals.updateMessage',
                  'Are you sure you want to save all changes to the invoice header data and line item details to the database?',
                )}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition cursor-pointer text-xs"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
              >
                {updateMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{t('ocr:review.modals.confirmSave', 'Yes, Save')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showValidateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {t(
                    'ocr:review.modals.validateTitle',
                    'Confirm Extraction Validation',
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowValidateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs text-slate-600">
              <p>
                {t(
                  'ocr:review.modals.validateMessage',
                  'This action will change the invoice status to VALIDATED and record your name as the validator of this extracted data.',
                )}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowValidateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition cursor-pointer text-xs"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => validateStatusMutation.mutate('VALIDATED')}
                disabled={validateStatusMutation.isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
              >
                {validateStatusMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {t('ocr:review.modals.confirmValidate', 'Yes, Validate')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showMatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {t('ocr:review.modals.matchTitle', 'Confirm 3-Way Match')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMatchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs text-slate-600">
              <p>
                {t(
                  'ocr:review.modals.matchMessage',
                  'This action will confirm the 3-Way Match and change the invoice status to MATCHED, so the document is ready to be submitted to Business Central.',
                )}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMatchModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition cursor-pointer text-xs"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => validateStatusMutation.mutate('MATCHED')}
                disabled={validateStatusMutation.isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
              >
                {validateStatusMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {t('ocr:review.modals.confirmMatch', 'Yes, Confirm Match')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
