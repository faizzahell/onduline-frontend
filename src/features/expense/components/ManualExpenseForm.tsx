import { CustomSelect } from '../../../components/ui/CustomSelect';
import {
  type CreateEntryInput,
  type DimensionItem,
  type ExpenseCategory,
} from '../api/expense.api';
import { formatCurrency } from '../expense.format';

const ENTERTAINMENT_KINDS = [
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'COFFEE_BREAK', label: 'Coffee break' },
  { value: 'GIFT', label: 'Gift' },
  { value: 'FLOWER_ARRANGEMENT', label: 'Flower arrangement' },
  { value: 'OTHER', label: 'Other' },
];

const RELATION_TYPES = [
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'CONSULTANT', label: 'Consultant' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'OTHER', label: 'Other' },
];

interface ManualExpenseFormFieldsProps {
  form: CreateEntryInput;
  categories: ExpenseCategory[];
  marketingCodes: DimensionItem[];
  update: <K extends keyof CreateEntryInput>(
    key: K,
    value: CreateEntryInput[K],
  ) => void;
}

/**
 * The editable body of an expense entry, shared by the record form and the
 * review/edit page so both show the exact same category-driven fields.
 *
 * It renders only the fields; the surrounding `<form>`, proof upload, and
 * submit button belong to the caller, since those differ between recording a
 * new line and editing an existing one.
 */
