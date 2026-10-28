import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { ocrApi, type OCRJob } from '../api/ocr.api';

interface OCRJobMonitorCardProps {
  fileName: string;
  invoiceId: string;
}

export function OCRJobMonitorCard({
  fileName,
  invoiceId,
}: OCRJobMonitorCardProps) {
  const { t } = useTranslation(['ocr', 'common']);
  const [showDetails, setShowDetails] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['ocrJobs', invoiceId],
    queryFn: () => ocrApi.getOCRJobs(invoiceId),
    refetchInterval: (query) => {
      const latestJob = query.state.data?.[0];
      if (!latestJob) return 3000;
      return latestJob.status === 'COMPLETED' || latestJob.status === 'FAILED'
        ? false
        : 3000;
    },
  });

  const latestJob: OCRJob | undefined = jobs[0];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t('ocr:jobs.status.completed', 'COMPLETED')}
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            {t('ocr:jobs.status.processing', 'PROCESSING')}
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            {t('ocr:jobs.status.failed', 'FAILED')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-amber-600" />
            {t('ocr:jobs.status.pending', 'QUEUED / PENDING')}
          </span>
        );
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-xs text-slate-800 truncate">
            {fileName}
          </p>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
            {t('ocr:jobs.invoiceId', 'Invoice ID')}: {invoiceId.substring(0, 8)}
            ...
          </p>
        </div>
        {getStatusBadge(latestJob?.status)}
      </div>

      {isLoading ? (
        <div className="p-3 bg-slate-50 rounded-lg text-slate-400 text-[11px] flex items-center justify-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D32F2F]" />
          <span>{t('ocr:jobs.connecting', 'Connecting to OCR worker...')}</span>
        </div>
      ) : latestJob ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-600">
            <div className="flex items-center gap-1">
              {/* <Cpu className="w-3 h-3 text-[#D32F2F] shrink-0" /> */}
              <span className="truncate">
                {t('ocr:jobs.engine', 'Engine')}:{' '}
                {/* <strong className="text-slate-800">{latestJob.provider || 'DocAI'}</strong> */}
                <strong className="text-slate-800">SmartEye Luuma</strong>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D32F2F] shrink-0" />
              <span>
                {t('ocr:jobs.confidence', 'Confidence')}:{' '}
                <strong className="text-slate-800">
                  {latestJob.result?.confidence
                    ? `${(Number(latestJob.result.confidence) * 100).toFixed(1)}%`
                    : '-'}
                </strong>
              </span>
            </div>
          </div>

          {latestJob.status === 'FAILED' && latestJob.errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700">
              <strong>{t('common:error', 'Error')}:</strong>{' '}
              {latestJob.errorMessage}
            </div>
          )}

          {latestJob.result && (
            <div className="border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 transition"
              >
                <span className="flex items-center gap-1">
                  <FileCode2 className="w-3.5 h-3.5 text-[#D32F2F]" />
                  {t('ocr:jobs.previewJson', 'Preview Extracted JSON Result')}
                </span>
                {showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showDetails && (
                <div className="mt-2 p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[10px] max-h-52 overflow-y-auto space-y-1">
                  {latestJob.result.rawJson ? (
                    <pre className="whitespace-pre-wrap leading-tight">
                      {JSON.stringify(latestJob.result.rawJson, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-slate-400 leading-normal">
                      {latestJob.result.rawText ||
                        t('ocr:jobs.noTextDetected', 'No text detected')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
