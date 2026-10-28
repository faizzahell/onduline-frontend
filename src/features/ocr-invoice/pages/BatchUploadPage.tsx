import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Keyboard,
  Layers,
  Loader2,
  ScanLine,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

import { useCompany } from '../../../hooks/useCompany';
import { ocrApi } from '../api/ocr.api';
import { ManualInvoiceForm } from '../components/ManualInvoiceForm';
import { OCRJobMonitorCard } from '../components/OCRJobMonitorCard';

interface UploadingFileState {
  file: File;
  status: 'idle' | 'uploading' | 'success' | 'error';
  invoiceId?: string;
  errorMessage?: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Purchase invoice intake.
 *
 * Manual entry is the default because OCR is optional and may be closed for
 * the active company. Switching to OCR replaces the form with the batch
 * uploader; the resulting invoices both land in the same review flow.
 */
export default function BatchUploadPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  const [mode, setMode] = useState<'manual' | 'ocr'>('manual');
  const [fileList, setFileList] = useState<UploadingFileState[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const ocrAvailable = activeCompany?.ocrInvoiceEnabled ?? false;

  const uploadProcessMutation = useMutation({
    mutationFn: async (file: File) => {
      const invoice = await ocrApi.createInvoice();
      const result = await ocrApi.uploadInvoiceFile(invoice.id, file, true);
      return { invoice, result };
    },
  });

  const handleFiles = (files: FileList | File[]) => {
    const accepted: UploadingFileState[] = Array.from(files)
      .filter(
        (file) =>
          ALLOWED_TYPES.includes(file.type) && file.size <= MAX_FILE_BYTES,
      )
      .map((file) => ({ file, status: 'idle' }));

    setFileList((previous) => [...previous, ...accepted]);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsHovered(false);

    if (event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files);
    }
  }, []);

  const startBatchUpload = async () => {
    for (let index = 0; index < fileList.length; index += 1) {
      const item = fileList[index];

      if (item.status === 'success') {
        continue;
      }

      setFileList((previous) =>
        previous.map((entry, position) =>
          position === index ? { ...entry, status: 'uploading' } : entry,
        ),
      );

      try {
        const { invoice } = await uploadProcessMutation.mutateAsync(item.file);

        setFileList((previous) =>
          previous.map((entry, position) =>
            position === index
              ? { ...entry, status: 'success', invoiceId: invoice.id }
              : entry,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Upload failed';

        setFileList((previous) =>
          previous.map((entry, position) =>
            position === index
              ? { ...entry, status: 'error', errorMessage: message }
              : entry,
          ),
        );
      }
    }
  };

  const uploadedJobs = fileList.filter((item) => item.invoiceId);

  return (
    <div className="space-y-6 p-6 select-none text-slate-800 antialiased font-sans">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">
            {mode === 'manual' ? 'Record Purchase Invoice' : 'OCR Batch Upload'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'manual'
              ? 'Enter the invoice header and lines, and attach the supporting document. No extraction runs in this mode.'
              : 'Upload vendor invoices and let the extraction engine read them. Results go to the same review screen.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'manual' ? (
            <button
              type="button"
              onClick={() => setMode('ocr')}
              disabled={!ocrAvailable}
              title={
                ocrAvailable
                  ? undefined
                  : `OCR is not enabled for company ${activeCompany?.code ?? ''}. Ask a super administrator to enable it.`
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ScanLine className="w-4 h-4" />
              OCR Process
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('manual')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
              Manual Input
            </button>
          )}
        </div>
      </div>

      {mode === 'manual' && !ocrAvailable && (
        <p
          role="status"
          className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span>
            OCR is currently closed for company {activeCompany?.code ?? '-'}, so
            every invoice is recorded manually. A super administrator can open
            it per company.
          </span>
        </p>
      )}

      {mode === 'manual' ? (
        <ManualInvoiceForm />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsHovered(true);
              }}
              onDragLeave={() => setIsHovered(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl px-8 py-20 text-center transition flex flex-col items-center justify-center gap-3 bg-white ${
                isHovered
                  ? 'border-[#D32F2F] bg-red-50/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D32F2F] border border-red-100 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Drag and drop invoice files here, or{' '}
                  <label className="text-[#D32F2F] hover:underline cursor-pointer">
                    browse files
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={(event) =>
                        event.target.files && handleFiles(event.target.files)
                      }
                    />
                  </label>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PDF, PNG, and JPEG up to 10 MB per file.
                </p>
              </div>
            </div>

            {fileList.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Invoice queue ({fileList.length} files)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFileList([])}
                    className="text-xs text-slate-400 hover:text-red-600 transition cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {fileList.map((item, index) => (
                    <div
                      key={`${item.file.name}-${index}`}
                      className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {item.status === 'idle' && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Ready
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Uploading
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle2 className="w-4 h-4" />
                            Queued
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                            <AlertCircle className="w-4 h-4" />
                            {item.errorMessage ?? 'Failed'}
                          </span>
                        )}

                        <button
                          type="button"
                          aria-label={`Remove ${item.file.name}`}
                          onClick={() =>
                            setFileList((previous) =>
                              previous.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => void startBatchUpload()}
                    disabled={uploadProcessMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {uploadProcessMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>Process batch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/invoices')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    View invoice list
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 text-[#D32F2F] rounded-lg border border-red-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Live extraction
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Job status and extraction results
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 font-bold">
                {uploadedJobs.length} active
              </span>
            </div>

            {uploadedJobs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                <Layers className="w-8 h-8 text-slate-300" />
                <p className="font-semibold text-slate-600">
                  No extraction running
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  Press "Process batch" to start extraction and watch the
                  progress here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-185 overflow-y-auto pr-1">
                {uploadedJobs.map((item) => (
                  <OCRJobMonitorCard
                    key={item.invoiceId}
                    fileName={item.file.name}
                    invoiceId={item.invoiceId!}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
