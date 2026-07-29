"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Category } from "@/lib/stats";

type Props = {
  label: string;
  prevMonth: string;
  nextMonth: string | null;
  category?: Category;
};

function monthHref(key: string, category?: Category): string {
  return category ? `/?m=${key}&cat=${category}` : `/?m=${key}`;
}

// Left/right arrows plus ← → keys move between months, preserving any active
// category filter. Forward is capped at the current month (nextMonth is null
// there), so the → key and the › are inert.
export function MonthNav({ label, prevMonth, nextMonth, category }: Props) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        router.push(monthHref(prevMonth, category));
      } else if (event.key === "ArrowRight" && nextMonth) {
        router.push(monthHref(nextMonth, category));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, prevMonth, nextMonth, category]);

  return (
    <div className="flex items-center gap-1">
      <Link
        href={monthHref(prevMonth, category)}
        aria-label="Previous month"
        className="px-1 font-mono text-base leading-none text-fog transition-colors hover:text-phosphor"
      >
        ‹
      </Link>
      <h1 className="font-mono text-xs uppercase tracking-[0.3em] text-fog">
        {label}
      </h1>
      {nextMonth ? (
        <Link
          href={monthHref(nextMonth, category)}
          aria-label="Next month"
          className="px-1 font-mono text-base leading-none text-fog transition-colors hover:text-phosphor"
        >
          ›
        </Link>
      ) : (
        <span
          aria-hidden
          className="px-1 font-mono text-base leading-none text-line"
        >
          ›
        </span>
      )}
    </div>
  );
}
