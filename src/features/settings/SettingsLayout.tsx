import { NavLink, Outlet } from 'react-router-dom';
import {
  Building2,
  Database,
  ScanLine,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { isSuperAdministrator } from '../../utils/rbac.utils';

interface SettingsMenuItem {
  to: string;
  label: string;
  description: string;
  icon: typeof Users;
  superAdminOnly?: boolean;
}

const MENU: SettingsMenuItem[] = [
  {
    to: '/settings/users',
    label: 'User Management',
    description: 'Accounts, roles, and access',
    icon: Users,
  },
  {
    to: '/settings/ocr-access',
    label: 'OCR Access',
    description: 'Open document extraction per company',
    icon: ScanLine,
    superAdminOnly: true,
  },
  {
    to: '/settings/companies',
    label: 'Company Management',
    description: 'Add, edit, and remove companies',
    icon: Building2,
    superAdminOnly: true,
  },
  {
    to: '/settings/database',
    label: 'Database Tools',
    description: 'Clear and export data',
    icon: Database,
    superAdminOnly: true,
  },
];

/**
 * Two-pane settings shell: a menu on the left and the active page on the
 * right. OCR Access is only listed for a super administrator; the route itself
 * is guarded too, so hiding it here is just to keep the menu honest.
 */
export default function SettingsLayout() {
  const { user } = useAuth();
  const superAdmin = isSuperAdministrator(user);

  const items = MENU.filter((item) => !item.superAdminOnly || superAdmin);

  return (
    <div className="p-6 text-slate-800 antialiased font-sans">
      <div className="mb-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E53935] text-white flex items-center justify-center shrink-0">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <p className="text-xs text-slate-500">
            Platform administration for the OFDA portal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <nav className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-2xs p-2 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-start gap-3 px-3 py-2.5 rounded-xl transition ${
                    isActive
                      ? 'bg-red-50 text-[#D32F2F]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        isActive ? 'text-[#D32F2F]' : 'text-slate-400'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold">
                        {item.label}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {item.description}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="lg:col-span-9 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
