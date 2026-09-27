"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { X, Camera } from "lucide-react";

interface Member {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface AddExpenseModalProps {
  groupId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
  onOpenReceiptMode: () => void;
}

export function AddExpenseModal({
  groupId,
  currency,
  members,
  currentUserId,
  onClose,
  onSuccess,
  onOpenReceiptMode,
}: AddExpenseModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [splitType, setSplitType] = useState<"equal" | "exact" | "percentage" | "shares">("equal");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState("monthly");

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    members.map((m) => m.user.id)
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, number>>({});
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [sharesCount, setSharesCount] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelectUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length > 1) {
        setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
      }
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please provide a valid description and positive amount.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        description: description.trim(),
        amount: parsedAmount,
        currency,
        category,
        paidBy,
        date: new Date().toISOString(),
        splitType,
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : null,
      };

      if (splitType === "equal") {
        payload.selectedUserIds = selectedUserIds;
      } else if (splitType === "exact") {
        payload.exactAmounts = exactAmounts;
      } else if (splitType === "percentage") {
        payload.percentages = percentages;
      } else if (splitType === "shares") {
        payload.sharesCount = sharesCount;
      }

      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record expense");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded max-w-md w-full p-6 my-8 space-y-5 shadow-subtle">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div>
            <span className="text-[10px] font-mono text-light-textMuted uppercase tracking-wider block">
              New Ledger Entry
            </span>
            <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
              Add Expense
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-light-textMuted hover:text-light-textPrimary">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* OCR Switcher link */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenReceiptMode();
          }}
          className="w-full p-2.5 rounded border border-light-border dark:border-dark-border text-xs font-mono text-left flex items-center justify-between hover:border-accent text-light-textSecondary hover:text-accent transition-colors"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Have a physical receipt?</span>
          </div>
          <span className="text-accent underline text-[11px]">Use OCR Split →</span>
        </button>

        {error && (
          <div className="p-2.5 rounded border border-debt/30 bg-debt/5 text-xs text-debt font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
          <div>
            <label className="text-[10px] text-light-textMuted uppercase block">Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner, Taxi, Groceries"
              className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent font-medium focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-light-textMuted uppercase block">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent font-medium tabular-nums focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] text-light-textMuted uppercase block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent font-medium focus:outline-none"
              >
                <option value="food">Food & Drinks</option>
                <option value="travel">Travel</option>
                <option value="lodging">Lodging</option>
                <option value="entertainment">Entertainment</option>
                <option value="utilities">Utilities</option>
                <option value="groceries">Groceries</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-light-textMuted uppercase block">Paid By</label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent font-medium focus:outline-none"
            >
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name} {m.user.id === currentUserId ? "(You)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Split Mode Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-light-textMuted uppercase block">Split Method</label>
            <div className="grid grid-cols-4 gap-1">
              {(["equal", "exact", "percentage", "shares"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`py-1 rounded border text-center capitalize text-xs transition-colors ${
                    splitType === type
                      ? "border-accent text-accent font-medium bg-accent-subtle dark:bg-accent-darkSubtle"
                      : "border-light-border dark:border-dark-border text-light-textSecondary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {splitType === "equal" && (
            <div className="p-3 rounded border border-light-border dark:border-dark-border space-y-2">
              <span className="text-[10px] text-light-textMuted uppercase block">Participants</span>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const isChecked = selectedUserIds.includes(m.user.id);
                  return (
                    <button
                      key={m.user.id}
                      type="button"
                      onClick={() => toggleSelectUser(m.user.id)}
                      className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                        isChecked
                          ? "border-accent text-accent bg-accent-subtle dark:bg-accent-darkSubtle font-medium"
                          : "border-light-border dark:border-dark-border text-light-textSecondary"
                      }`}
                    >
                      {m.user.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {splitType === "exact" && (
            <div className="p-3 rounded border border-light-border dark:border-dark-border space-y-1.5">
              <span className="text-[10px] text-light-textMuted uppercase block">Exact Amounts</span>
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between text-xs">
                  <span>{m.user.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={exactAmounts[m.user.id] || ""}
                    onChange={(e) =>
                      setExactAmounts({
                        ...exactAmounts,
                        [m.user.id]: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-20 px-2 py-0.5 rounded border border-light-border dark:border-dark-border text-right bg-transparent tabular-nums"
                  />
                </div>
              ))}
            </div>
          )}

          {splitType === "percentage" && (
            <div className="p-3 rounded border border-light-border dark:border-dark-border space-y-1.5">
              <span className="text-[10px] text-light-textMuted uppercase block">Percentages (Total: 100%)</span>
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between text-xs">
                  <span>{m.user.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="0"
                      value={percentages[m.user.id] || ""}
                      onChange={(e) =>
                        setPercentages({
                          ...percentages,
                          [m.user.id]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-16 px-2 py-0.5 rounded border border-light-border dark:border-dark-border text-right bg-transparent tabular-nums"
                    />
                    <span>%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {splitType === "shares" && (
            <div className="p-3 rounded border border-light-border dark:border-dark-border space-y-1.5">
              <span className="text-[10px] text-light-textMuted uppercase block">Ratio Shares</span>
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between text-xs">
                  <span>{m.user.name}</span>
                  <input
                    type="number"
                    placeholder="1"
                    value={sharesCount[m.user.id] || ""}
                    onChange={(e) =>
                      setSharesCount({
                        ...sharesCount,
                        [m.user.id]: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-16 px-2 py-0.5 rounded border border-light-border dark:border-dark-border text-right bg-transparent tabular-nums"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 rounded border border-light-border dark:border-dark-border text-light-textSecondary hover:bg-light-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-1.5 rounded bg-accent text-white font-medium hover:bg-accent-hover transition-colors"
            >
              {loading ? "Recording..." : "Record Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
