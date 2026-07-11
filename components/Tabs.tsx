"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Budget" },
  { href: "/stats", label: "Stats" },
] as const;

export function Tabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="flex items-stretch">
      {TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center border-x border-line px-5 font-mono text-xs uppercase tracking-widest transition-colors -ml-px ${
              active
                ? "bg-phosphor text-black"
                : "text-fog hover:bg-panel hover:text-paper"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
