import { useContext } from 'react';

import { CompanyContext } from '../context/CompanyContext';

export function useCompany() {
  const context = useContext(CompanyContext);

  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }

  return context;
}
