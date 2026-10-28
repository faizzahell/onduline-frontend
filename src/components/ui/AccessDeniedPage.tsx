import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home, Lock } from 'lucide-react';

interface AccessDeniedPageProps {
  title?: string;
  description?: string;
}

/**
 * Shown when a signed-in user reaches a page their role does not cover.
 *
 * This is the visible half of the per-route guard: the menu already hides
 * links a role cannot use, and `RequirePermission` sends anyone who types the
 * URL anyway here instead of letting the page load.
 */
export default function AccessDeniedPage({
  title,
  description,
}: AccessDeniedPageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['common']);

  return (
    <div className="min-h-[calc(100vh-100px)] w-full flex items-center justify-center p-6 select-none font-sans text-slate-800 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sm:p-10 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto w-16 h-16 mb-5 flex items-center justify-center rounded-2xl bg-red-50 border border-red-100 text-[#D32F2F]">
          <Lock className="w-7 h-7" />
        </div>

        <h1 className="text-lg font-bold text-slate-900">
          {title ?? t('common:accessDenied.title', 'Access Restricted')}
        </h1>

        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          {description ??
            t(
              'common:accessDenied.description',
              'Your role does not have access to this page. Contact an administrator if you believe this is a mistake.',
            )}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('common:back', 'Back')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/10 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{t('common:goToDashboard', 'Go to Main Dashboard')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
