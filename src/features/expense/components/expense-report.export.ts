import type { ExpenseFormReport } from '../api/expense.api';
import { REPORT_COLUMNS, columnAmount } from './ExpenseFormReportView';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function shortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${month}/${day}/${year.slice(2)}`;
}

function dayName(iso: string): string {
  return DAY_NAMES[new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Builds the report as a spreadsheet-flavoured HTML table and downloads it as
 * an `.xls`. Excel opens the markup directly, so the grid and headers match
 * the on-screen report without pulling in a spreadsheet library.
 */
export function downloadExpenseReportXls(
  report: ExpenseFormReport,
  companyName: string,
): void {
  const headerCells = [
    'DATE',
    'DAY',
    ...REPORT_COLUMNS.map((column) => column.label),
    'TOTAL',
    'KETERANGAN',
  ]
    .map(
      (label) =>
        `<th style="border:1px solid #999;background:#f1f5f9;padding:4px">${escapeHtml(label)}</th>`,
    )
    .join('');

  const bodyRows = report.rows
    .map((row) => {
      const cells = [
        shortDate(row.date),
        dayName(row.date),
        ...REPORT_COLUMNS.map((column) => {
          const amount = columnAmount(row.amounts, column.code);
          return amount > 0 ? String(amount) : '';
        }),
        String(row.total),
        row.remarks.join(', '),
      ];

      return `<tr>${cells
        .map(
          (value, index) =>
            `<td style="border:1px solid #ccc;padding:3px;${index >= 2 && index <= REPORT_COLUMNS.length + 2 ? 'text-align:right' : ''}">${escapeHtml(
              value,
            )}</td>`,
        )
        .join('')}</tr>`;
    })
    .join('');

  const totalCells = [
    'TOTAL',
    '',
    ...REPORT_COLUMNS.map((column) =>
      String(
        report.rows.reduce(
          (sum, row) => sum + columnAmount(row.amounts, column.code),
          0,
        ),
      ),
    ),
    String(report.grandTotal),
    '',
  ]
    .map(
      (value, index) =>
        `<td style="border:1px solid #999;padding:4px;font-weight:bold;${index >= 2 && index <= REPORT_COLUMNS.length + 2 ? 'text-align:right' : ''}">${escapeHtml(value)}</td>`,
    )
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="utf-8" /></head>
      <body>
        <table>
          <tr><td style="font-weight:bold">${escapeHtml(companyName)}</td></tr>
          <tr><td style="font-weight:bold">EXPENSE CLAIM REPORT</td></tr>
          <tr><td></td></tr>
          <tr><td style="font-weight:bold">NAME</td><td>: ${escapeHtml(report.employee.name)}</td></tr>
          <tr><td style="font-weight:bold">CLAIM FOR MONTH</td><td>: ${escapeHtml(
            report.periodStart.slice(0, 7),
          )}</td></tr>
        </table>
        <table style="border-collapse:collapse">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
          <tfoot><tr>${totalCells}</tr></tfoot>
        </table>
      </body>
    </html>`;

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expense-report-${report.employee.employeeCode}-${report.periodStart.slice(0, 7)}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Opens the browser print dialog scoped to the report, which doubles as
 * "Save as PDF". The print CSS in index.css hides everything except the report
 * node so the output is just the form.
 */
export function printExpenseReport(): void {
  window.print();
}
