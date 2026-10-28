import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Shield,
  ChevronDown,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { CompanySwitcher } from '../CompanySwitcher';
import { LanguageSwitcher } from '../LanguageSwitcher';

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation(['common']);

  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between select-none shrink-0 text-slate-800 antialiased font-sans z-20">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common:header.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/10 focus:outline-none transition shadow-2xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <CompanySwitcher />

        <LanguageSwitcher />

        <div className="h-4 w-px bg-slate-200 mx-0.5"></div>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition relative cursor-pointer"
            aria-label={t('common:header.notifications')}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D32F2F] ring-2 ring-white"></span>
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/60 py-3 space-y-2 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">
                  {t('common:header.notifications')}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#D32F2F]">
                  3 New
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto px-2 space-y-1 divide-y divide-slate-50">
                <div className="p-2 hover:bg-slate-50 rounded-xl transition cursor-pointer">
                  <p className="text-[11px] font-semibold text-slate-800">
                    Batch #CLM-2606-088 approved
                  </p>
                  <span className="text-[10px] text-slate-400">
                    10 minutes ago
                  </span>
                </div>
                <div className="p-2 hover:bg-slate-50 rounded-xl transition cursor-pointer">
                  <p className="text-[11px] font-semibold text-slate-800">
                    New Invoice #OFC-202606-001
                  </p>
                  <span className="text-[10px] text-slate-400">1 hour ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {user && (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100/80 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#D32F2F] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-bold text-slate-900 leading-tight">
                  {user.name}
                </span>
                <span className="block text-[10px] font-medium text-slate-400">
                  {user.roles[0]}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/60 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user.email}
                  </p>
                  <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-red-50 border border-red-100 text-[10px] font-bold text-[#D32F2F]">
                    <Shield className="w-3 h-3" />
                    <span>{user.roles.join(', ')}</span>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <a
                    href="#profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{t('common:header.myProfile')}</span>
                  </a>
                  <a
                    href="#settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>{t('common:header.accountSettings')}</span>
                  </a>
                </div>

                <div className="p-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('common:header.logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
