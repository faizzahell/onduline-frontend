import { FileText, Clock3, CircleCheck, AlertTriangle } from 'lucide-react';

const stats = [
  {
    label: 'Pending OCR',
    value: '12',
    icon: Clock3,
  },
  {
    label: 'Needs Review',
    value: '7',
    icon: AlertTriangle,
  },
  {
    label: 'Completed',
    value: '128',
    icon: CircleCheck,
  },
  {
    label: 'Total Invoices',
    value: '147',
    icon: FileText,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <p className="text-sm text-muted-foreground">
          Purchase invoice processing overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>

                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>

              <div className="rounded-lg bg-muted p-2">
                <Icon className="size-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
