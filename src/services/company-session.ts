const ACTIVE_COMPANY_KEY = 'activeCompanyId';

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * The active company is stored separately from the session because a single
 * user can switch between companies without logging in again. The axios
 * interceptor reads this value to populate the `x-company-id` header on every
 * request.
 */
export const companySession = {
  get: (): string | null => localStorage.getItem(ACTIVE_COMPANY_KEY),

  set(companyId: string): void {
    localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
    listeners.forEach((listener) => listener());
  },

  clear(): void {
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
