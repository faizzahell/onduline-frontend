import { Building2, Loader2 } from 'lucide-react';

import { useCompany } from '../hooks/useCompany';

/**
 * Blocks the screen while the active company changes.
 *
 * Every query is scoped to one company, so the whole cache is refetched on a
 * switch. Without this the user would interact with a half-migrated page and
 * briefly read the previous company's numbers as if they were the new ones.
 */
export function CompanySwitchOverlay() {
  const { isSwitching, activeCompany } = useCompany();

  if (!isSwitching) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs"
    >
      <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl bg-white border border-slate-100 shadow-xl text-center">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-[#D32F2F] animate-spin" />
          <Building2 className="w-5 h-5 text-[#D32F2F] absolute inset-0 m-auto" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-900">
            Switching company
            {activeCompany ? ` to ${activeCompany.code}` : ''}
          </p>
          <p className="text-xs text-slate-500 max-w-xs">
            {activeCompany
              ? `Loading ${activeCompany.name} data. Please wait.`
              : 'Loading the selected company data. Please wait.'}
          </p>
        </div>
      </div>
    </div>
  );
}
