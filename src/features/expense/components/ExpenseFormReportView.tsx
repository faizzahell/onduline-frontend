import { forwardRef } from 'react';

import type { ExpenseFormReport } from '../api/expense.api';
import { formatCurrency } from '../expense.format';

/**
 * The fixed column order of the paper EXPENSE CLAIM REPORT. Categories outside
 * this list fall into "OTHERS", so the printout always matches the form even
 * when a company adds extra categories.
 */
export const REPORT_COLUMNS: { code: string; label: string }[] = [
  { code: 'GASOLINE', label: 'GASOLINE' },
  { code: 'TOLL', label: 'TOLL' },
  { code: 'PARKING', label: 'PARKING' },
  { code: 'MEAL_ALLOWANCE', label: 'MEAL ALLOWANCE' },
  { code: 'TAXI', label: 'TAXI' },
  { code: 'RENTAL_CAR', label: 'RENTAL CAR' },
  { code: 'ENTERTAINMENT', label: 'ENTERTAINMENT' },
  { code: 'PULSA', label: 'PULSA' },
  { code: 'ATK', label: 'ATK' },
  { code: 'LAUNDRY', label: 'LAUNDRY' },
  { code: 'COURIER', label: 'COURIER' },
  { code: 'HOTEL', label: 'HOTEL' },
  { code: 'OTHERS', label: 'OTHERS' },
];

const KNOWN_CODES = new Set(REPORT_COLUMNS.map((column) => column.code));

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Amount for a report column on a row, folding unknown categories into OTHERS. */
export function columnAmount(
  amounts: Record<string, number>,
  code: string,
): number {
  if (code !== 'OTHERS') {
    return amounts[code] ?? 0;
  }

  return Object.entries(amounts).reduce(
    (sum, [key, value]) => (KNOWN_CODES.has(key) ? sum : sum + value),
    amounts.OTHERS ?? 0,
  );
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${month}/${day}/${year.slice(2)}`;
}

function dayName(iso: string): string {
  return DAY_NAMES[new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()];
}

function monthLabel(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface Props {
  report: ExpenseFormReport;
  companyName: string;
}

/**
 * On-screen and print rendering of the expense claim report, laid out to match
 * the finance team's Excel form: a header, one row per transaction date, a
 * column per category, a totals row, and the note/signature footer.
 */
export const ExpenseFormReportView = forwardRef<HTMLDivElement, Props>(
  function ExpenseFormReportView({ report, companyName }, ref) {
    const columnTotal = (code: string) =>
      report.rows.reduce(
        (sum, row) => sum + columnAmount(row.amounts, code),
        0,
      );

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 text-[11px] font-sans"
        id="expense-report-print"
      >
        <div className="mb-3">
          <h2 className="text-sm font-bold">{companyName}</h2>
          <h3 className="text-sm font-bold">EXPENSE CLAIM REPORT</h3>
        </div>

        <table className="mb-3">
          <tbody>
            <tr>
              <td className="font-bold pr-6">NAME</td>
              <td>: {report.employee.name}</td>
            </tr>
            <tr>
              <td className="font-bold pr-6">CLAIM FOR MONTH</td>
              <td>
                :{' '}
                {report.rows.length > 0
                  ? monthLabel(report.rows[0].date)
                  : monthLabel(report.periodStart)}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="border border-slate-400 px-1 py-1 text-left">
                DATE
              </th>
              <th className="border border-slate-400 px-1 py-1 text-left">
                DAY
              </th>
              {REPORT_COLUMNS.map((column) => (
                <th
                  key={column.code}
                  className="border border-slate-400 px-1 py-1 text-center align-bottom"
                >
                  {column.label}
                </th>
              ))}
              <th className="border border-slate-400 px-1 py-1 text-right">
                TOTAL
              </th>
              <th className="border border-slate-400 px-1 py-1 text-left">
                KETERANGAN
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={REPORT_COLUMNS.length + 4}
                  className="border border-slate-400 px-2 py-4 text-center text-slate-400"
                >
                  No transactions in this period.
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr key={row.date}>
                  <td className="border border-slate-300 px-1 py-0.5 whitespace-nowrap">
                    {shortDate(row.date)}
                  </td>
                  <td className="border border-slate-300 px-1 py-0.5 whitespace-nowrap">
                    {dayName(row.date)}
                  </td>
                  {REPORT_COLUMNS.map((column) => {
                    const amount = columnAmount(row.amounts, column.code);
                    return (
                      <td
                        key={column.code}
                        className="border border-slate-300 px-1 py-0.5 text-right"
                      >
                        {amount > 0 ? amount.toLocaleString('id-ID') : ''}
                      </td>
                    );
                  })}
                  <td className="border border-slate-300 px-1 py-0.5 text-right font-bold">
                    {row.total.toLocaleString('id-ID')}
                  </td>
                  <td className="border border-slate-300 px-1 py-0.5">
                    {row.remarks.join(', ')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="border border-slate-400 px-1 py-1" colSpan={2}>
                TOTAL
              </td>
              {REPORT_COLUMNS.map((column) => {
                const total = columnTotal(column.code);
                return (
                  <td
                    key={column.code}
                    className="border border-slate-400 px-1 py-1 text-right"
                  >
                    {total > 0 ? total.toLocaleString('id-ID') : '0'}
                  </td>
                );
              })}
              <td className="border border-slate-400 px-1 py-1 text-right">
                {report.grandTotal.toLocaleString('id-ID')}
              </td>
              <td className="border border-slate-400" />
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 grid grid-cols-3 gap-6 text-[10px]">
          <div>
            <p className="font-bold underline">Note</p>
            <p className="mt-2">
              Pembayaran diatas Rp. 100K harus melampirkan bukti pembayaran
              (credit card / Debit / Transfer).
            </p>
            <p className="mt-2">
              Untuk setiap tgl yang ada transaksinya harus diberi keterangan
              pergi kemana. Untuk Meal Allowance wajib diberikan penjelasan
              pergi kemana.
            </p>
          </div>
          <div>
            <p className="font-bold">Validated by :</p>
            <p className="mt-10 border-t border-slate-400 pt-1 text-center">
              {report.employee.department ?? ''}
            </p>
          </div>
          <div>
            <p className="font-bold">Approved By</p>
            <p className="mt-10 border-t border-slate-400 pt-1 text-center">
              &nbsp;
            </p>
          </div>
        </div>
      </div>
    );
  },
);

/** Grand total aside, exposed for the summary strip. */
export function reportGrandTotal(report: ExpenseFormReport): string {
  return formatCurrency(report.grandTotal);
}
