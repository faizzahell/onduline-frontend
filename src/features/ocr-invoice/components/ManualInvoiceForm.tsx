import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { ocrApi, type InvoiceLineItem } from '../api/ocr.api';

interface HeaderForm {
  invoiceNumber: string;
  vendorName: string;
  vendorTaxId: string;
  poNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  taxAmount: string;
}

const HEADER_FIELDS = [
  ['invoiceNumber', 'Vendor invoice number', 'text'],
  ['vendorName', 'Vendor name', 'text'],
  ['vendorTaxId', 'Vendor tax ID', 'text'],
  ['poNumber', 'PO number', 'text'],
  ['invoiceDate', 'Invoice date', 'date'],
  ['dueDate', 'Due date', 'date'],
  ['currency', 'Currency', 'text'],
  ['taxAmount', 'Tax amount', 'number'],
] as const;

const emptyHeader: HeaderForm = {
  invoiceNumber: '',
  vendorName: '',
  vendorTaxId: '',
  poNumber: '',
  invoiceDate: '',
  dueDate: '',
  currency: 'IDR',
  taxAmount: '',
};

function emptyLine(): InvoiceLineItem {
  return {
    lineNumber: 0,
    description: '',
    quantity: 1,
    unit: 'PCS',
    unitPrice: 0,
    lineTotal: 0,
  };
}

/**
 * Records an invoice without OCR.
 *
 * Supporting documents are uploaded in the same flow with extraction turned
 * off, so the invoice ends up with its proof attached while the figures stay
 * exactly as typed.
 */
export function ManualInvoiceForm() {
  const navigate = useNavigate();

  const [header, setHeader] = useState<HeaderForm>(emptyHeader);
  const [lines, setLines] = useState<InvoiceLineItem[]>([emptyLine()]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce(
    (total, line) => total + (Number(line.lineTotal) || 0),
    0,
  );

  const taxAmount = Number(header.taxAmount) || 0;
  const totalAmount = subtotal + taxAmount;

  const createMutation = useMutation({
    mutationFn: async () => {
      const invoice = await ocrApi.createManualInvoice({
        invoiceNumber: header.invoiceNumber || undefined,
        vendorName: header.vendorName || undefined,
        vendorTaxId: header.vendorTaxId || undefined,
        poNumber: header.poNumber || undefined,
        ...(header.invoiceDate ? { invoiceDate: header.invoiceDate } : {}),
        ...(header.dueDate ? { dueDate: header.dueDate } : {}),
        currency: header.currency || 'IDR',
        subtotal,
        taxAmount,
        totalAmount,
        // The backend whitelist rejects unknown properties and assigns the
        // line number itself, so only the editable fields are sent: `id` and
        // `lineNumber` are stripped here.
        lines: lines
          .filter((line) => (line.description ?? '').trim().length > 0)
          .map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
          })),
      });

      // Extraction stays off: the figures were typed in, the file is only proof.
      for (const file of files) {
        await ocrApi.uploadInvoiceFile(invoice.id, file, false);
      }

      return invoice;
    },
    onSuccess: (invoice) => {
      navigate(`/invoices/${invoice.id}/review`);
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const updateHeader = (key: keyof HeaderForm, value: string) => {
    setHeader((previous) => ({ ...previous, [key]: value }));
  };

  const updateLine = (
    index: number,
    key: keyof InvoiceLineItem,
    value: string,
  ) => {
    setLines((previous) =>
      previous.map((line, position) => {
        if (position !== index) {
          return line;
        }

        const next = { ...line, [key]: value };

        if (key === 'quantity' || key === 'unitPrice') {
          const quantity =
            Number(key === 'quantity' ? value : line.quantity) || 0;
          const unitPrice =
            Number(key === 'unitPrice' ? value : line.unitPrice) || 0;

          next.quantity = quantity;
          next.unitPrice = unitPrice;
          next.lineTotal = quantity * unitPrice;
        }

        return next;
      }),
    );
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        createMutation.mutate();
      }}
    >
      {/* Layout Grid 2 Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI (Invoice Header & Supporting Document) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Invoice Header */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Invoice header</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {HEADER_FIELDS.map(([key, label, type]) => (
                <div key={key} className="space-y-1">
                  <label
                    className="block font-semibold text-slate-700"
                    htmlFor={`manual-${key}`}
                  >
                    {label}
                  </label>
                  <input
                    id={`manual-${key}`}
                    type={type}
                    value={header[key]}
                    onChange={(event) => updateHeader(key, event.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Supporting Document */}
          <section className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              Supporting document
            </h2>
            <p className="text-[11px] text-slate-500">
              Attach the invoice document as proof. It is stored as an attachment
              only; no extraction runs in manual mode.
            </p>

            <label className="flex items-center justify-center gap-2 px-3 py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 cursor-pointer text-slate-500">
              <Plus className="w-4 h-4" />
              <span>Add PDF or image</span>
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) {
                    setFiles((previous) => [
                      ...previous,
                      ...Array.from(event.target.files!),
                    ]);
                  }
                }}
              />
            </label>

            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setFiles((previous) =>
                          previous.filter((_, position) => position !== index),
                        )
                      }
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* KOLOM KANAN (Invoice Lines) */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Invoice lines</h2>
              <button
                type="button"
                onClick={() => setLines((previous) => [...previous, emptyLine()])}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D32F2F]" />
                Add line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-16 text-center">Unit</th>
                    <th className="py-2.5 px-3 w-28 text-right">Unit price</th>
                    <th className="py-2.5 px-3 w-28 text-right">Line total</th>
                    <th className="py-2.5 px-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          aria-label={`Description for line ${index + 1}`}
                          value={line.description ?? ''}
                          onChange={(event) =>
                            updateLine(index, 'description', event.target.value)
                          }
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          aria-label={`Quantity for line ${index + 1}`}
                          value={line.quantity ?? 0}
                          onChange={(event) =>
                            updateLine(index, 'quantity', event.target.value)
                          }
                          className="w-full px-1.5 py-1 text-center rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          aria-label={`Unit for line ${index + 1}`}
                          value={line.unit ?? ''}
                          onChange={(event) =>
                            updateLine(index, 'unit', event.target.value)
                          }
                          className="w-full px-1.5 py-1 text-center rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none uppercase"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          aria-label={`Unit price for line ${index + 1}`}
                          value={line.unitPrice ?? 0}
                          onChange={(event) =>
                            updateLine(index, 'unitPrice', event.target.value)
                          }
                          className="w-full px-2 py-1 text-right rounded-lg border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {(Number(line.lineTotal) || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          aria-label={`Remove line ${index + 1}`}
                          onClick={() =>
                            setLines((previous) =>
                              previous.filter((_, position) => position !== index),
                            )
                          }
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 text-right text-xs space-y-1">
              <p className="text-slate-500">
                Subtotal{' '}
                <span className="font-bold text-slate-800">
                  {subtotal.toLocaleString('en-US')}
                </span>
              </p>
              <p className="text-slate-500">
                Tax{' '}
                <span className="font-bold text-slate-800">
                  {taxAmount.toLocaleString('en-US')}
                </span>
              </p>
              <p className="text-sm font-black text-slate-900">
                Total {totalAmount.toLocaleString('en-US')}
              </p>
            </div>
          </section>

          {/* Notification Error & Action Buttons */}
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              View invoice list
            </button>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save invoice
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
