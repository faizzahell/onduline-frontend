import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  companiesApi,
  type AccessibleCompany,
} from '../features/companies/api/companies.api';
import { useAuth } from '../hooks/useAuth';
import { companySession } from '../services/company-session';
import { isSuperAdministrator } from '../utils/rbac.utils';

interface CompanyContextValue {
  companies: AccessibleCompany[];
  activeCompany: AccessibleCompany | null;
  isLoading: boolean;
  /** True while the cache is being rebuilt for the newly selected company. */
  isSwitching: boolean;
  /** Only a super administrator may move between companies. */
  canSwitchCompany: boolean;
  switchCompany: (companyId: string) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(
  undefined,
);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // The stored company is read as a subscribed external store rather than
  // once per render. Reading localStorage directly left every consumer with
  // the previous company until the page was reloaded, which is what made the
  // switcher label and the sidebar go stale after a switch.
  const storedId = useSyncExternalStore(
    companySession.subscribe,
    companySession.get,
  );

  const [isSwitching, setIsSwitching] = useState(false);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['accessible-companies'],
    queryFn: companiesApi.listAccessible,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const activeCompany =
    companies.find((company) => company.id === storedId) ??
    companies.find((company) => company.isDefault) ??
    companies[0] ??
    null;

  // The stored id can be missing, or point at a company the account no longer
  // reaches. Writing the resolved one back keeps the `x-company-id` header on
  // the same company as the one shown on screen.
  useEffect(() => {
    if (activeCompany && activeCompany.id !== storedId) {
      companySession.set(activeCompany.id);
    }
  }, [activeCompany, storedId]);

  const canSwitchCompany = isSuperAdministrator(user) && companies.length > 1;

  const switchCompany = useCallback(
    async (companyId: string) => {
      if (companyId === activeCompany?.id) {
        return;
      }

      setIsSwitching(true);

      // Set first: the axios interceptor reads this on every request, so the
      // refetch below already asks for the new company.
      companySession.set(companyId);

      try {
        // Remembering the choice must not hold up the switch itself, so a
        // failure here is swallowed.
        await companiesApi.setDefault(companyId).catch(() => undefined);

        // Every query is company-scoped. Awaiting the refetch means the UI
        // comes back only once the data belongs to the new company, instead
        // of briefly presenting the previous one as if it were the new.
        await queryClient.invalidateQueries();
      } finally {
        setIsSwitching(false);
      }
    },
    [activeCompany?.id, queryClient],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companies,
      activeCompany,
      isLoading,
      isSwitching,
      canSwitchCompany,
      switchCompany,
    }),
    [
      companies,
      activeCompany,
      isLoading,
      isSwitching,
      canSwitchCompany,
      switchCompany,
    ],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export { CompanyContext };
