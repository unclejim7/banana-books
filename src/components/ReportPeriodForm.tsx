const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function MonthYearSelect({
  namePrefix,
  label,
  year,
  month,
}: {
  namePrefix: string;
  label: string;
  year: number;
  month: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-neutral-500">{label}</label>
      <div className="flex gap-2">
        <select
          name={`${namePrefix}Month`}
          defaultValue={month}
          className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          name={`${namePrefix}Year`}
          defaultValue={year}
          className="w-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 text-sm"
        />
      </div>
    </div>
  );
}

export function ReportPeriodForm({
  mode,
  from,
  to,
  asOf,
}: {
  mode: "range" | "asOf";
  from?: { year: number; month: number };
  to?: { year: number; month: number };
  asOf?: { year: number; month: number };
}) {
  return (
    <form className="flex flex-wrap items-end gap-3">
      {mode === "range" && from && to ? (
        <>
          <MonthYearSelect namePrefix="from" label="From" year={from.year} month={from.month} />
          <MonthYearSelect namePrefix="to" label="To" year={to.year} month={to.month} />
        </>
      ) : (
        asOf && <MonthYearSelect namePrefix="asOf" label="As of" year={asOf.year} month={asOf.month} />
      )}
      <button
        type="submit"
        className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
      >
        Update
      </button>
    </form>
  );
}
