import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Building2,
  Plus,
  Settings,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../hooks/useCompany';
import {
  navigationConfig,
  type NavSubItem,
} from '../../config/navigation.config';
import { hasPermission, isSuperAdministrator } from '../../utils/rbac.utils';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { activeCompany } = useCompany();
  const { t } = useTranslation(['common']);
  const location = useLocation();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'building-material': true,
    'business-partner': false,
    'expense-mgmt': false,
    'sales-exception': false,
    'rebate-mgmt': false,
  });

  useEffect(() => {
    navigationConfig.forEach((item) => {
      if (item.children) {
        const isChildActive = checkIsChildActive(
          item.children,
          location.pathname,
        );
        if (isChildActive) {
          setOpenMenus((prev) => ({ ...prev, [item.key]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleNavItems = navigationConfig.filter((item) =>
    hasPermission(user, item.roles, item.permissions),
  );

  // Settings holds user management (any administrator) and, for a super
  // administrator, OCR access. Both administrator roles can open the section;
  // the submenu inside decides what they actually see.
  const canOpenSettings = hasPermission(
    user,
    ['ADMINISTRATOR'],
    ['user:manage'],
  );

  // Only a super administrator can create a company, so only they see the
  // empty-state prompt in the company card.
  const canManageCompanies = isSuperAdministrator(user);

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen select-none shrink-0 text-slate-700 antialiased font-sans">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <img
          src="/onduline-logo.svg"
          alt="Onduline Logo"
          className="h-6 w-auto object-contain"
        />
        <div className="pl-3 border-l border-slate-200">
          <span className="block text-[10px] font-black text-[#D32F2F] tracking-wider uppercase">
            OFDA PORTAL
          </span>
        </div>
      </div>

      {activeCompany ? (
        <div className="p-3 mx-3 my-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E53935] text-white border border-[#D32F2F] flex items-center justify-center shrink-0 font-bold text-[11px]">
            {activeCompany.code}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {activeCompany.name}
            </h4>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold mt-0.5">
              <span className="truncate">
                {activeCompany.code} · {activeCompany.currency}
              </span>
            </div>
          </div>
        </div>
      ) : canManageCompanies ? (
        // No company exists yet: a super administrator is pointed to Company
        // Management to create the first one.
        <NavLink
          to="/settings/companies"
          className="p-3 mx-3 my-3 bg-red-50/70 border border-dashed border-red-200 rounded-xl flex items-center gap-2.5 hover:bg-red-50 transition group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#E53935] text-white border border-[#D32F2F] flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-[#D32F2F] truncate">
              {t('common:createCompany')}
            </h4>
            <span className="block text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
              {t('common:noCompanyYet')}
            </span>
          </div>
        </NavLink>
      ) : (
        <div className="p-3 mx-3 my-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-300 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-500 truncate">
              {t('common:noCompanyYet')}
            </h4>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 text-xs font-medium">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = Boolean(
            item.children && item.children.length > 0,
          );
          const isOpen = Boolean(openMenus[item.key]);
          const isParentActive =
            hasChildren &&
            checkIsChildActive(item.children!, location.pathname);

          if (!hasChildren && item.path) {
            return (
              <NavLink
                key={item.key}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#E53935] text-white font-bold shadow-md shadow-red-500/20'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </NavLink>
            );
          }

          return (
            <div key={item.key} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleMenu(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isParentActive
                    ? 'bg-slate-100/90 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isParentActive ? 'text-[#D32F2F]' : 'text-slate-500'}`}
                  />
                  <span className="truncate font-semibold">
                    {t(item.labelKey)}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isOpen && item.children && (
                <div className="pl-6 space-y-0.5 border-l-2 border-slate-100 ml-5 my-1">
                  {item.children.map((subItem) => (
                    <SubMenuTree key={subItem.key} subItem={subItem} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 space-y-1.5">
        {canOpenSettings && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`
            }
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>{t('common:nav.settings')}</span>
          </NavLink>
        )}

        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-white bg-[#E53935] hover:bg-red-700 active:bg-red-800 rounded-xl transition shadow-sm shadow-red-500/20 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('common:nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}

function SubMenuTree({ subItem }: { subItem: NavSubItem }) {
  const { t } = useTranslation(['common']);
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = Boolean(subItem.children && subItem.children.length > 0);

  if (!hasChildren && subItem.path) {
    return (
      <NavLink
        to={subItem.path}
        end
        className={({ isActive }) =>
          `block px-3 py-2 rounded-lg text-[11px] transition ${
            isActive
              ? 'bg-[#E53935] text-white font-bold border border-red-100/60'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`
        }
      >
        {t(subItem.labelKey)}
      </NavLink>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
      >
        <span>{t(subItem.labelKey)}</span>
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-400" />
        )}
      </button>

      {isOpen && subItem.children && (
        <div className="pl-3 space-y-0.5 border-l border-slate-200/60 ml-2">
          {subItem.children.map((nested) => (
            <NavLink
              key={nested.key}
              to={nested.path}
              end
              className={({ isActive }) =>
                `block px-2.5 py-1.5 rounded-md text-[10px] transition ${
                  isActive
                    ? 'text-[#D32F2F] font-bold bg-red-50/80'
                    : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {t(nested.labelKey)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function checkIsChildActive(
  children: NavSubItem[],
  currentPath: string,
): boolean {
  return children.some((child) => {
    if (child.path) {
      if (child.path === currentPath) return true;
      if (
        child.path !== '/' &&
        child.path !== '/invoices' &&
        currentPath.startsWith(child.path)
      ) {
        return true;
      }
      if (
        child.path === '/invoices' &&
        (currentPath === '/invoices' || currentPath.startsWith('/invoices/'))
      ) {
        if (currentPath.startsWith('/invoices/dashboard')) return false;
        return true;
      }
    }
    if (child.children) {
      return checkIsChildActive(child.children, currentPath);
    }
    return false;
  });
}
