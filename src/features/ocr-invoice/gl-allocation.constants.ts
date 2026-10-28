import type { SelectOption } from '../../components/ui/CustomSelect';

/**
 * Temporary list of G/L accounts and cost centers.
 *
 * These values are **placeholders** until the Business Central master data can
 * be read through `BusinessCentralService` on the backend. Do not use them as
 * an accounting reference.
 */
export const GL_ACCOUNT_OPTIONS: SelectOption[] = [
  {
    value: '61200',
    label: '61200',
    sublabel: 'Cost of Goods Sold - Industrial',
  },
  { value: '61250', label: '61250', sublabel: 'Inbound Freight & Handling' },
  { value: '20100', label: '20100', sublabel: 'Accounts Payable Vendor' },
];

export const COST_CENTER_OPTIONS: SelectOption[] = [
  { value: 'DEPT-10', label: 'DEPT-10', sublabel: 'Manufacturing & Ops' },
  { value: 'DEPT-20', label: 'DEPT-20', sublabel: 'Warehouse Logistics' },
  { value: 'DEPT-40', label: 'DEPT-40', sublabel: 'General Administration' },
];

export const DEFAULT_GL_ACCOUNT = GL_ACCOUNT_OPTIONS[0].value;
export const DEFAULT_COST_CENTER = COST_CENTER_OPTIONS[0].value;
