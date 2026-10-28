import type { SummaryBucket } from '../api/expense.api';
import { formatCurrency } from '../expense.format';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Short IDR label for the axis and bar captions, e.g. 1,2 jt or 850 rb. */
function compactIdr(value: number): string {
  if (value <= 0) {
    return '0';
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 1,
    })} M`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 1,
    })} jt`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString('id-ID')} rb`;
  }

  return value.toLocaleString('id-ID');
}

/** A rounded "nice" number at or above the value, for a readable axis top. */
function niceCeil(value: number): number {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
}

interface Props {
  data: SummaryBucket[];
  /** 1-12 of the month currently selected in the filters, highlighted. */
  highlightMonth?: number;
}

/**
 * A dependency-free monthly bar chart. The dashboard groups approved expenses
 * by the two-digit month, so this fills in all twelve months, draws a scaled
 * y-axis with gridlines, and labels every non-zero bar. The month picked in
 * the filters is highlighted so it reads against the rest of the year.
 */
export function MonthlyBarChart({ data, highlightMonth }: Props) {
  const byMonth = new Map(data.map((bucket) => [bucket.label, bucket.amount]));
  const months = MONTH_LABELS.map((label, index) => ({
    label,
    month: index + 1,
    amount: byMonth.get(String(index + 1).padStart(2, '0')) ?? 0,
  }));

  const peak = Math.max(0, ...months.map((month) => month.amount));
  const hasData = peak > 0;
  const axisTop = niceCeil(peak);

  // Four evenly spaced gridlines from the top down to zero.
  const gridLines = [1, 0.75, 0.5, 0.25, 0].map((fraction) => ({
    fraction,
    value: axisTop * fraction,
  }));

  if (!hasData) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
        No approved expenses to chart for this year yet.
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {/* Y-axis scale. */}
      <div className="flex flex-col justify-between h-48 py-1 text-[9px] text-slate-400 text-right shrink-0">
        {gridLines.map((line) => (
          <span key={line.fraction}>{compactIdr(line.value)}</span>
        ))}
      </div>

      {/* Plot area with gridlines behind the bars. */}
      <div className="relative flex-1">
        <div className="absolute inset-0 flex flex-col justify-between py-1">
          {gridLines.map((line) => (
            <div
              key={line.fraction}
              className="border-t border-dashed border-slate-100"
            />
          ))}
        </div>

        <div className="relative flex items-end gap-1.5 h-48 py-1">
          {months.map((month) => {
            const height = (month.amount / axisTop) * 100;
            const isActive = month.month === highlightMonth;

            return (
              <div
                key={month.label}
                className="flex-1 flex flex-col items-center justify-end gap-1 group h-full"
                title={`${month.label}: ${formatCurrency(month.amount)}`}
              >
                <span className="text-[9px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {compactIdr(month.amount)}
                </span>
                <div
                  className={`w-full max-w-[26px] rounded-t transition-all ${
                    isActive
                      ? 'bg-[#D32F2F]'
                      : 'bg-[#D32F2F]/40 group-hover:bg-[#D32F2F]/70'
                  }`}
                  style={{
                    height: `${Math.max(height, month.amount > 0 ? 2 : 0)}%`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis month labels aligned with the bars. */}
        <div className="flex gap-1.5 mt-1">
          {months.map((month) => (
            <span
              key={month.label}
              className={`flex-1 text-center text-[9px] ${
                month.month === highlightMonth
                  ? 'font-bold text-[#D32F2F]'
                  : 'text-slate-400'
              }`}
            >
              {month.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
