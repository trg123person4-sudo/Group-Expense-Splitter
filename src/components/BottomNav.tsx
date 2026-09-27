"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, Sparkles, PieChart, Users } from "lucide-react";

export function BottomNav({
  activeTab,
  onSelectTab,
  isGroupPage,
}: {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  isGroupPage?: boolean;
}) {
  const pathname = usePathname();

  if (isGroupPage && onSelectTab) {
    return (
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-darkbg-card/95 border-t border-stone-200 dark:border-darkbg-border backdrop-blur-md px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => onSelectTab("expenses")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "expenses"
              ? "text-terracotta-600 dark:text-terracotta-400"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expenses</span>
        </button>

        <button
          onClick={() => onSelectTab("settle")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "settle"
              ? "text-terracotta-600 dark:text-terracotta-400"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Settle Up</span>
        </button>

        <button
          onClick={() => onSelectTab("assistant")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "assistant"
              ? "text-terracotta-600 dark:text-terracotta-400"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Ledger</span>
        </button>

        <button
          onClick={() => onSelectTab("analytics")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "analytics"
              ? "text-terracotta-600 dark:text-terracotta-400"
              : "text-stone-400 hover:text-stone-600"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Analytics</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-darkbg-card/95 border-t border-stone-200 dark:border-darkbg-border backdrop-blur-md px-4 py-2 flex items-center justify-around">
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          pathname === "/" ? "text-terracotta-600 dark:text-terracotta-400" : "text-stone-400"
        }`}
      >
        <Home className="w-4 h-4" />
        <span>Dashboard</span>
      </Link>
    </nav>
  );
}
