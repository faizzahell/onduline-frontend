import {
  LayoutDashboard,
  Layers,
  Users,
  Receipt,
  AlertTriangle,
  Percent,
} from 'lucide-react';
import type { RoleName } from '../features/auth/types/auth.types';

export interface NavSubItem {
  key: string;
  labelKey: string;
  path: string;
  roles?: RoleName[];
  permissions?: string[];
  children?: NavSubItem[];
}

export interface NavItem {
  key: string;
  labelKey: string;
  icon: React.ElementType;
  path?: string;
  roles?: RoleName[];
  permissions?: string[];
  children?: NavSubItem[];
}

export const navigationConfig: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'common:nav.dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['ADMINISTRATOR'],
  },
  {
    key: 'building-material',
    labelKey: 'common:nav.buildingMaterial',
    icon: Layers,
    roles: ['ADMINISTRATOR', 'PURCHASER', 'WAREHOUSE', 'FINANCE'],
    children: [
      {
        key: 'obm-dashboard',
        labelKey: 'common:nav.obmDashboard',
        path: '/invoices/dashboard',
        roles: ['ADMINISTRATOR', 'PURCHASER', 'FINANCE'],
        permissions: ['ocr:view'],
      },
      {
        key: 'obm-upload',
        labelKey: 'common:nav.obmUpload',
        path: '/invoices/upload',
        roles: ['ADMINISTRATOR', 'PURCHASER'],
        permissions: ['ocr:upload'],
      },
      {
        key: 'obm-list',
        labelKey: 'common:nav.obmList',
        path: '/invoices',
        roles: ['ADMINISTRATOR', 'PURCHASER', 'WAREHOUSE', 'FINANCE'],
        permissions: ['ocr:view', 'ocr:grn_view'],
      },
      {
        key: 'obm-po-resolution',
        labelKey: 'common:nav.obmPoResolution',
        path: '/invoices/po-resolution',
        roles: ['ADMINISTRATOR', 'PURCHASER'],
        permissions: ['ocr:resolve_po'],
      },
    ],
  },
  {
    key: 'business-partner',
    labelKey: 'common:nav.businessPartner',
    icon: Users,
    roles: ['ADMINISTRATOR'],
    children: [
      {
        key: 'customer-mgmt',
        labelKey: 'common:nav.customerMgmt',
        path: '/business-partner/customers',
      },
      {
        key: 'credit-limit',
        labelKey: 'common:nav.creditLimit',
        path: '/business-partner/credit-limit',
      },
      {
        key: 'vendor-mgmt',
        labelKey: 'common:nav.vendorMgmt',
        path: '/business-partner/vendors',
      },
      {
        key: 'portal-report',
        labelKey: 'common:nav.portalReport',
        path: '/business-partner/reports',
      },
    ],
  },
  {
    key: 'expense-mgmt',
    labelKey: 'common:nav.expenseMgmt',
    icon: Receipt,
    roles: ['ADMINISTRATOR', 'FINANCE', 'EMPLOYEE', 'EXPENSE_APPROVER', 'HR'],
    permissions: ['expense:entry', 'expense:view', 'expense:view_all'],
    children: [
      {
        key: 'expense-entries',
        labelKey: 'common:nav.expenseEntries',
        path: '/expense/entries',
        permissions: ['expense:entry'],
      },
      {
        key: 'expense-claims',
        labelKey: 'common:nav.expenseClaims',
        path: '/expense/claims',
        permissions: ['expense:entry', 'expense:view'],
      },
      {
        key: 'expense-approvals',
        labelKey: 'common:nav.expenseApprovals',
        path: '/expense/approvals',
        permissions: ['expense:approve', 'expense:accrue', 'expense:post'],
      },
      {
        key: 'petty-cash',
        labelKey: 'common:nav.pettyCash',
        path: '/expense/petty-cash',
        permissions: ['pettycash:entry', 'pettycash:approve'],
      },
      {
        key: 'expense-report',
        labelKey: 'common:nav.expenseReport',
        path: '/expense/reports',
        permissions: [
          'expense:report',
          'expense:view_all',
          'expense:view',
          'expense:entry',
        ],
      },
    ],
  },
  {
    key: 'sales-exception',
    labelKey: 'common:nav.salesException',
    icon: AlertTriangle,
    roles: ['ADMINISTRATOR'],
    children: [
      {
        key: 'late-dp',
        labelKey: 'common:nav.lateDp',
        path: '/sales-exception/late-dp',
      },
      {
        key: 'late-payment',
        labelKey: 'common:nav.latePayment',
        path: '/sales-exception/late-payment',
      },
      {
        key: 'changes-dp-top',
        labelKey: 'common:nav.changesDpTop',
        path: '/sales-exception/changes-dp-top',
      },
      {
        key: 'over-credit-limit',
        labelKey: 'common:nav.overCreditLimit',
        path: '/sales-exception/over-credit-limit',
      },
      {
        key: 'special-price',
        labelKey: 'common:nav.specialPrice',
        path: '/sales-exception/special-price',
      },
      {
        key: 'exception-report',
        labelKey: 'common:nav.exceptionReport',
        path: '/sales-exception/report',
      },
    ],
  },
  {
    key: 'rebate-mgmt',
    labelKey: 'common:nav.rebateMgmt',
    icon: Percent,
    roles: ['ADMINISTRATOR'],
    children: [
      {
        key: 'trading-term',
        labelKey: 'common:nav.tradingTerm',
        path: '/rebate/trading-term',
      },
      {
        key: 'calc-claim',
        labelKey: 'common:nav.calcClaim',
        path: '/rebate/calculation-claim',
      },
      {
        key: 'rebate-report',
        labelKey: 'common:nav.rebateReport',
        path: '/rebate/report',
      },
    ],
  },
];
