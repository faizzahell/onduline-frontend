import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'id';

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-xs transition hover:border-slate-300">
      <Globe className="w-3.5 h-3.5 text-slate-500" />
      <button
        type="button"
        onClick={() => toggleLanguage('id')}
        className={`cursor-pointer ${
          currentLang === 'id'
            ? 'font-bold text-[#D32F2F]'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        ID
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={() => toggleLanguage('en')}
        className={`cursor-pointer ${
          currentLang === 'en'
            ? 'font-bold text-[#D32F2F]'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        EN
      </button>
    </div>
  );
}
