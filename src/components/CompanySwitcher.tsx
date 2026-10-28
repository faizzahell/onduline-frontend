import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, Plus } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { isSuperAdministrator } from '../utils/rbac.utils';
import { CustomSelect } from './ui/CustomSelect';

/**
 * Active company control in the header.
 *
 * - No company yet: a super administrator sees a "Create company" button that
 *   jumps to Company Management; anyone else sees nothing (they cannot create
 *   one and the app has nothing to show them).
 * - One company: nothing, since there is nothing to switch between.
 * - Several companies (super administrator only): the switcher dropdown.
 */
export function CompanySwitcher() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    companies,
    activeCompany,
    canSwitchCompany,
    isLoading,
    isSwitching,
    switchCompany,
  } = useCompany();

  if (isLoading) {
    return null;
  }

  if (companies.length === 0) {
    if (!isSuperAdministrator(user)) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => navigate('/settings/companies')}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Create company
      </button>
    );
  }

  if (!canSwitchCompany || companies.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isSwitching ? (
        <Loader2 className="w-4 h-4 text-[#D32F2F] shrink-0 animate-spin" />
      ) : (
        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
      )}
      <CustomSelect
        aria-label="Select active company"
        disabled={isSwitching}
        options={companies.map((company) => ({
          value: company.id,
          label: company.code,
          sublabel: company.name,
        }))}
        value={activeCompany?.id}
        onChange={(companyId) => void switchCompany(companyId)}
        placeholder="Select company..."
      />
    </div>
  );
}
