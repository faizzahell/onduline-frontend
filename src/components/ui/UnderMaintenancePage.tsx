import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  ArrowLeft,
  RefreshCw,
  ShieldAlert,
  HelpCircle,
  Home,
} from 'lucide-react';

import underMaintenanceAnimation from '../../assets/lottie/under-maintenance.json';

interface UnderMaintenancePageProps {
  title?: string;
  description?: string;
  estimatedTime?: string;
  showBackButton?: boolean;
}

export default function UnderMaintenancePage({
  title,
  description,
  estimatedTime,
  showBackButton = true,
}: UnderMaintenancePageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);

  return (
    <div className="min-h-[calc(100vh-100px)] w-full flex items-center justify-center p-6 select-none font-sans text-slate-800 antialiased">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sm:p-12 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56 mb-2 flex items-center justify-center">
          <DotLottieReact
            data={underMaintenanceAnimation}
            loop
            autoplay
            className="w-full h-full object-contain"
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-bold mb-4">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>
            {t('common:maintenance.badge', 'Feature Under Development')}
          </span>
        </div>

        <h1 className="text-lg font-bold text-slate-900">
          {title ?? t('common:maintenance.title', 'Module Not Yet Available')}
        </h1>

        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
          {description ??
            t(
              'common:maintenance.description',
              'This module is still under development and cannot be used yet.',
            )}
        </p>

        {estimatedTime && (
          <p className="text-[11px] font-semibold text-slate-400 mt-3">
            {t('common:maintenance.estimate', 'Estimated availability')}:{' '}
            <span className="text-slate-600">{estimatedTime}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {showBackButton && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('common:back', 'Back')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/10 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{t('common:goToDashboard', 'Go to Main Dashboard')}</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
            title={t('common:refresh', 'Reload Page')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>
            {t(
              'common:maintenance.helpText',
              'Need quick help? Contact IT Support',
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
