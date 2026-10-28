import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import {
  BarChart3,
  CalendarRange,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  TrendingUp,
  Users,
} from 'lucide-react';

import { CustomSelect } from '../../../components/ui/CustomSelect';
import { useAuth } from '../../../hooks/useAuth';
import { useCompany } from '../../../hooks/useCompany';
import { hasPermission } from '../../../utils/rbac.utils';
import { expenseApi } from '../api/expense.api';
import { ExpenseFormReportView } from '../components/ExpenseFormReportView';
import {
  downloadExpenseReportXls,
  printExpenseReport,
} from '../components/expense-report.export';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { formatCurrency } from '../expense.format';

/** First and last day of a month, as ISO date strings. */
function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((label, index) => ({ value: String(index + 1), label }));

export default function ExpenseReportPage() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const reportRef = useRef<HTMLDivElement>(null);

  const isAdmin = hasPermission(user, ['ADMINISTRATOR'], ['expense:view_all']);

  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [month, setMonth] = useState(() => new Date().getUTCMonth() + 1);
  const [employeeId, setEmployeeId] = useState<string>('');

  const bounds = monthBounds(year, month);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: expenseApi.listEmployees,
    enabled: isAdmin,
  });

  // Admin picks an employee; everyone else gets their own recap.
  const { data: report, isFetching: reportLoading } = useQuery({
    queryKey: [
      'expense-form',
      isAdmin ? employeeId : 'me',
      bounds.start,
      bounds.end,
    ],
    queryFn: () =>
      isAdmin
        ? expenseApi.employeeExpenseForm(employeeId, bounds.start, bounds.end)
        : expenseApi.myExpenseForm(bounds.start, bounds.end),
    enabled: !isAdmin || Boolean(employeeId),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['expense-dashboard', year, month],
    queryFn: () => expenseApi.reportDashboard(year, month),
    enabled: isAdmin,
  });

  const companyName = activeCompany?.name ?? 'Company';

  const yearOptions = Array.from({ length: 5 }, (_, index) => {
    const value = year + index - 2;
    return { value: String(value), label: String(value) };
  }).sort((a, b) => Number(b.value) - Number(a.value));

  const canExport = Boolean(report && report.rows.length >= 0);

  return (
    <div className="space-y-6 p-6 text-slate-800 antialiased font-sans">
      {/* Controls + title (hidden when printing). */}
      <div className="no-print space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Expense Report</h1>
            <p className="text-xs text-slate-500 mt-1">
              {isAdmin
                ? 'Company-wide summaries by month and category. Figures count only claims approved by the expense approver.'
                : 'Your monthly expense recap. Print it or export to Excel for your claim.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CustomSelect
              aria-label="Month"
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(value) => setMonth(Number(value))}
            />
            <CustomSelect
              aria-label="Year"
              options={yearOptions}
              value={String(year)}
              onChange={(value) => setYear(Number(value))}
            />
          </div>
        </div>

        {isAdmin && dashboard && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                icon={CalendarRange}
                label="This month"
                value={formatCurrency(dashboard.currentMonthTotal)}
              />
              <SummaryCard
                icon={TrendingUp}
                label="Year to date"
                value={formatCurrency(dashboard.yearToDateTotal)}
                sub={
                  dashboard.yearOverYearChangePercent === null
                    ? undefined
                    : `${dashboard.yearOverYearChangePercent > 0 ? '+' : ''}${dashboard.yearOverYearChangePercent}% vs last year`
                }
              />
              <SummaryCard
                icon={Users}
                label="Employees"
                value={String(employees.length)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-[#D32F2F]" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Expense by month · {year}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">
                  Approved claims only. Hover a bar for its exact value.
                </p>
                <MonthlyBarChart
                  data={dashboard.byMonth}
                  highlightMonth={month}
                />
              </div>

              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
                <h2 className="text-sm font-bold text-slate-900 mb-3">
                  Year to date by category
                </h2>
                {dashboard.byCategory.length === 0 ? (
                  <p className="text-xs text-slate-400">No expenses yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-40 overflow-auto">
                    {dashboard.byCategory.map((bucket) => (
                      <li
                        key={bucket.label}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-slate-600 truncate">
                          {bucket.label}
                        </span>
                        <span className="font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(bucket.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          {isAdmin ? (
            <div className="flex-1 max-w-sm space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Employee
              </label>
              <CustomSelect
                className="w-full"
                aria-label="Employee"
                options={employees.map((employee) => ({
                  value: employee.id,
                  label: employee.name,
                  sublabel: employee.employeeCode,
                }))}
                value={employeeId}
                onChange={setEmployeeId}
                placeholder="Select an employee..."
              />
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Showing your expenses for{' '}
              <span className="font-bold text-slate-800">
                {MONTH_OPTIONS[month - 1].label} {year}
              </span>
              .
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canExport || !report}
              onClick={() =>
                report && downloadExpenseReportXls(report, companyName)
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            <button
              type="button"
              disabled={!canExport || !report}
              onClick={printExpenseReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D32F2F] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* The report itself. Printed on its own. */}
      {isAdmin && !employeeId ? (
        <div className="no-print p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-100">
          <Download className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          Select an employee to see their expense recap.
        </div>
      ) : reportLoading ? (
        <div className="no-print p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D32F2F]" />
        </div>
      ) : report ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs overflow-x-auto print-area">
          <ExpenseFormReportView
            ref={reportRef}
            report={report}
            companyName={companyName}
          />
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof CalendarRange;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
        <Icon className="w-4 h-4 text-[#D32F2F]" />
        {label}
      </div>
      <p className="text-lg font-bold text-slate-900 mt-2">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
