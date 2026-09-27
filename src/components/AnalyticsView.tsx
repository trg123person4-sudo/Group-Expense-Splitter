"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";

interface ExpenseSplit {
  userId: string;
  shareAmount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  date: string | Date;
  splitType: string;
  splits: ExpenseSplit[];
  payer?: { name: string };
}

interface Member {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface AnalyticsViewProps {
  expenses: Expense[];
  members: Member[];
  currency?: string;
  budgetLimit?: number | null;
  groupName: string;
}

export function AnalyticsView({
  expenses,
  members,
  currency = "USD",
  budgetLimit,
  groupName,
}: AnalyticsViewProps) {
  const categoryStats = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    for (const exp of expenses) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
      grandTotal += exp.amount;
    }

    return Object.entries(totals)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const memberStats = useMemo(() => {
    const paidMap: Record<string, number> = {};
    const owedMap: Record<string, number> = {};

    members.forEach((m) => {
      paidMap[m.user.id] = 0;
      owedMap[m.user.id] = 0;
    });

    for (const exp of expenses) {
      if (paidMap[exp.paidBy] !== undefined) {
        paidMap[exp.paidBy] += exp.amount;
      }
      for (const split of exp.splits) {
        if (owedMap[split.userId] !== undefined) {
          owedMap[split.userId] += split.shareAmount;
        }
      }
    }

    return members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      paid: Math.round(paidMap[m.user.id] * 100) / 100,
      consumed: Math.round(owedMap[m.user.id] * 100) / 100,
    }));
  }, [expenses, members]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPct = budgetLimit && budgetLimit > 0 ? Math.min(100, Math.round((totalSpent / budgetLimit) * 100)) : null;

  const handleExportCSV = () => {
    const headers = ["Date", "Description", "Category", "Amount", "Currency", "Paid By", "Split Type"];
    const rows = expenses.map((e) => [
      new Date(e.date).toISOString().split("T")[0],
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      e.amount.toFixed(2),
      currency,
      `"${e.payer?.name || e.paidBy}"`,
      e.splitType,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${groupName.replace(/\s+/g, "_")}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted block">
            Financial Analytics
          </span>
          <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
            Ledger Breakdown
          </h3>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-light-border dark:border-dark-border text-xs font-mono text-light-textPrimary dark:text-dark-textPrimary hover:border-accent hover:text-accent transition-colors"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Budget progress */}
      {budgetLimit && (
        <div className="p-4 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-light-textSecondary">Budget Burn</span>
            <span className="tabular-nums font-medium">
              {formatCurrency(totalSpent, currency)} / {formatCurrency(budgetLimit, currency)} ({budgetPct}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded bg-light-subtle dark:bg-dark-subtle overflow-hidden">
            <div
              className={`h-full ${
                (budgetPct || 0) > 90 ? "bg-debt" : "bg-accent"
              }`}
              style={{ width: `${budgetPct}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown Table */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted block">
            Expenditure by Category
          </span>
          <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border bg-light-surface dark:bg-dark-surface font-mono text-xs">
            {categoryStats.map((item) => (
              <div key={item.category} className="p-3 flex items-center justify-between">
                <span className="capitalize">{item.category}</span>
                <div className="flex items-center gap-4">
                  <span className="text-light-textMuted text-[11px] tabular-nums">
                    {item.percentage.toFixed(0)}%
                  </span>
                  <span className="tabular-nums font-medium text-light-textPrimary dark:text-dark-textPrimary">
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Member Balances Table */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted block">
            Member Balances (Paid vs Consumed)
          </span>
          <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border bg-light-surface dark:bg-dark-surface font-mono text-xs">
            {memberStats.map((m) => {
              const net = m.paid - m.consumed;
              return (
                <div key={m.id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-light-textPrimary dark:text-dark-textPrimary">
                      {m.name}
                    </span>
                    <span className="block text-[10px] text-light-textMuted mt-0.5">
                      Paid: ${m.paid.toFixed(2)} • Share: ${m.consumed.toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={`tabular-nums font-medium ${
                      net > 0 ? "text-credit" : net < 0 ? "text-debt" : "text-light-textMuted"
                    }`}
                  >
                    {net > 0 ? `+${formatCurrency(net, currency)}` : formatCurrency(net, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
