import Link from "next/link";
import type { Category } from "@/lib/stats";

const FILTERS: { value: Category | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "needs", label: "Needs" },
  { value: "wants", label: "Wants" },
];

function href(month: string, category: Category | null): string {
  return category ? `/?m=${month}&cat=${category}` : `/?m=${month}`;
}

export function CategoryFilter({
  month,
  active,
}: {
  month: string;
  active: Category | null;
}) {
  return (
    <div className="flex gap-2" role="group" aria-label="Filter by category">
      {FILTERS.map((filter) => {
        const isActive = filter.value === active;
        return (
          <Link
            key={filter.label}
            href={href(month, filter.value)}
            aria-current={isActive ? "true" : undefined}
            className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
              isActive
                ? "border-phosphor bg-phosphor text-black"
                : "border-line text-fog hover:border-phosphor hover:text-phosphor"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
