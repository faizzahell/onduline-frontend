import { useState, type SubmitEvent, type ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Layers,
  Users,
  Receipt,
} from 'lucide-react';

import { useAuth } from '../../../hooks/useAuth';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['auth', 'common']);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    '/dashboard';

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth:loginCard.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F8F9FA] bg-cover bg-center bg-no-repeat flex flex-col justify-between text-slate-800 antialiased font-sans relative selection:bg-red-100 selection:text-[#D32F2F]"
      style={{ backgroundImage: "url('/onduline-background.png')" }}
    >
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <img
              src="/onduline-logo.svg"
              alt="Onduline Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 pl-3 border-l border-slate-200">
            {t('common:tagline')}
          </span>
        </div>

        <LanguageSwitcher />
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-6">
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
              {t('auth:title')} <br />
              <span className="text-[#D32F2F]">{t('auth:subtitle')}</span>
            </h1>

            <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
              {t('auth:description')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <div className="p-3.5 bg-white/80 backdrop-blur-xs border border-slate-200/60 rounded-xl shadow-2xs flex items-start gap-3">
              <div className="p-2 bg-red-50 text-[#D32F2F] rounded-lg shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t('auth:features.sso.title')}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {t('auth:features.sso.description')}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white/80 backdrop-blur-xs border border-slate-200/60 rounded-xl shadow-2xs flex items-start gap-3">
              <div className="p-2 bg-red-50 text-[#D32F2F] rounded-lg shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t('auth:features.obm.title')}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {t('auth:features.obm.description')}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white/80 backdrop-blur-xs border border-slate-200/60 rounded-xl shadow-2xs flex items-start gap-3">
              <div className="p-2 bg-red-50 text-[#D32F2F] rounded-lg shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t('auth:features.partner.title')}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {t('auth:features.partner.description')}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white/80 backdrop-blur-xs border border-slate-200/60 rounded-xl shadow-2xs flex items-start gap-3">
              <div className="p-2 bg-red-50 text-[#D32F2F] rounded-lg shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t('auth:features.expense.title')}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {t('auth:features.expense.description')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-white p-7 lg:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center">
                  <img
                    src="/onduline-logo.svg"
                    alt="Onduline Logo"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <span className="text-xs font-semibold tracking-wider text-slate-400 pl-3 border-l border-slate-200">
                  {t('common:companyName')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 pt-2">
                {t('auth:loginCard.heading')}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="pt-2 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('auth:loginCard.emailLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={loading}
                    required
                    autoComplete="email"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] focus:outline-none disabled:bg-slate-50 transition"
                    placeholder={t('auth:loginCard.emailPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {t('auth:loginCard.passwordLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={loading}
                    required
                    autoComplete="current-password"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F] focus:outline-none disabled:bg-slate-50 transition"
                    placeholder={t('auth:loginCard.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex px-2 items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#D32F2F] accent-[#D32F2F] focus:ring-[#D32F2F]"
                  />
                  <span className="text-slate-600 text-[11px]">
                    {t('auth:loginCard.rememberMe')}
                  </span>
                </label>
                <a
                  href="#forgot"
                  className="text-[11px] font-semibold text-[#D32F2F] hover:underline"
                >
                  {t('auth:loginCard.forgotPassword')}
                </a>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-lg bg-[#D32F2F] hover:bg-red-700 text-white py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:ring-offset-2 disabled:opacity-60 transition shadow-xs cursor-pointer"
              >
                {loading ? (
                  t('auth:loginCard.processingButton')
                ) : (
                  <>
                    <span>{t('auth:loginCard.submitButton')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center space-y-3">
              <div className="relative flex items-center justify-center my-2">
                <div className="grow border-t border-slate-200"></div>
                <span className="px-3 text-[11px] font-medium text-slate-400 bg-transparent shrink-0">
                  {t('common:or')}
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
                <a href="#policy" className="hover:underline">
                  {t('common:financialPolicy')}
                </a>
                <span>•</span>
                <a href="#help" className="hover:underline">
                  {t('common:itHelpdesk')}
                </a>
                <span>•</span>
                <a href="#sop" className="hover:underline">
                  {t('common:sopGuide')}
                </a>
              </div>

              <p className="text-[10px] text-slate-400">
                {t('common:accessIssue')}{' '}
                <a
                  href="mailto:helpdesk@onduline.co.id"
                  className="text-[#D32F2F] font-semibold underline"
                >
                  helpdesk@onduline.co.id
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 gap-2">
        <div>{t('common:copyright')}</div>
      </footer>
    </div>
  );
}