export function ManualExpenseFormFields({
  form,
  categories,
  marketingCodes,
  update,
}: ManualExpenseFormFieldsProps) {
  const expenseCategories = categories.filter(
    (category) => category.availableForExpense,
  );

  const selected = expenseCategories.find(
    (category) => category.id === form.categoryId,
  );

  const fixedRate = selected?.rates?.[0]?.amount;

  const mealDays =
    form.mealStartDate && form.mealEndDate
      ? Math.max(
          0,
          Math.round(
            (Date.parse(form.mealEndDate) - Date.parse(form.mealStartDate)) /
              86_400_000,
          ) + 1,
        )
      : 0;

  return (
    <>
      <div className="space-y-1">
        <label className="block font-semibold text-slate-700">Category</label>
        <CustomSelect
          className="w-full"
          aria-label="Expense category"
          options={expenseCategories.map((category) => ({
            value: category.id,
            label: category.name,
            sublabel: category.code,
          }))}
          value={form.categoryId}
          onChange={(value) => update('categoryId', value)}
          placeholder="Select a category..."
        />
      </div>

      <div className="space-y-1">
        <label
          className="block font-semibold text-slate-700"
          htmlFor="expenseDate"
        >
          Receipt date
        </label>
        <input
          id="expenseDate"
          type="date"
          required
          value={form.expenseDate}
          onChange={(event) => update('expenseDate', event.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
        />
      </div>

      {selected?.isMealAllowance ? (
        <div className="space-y-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[11px] text-slate-500">
            Meal allowance uses a fixed rate
            {fixedRate ? ` of ${formatCurrency(fixedRate)}` : ''} per day and
            applies to trips beyond 100 km from the home base. Attach a Talenta
            screenshot as attendance proof.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                className="block font-semibold text-slate-700"
                htmlFor="mealStart"
              >
                Trip start
              </label>
              <input
                id="mealStart"
                type="date"
                required
                value={form.mealStartDate ?? ''}
                onChange={(event) =>
                  update('mealStartDate', event.target.value)
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                className="block font-semibold text-slate-700"
                htmlFor="mealEnd"
              >
                Trip end
              </label>
              <input
                id="mealEnd"
                type="date"
                required
                value={form.mealEndDate ?? ''}
                onChange={(event) => update('mealEndDate', event.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              className="block font-semibold text-slate-700"
              htmlFor="mealDestination"
            >
              Trip destination
            </label>
            <input
              id="mealDestination"
              type="text"
              required
              value={form.mealDestination ?? ''}
              onChange={(event) =>
                update('mealDestination', event.target.value)
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label
              className="block font-semibold text-slate-700"
              htmlFor="mealDistance"
            >
              One-way distance (km)
            </label>
            <input
              id="mealDistance"
              type="number"
              min={0}
              value={form.mealOneWayDistanceKm ?? ''}
              onChange={(event) =>
                update(
                  'mealOneWayDistanceKm',
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />
          </div>

          {mealDays > 0 && (
            <p className="text-[11px] font-bold text-slate-700">
              {mealDays} day{mealDays > 1 ? 's' : ''}
              {fixedRate
                ? ` × ${formatCurrency(fixedRate)} = ${formatCurrency(
                    mealDays * Number(fixedRate),
                  )}`
                : ''}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label
              className="block font-semibold text-slate-700"
              htmlFor="quantity"
            >
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              step="any"
              value={form.quantity ?? 1}
              onChange={(event) =>
                update('quantity', Number(event.target.value))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label
              className="block font-semibold text-slate-700"
              htmlFor="unitPrice"
            >
              Unit price
            </label>
            <input
              id="unitPrice"
              type="number"
              min={0}
              required
              value={form.unitPrice ?? ''}
              onChange={(event) =>
                update(
                  'unitPrice',
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none font-bold"
            />
          </div>
        </div>
      )}

      {selected?.requiresDestination && !selected.isMealAllowance && (
        <div className="space-y-1">
          <label
            className="block font-semibold text-slate-700"
            htmlFor="destination"
          >
            Destination (required)
          </label>
          <input
            id="destination"
            type="text"
            required
            value={form.destination ?? ''}
            onChange={(event) => update('destination', event.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
          />
        </div>
      )}

      {selected?.requiresMarketingCode && (
        <div className="space-y-1">
          <label className="block font-semibold text-slate-700">
            Marketing code (required)
          </label>
          <CustomSelect
            className="w-full"
            aria-label="Marketing code"
            options={marketingCodes.map((code) => ({
              value: code.id,
              label: code.code,
              sublabel: code.name,
            }))}
            value={form.marketingCodeId ?? ''}
            onChange={(value) => update('marketingCodeId', value)}
            placeholder="Select a marketing code..."
          />
        </div>
      )}

      {selected?.isEntertainment && (
        <div className="space-y-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
          <p className="text-[11px] text-amber-900">
            The fields below feed the Entertainment Nominative List required for
            tax reporting.
          </p>

          <input
            type="text"
            required
            placeholder="Venue / merchant name"
            value={form.entertainmentMerchantName ?? ''}
            onChange={(event) =>
              update('entertainmentMerchantName', event.target.value)
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
          />

          <input
            type="text"
            placeholder="Merchant address"
            value={form.entertainmentMerchantAddress ?? ''}
            onChange={(event) =>
              update('entertainmentMerchantAddress', event.target.value)
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              className="w-full"
              aria-label="Entertainment kind"
              options={ENTERTAINMENT_KINDS}
              value={form.entertainmentKind ?? 'LUNCH'}
              onChange={(value) => update('entertainmentKind', value)}
            />
            <CustomSelect
              className="w-full"
              aria-label="Relation business type"
              options={RELATION_TYPES}
              value={form.entertainmentRelationBusinessType ?? 'CUSTOMER'}
              onChange={(value) =>
                update('entertainmentRelationBusinessType', value)
              }
            />
          </div>

          <input
            type="text"
            required
            placeholder="Relation name"
            value={form.entertainmentRelationName ?? ''}
            onChange={(event) =>
              update('entertainmentRelationName', event.target.value)
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Position"
              value={form.entertainmentRelationPosition ?? ''}
              onChange={(event) =>
                update('entertainmentRelationPosition', event.target.value)
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />
            <input
              type="text"
              placeholder="Phone number"
              value={form.entertainmentRelationPhone ?? ''}
              onChange={(event) =>
                update('entertainmentRelationPhone', event.target.value)
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
            />
          </div>

          <input
            type="text"
            placeholder="Relation company name"
            value={form.entertainmentRelationCompany ?? ''}
            onChange={(event) =>
              update('entertainmentRelationCompany', event.target.value)
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
          />
        </div>
      )}

      <div className="space-y-1">
        <label
          className="block font-semibold text-slate-700"
          htmlFor="description"
        >
          Description
        </label>
        <input
          id="description"
          type="text"
          value={form.description ?? ''}
          onChange={(event) => update('description', event.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#D32F2F] focus:outline-none"
        />
      </div>
    </>
  );
}
