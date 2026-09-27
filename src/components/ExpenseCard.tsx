"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronRight, FileText, Repeat } from "lucide-react";

interface Split {
  userId: string;
  shareAmount: number;
  user: { name: string };
}

interface ExpenseItem {
  id: string;
  name: string;
  price: number;
}

interface ExpenseComment {
  id: string;
  text: string;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
}

export interface ExpenseProps {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidBy: string;
  date: string | Date;
  receiptImageUrl?: string | null;
  splitType: string;
  isRecurring: boolean;
  payer: { id: string; name: string; avatarUrl: string | null };
  splits: Split[];
  items?: ExpenseItem[];
  comments?: ExpenseComment[];
}

export function ExpenseCard({
  expense,
  currentUserId,
  currency = "USD",
  onOpenDetails,
}: {
  expense: ExpenseProps;
  currentUserId: string;
  currency?: string;
  onDelete?: (id: string) => void;
  onOpenDetails?: (expense: ExpenseProps) => void;
}) {
  const isPayer = expense.paidBy === currentUserId;
  const mySplit = expense.splits.find((s) => s.userId === currentUserId);

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails(expense)}
      className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-light-subtle dark:hover:bg-dark-subtle transition-colors cursor-pointer group select-none"
    >
      {/* Left: Category Tag + Description + Date + Payer */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted dark:text-dark-textMuted w-14 sm:w-16 truncate">
          {expense.category}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs sm:text-sm text-light-textPrimary dark:text-dark-textPrimary truncate group-hover:text-accent transition-colors">
              {expense.description}
            </span>
            {expense.receiptImageUrl && (
              <FileText className="w-3 h-3 text-light-textMuted dark:text-dark-textMuted flex-shrink-0" strokeWidth={1.5} />
            )}
            {expense.isRecurring && (
              <Repeat className="w-3 h-3 text-light-textMuted dark:text-dark-textMuted flex-shrink-0" strokeWidth={1.5} />
            )}
          </div>

          <div className="text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary mt-0.5 truncate">
            {formatDate(expense.date)} • {isPayer ? "You paid" : `${expense.payer.name.split(" ")[0]} paid`} {formatCurrency(expense.amount, currency)}
          </div>
        </div>
      </div>

      {/* Right: Personal Share Column & Arrow */}
      <div className="flex items-center gap-4 sm:gap-8 flex-shrink-0 text-right">
        <div>
          <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase block">
            {isPayer ? "Your share" : "You owe"}
          </span>
          <span
            className={`font-mono text-xs sm:text-sm font-medium tabular-nums ${
              mySplit
                ? isPayer
                  ? "text-credit"
                  : "text-debt"
                : "text-light-textMuted dark:text-dark-textMuted"
            }`}
          >
            {mySplit ? formatCurrency(mySplit.shareAmount, currency) : "—"}
          </span>
        </div>

        <ChevronRight
          className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted group-hover:text-light-textPrimary dark:group-hover:text-dark-textPrimary transition-colors"
          strokeWidth={1.5}
        />
      </div>
    </div>
  );
}
