"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface NewGroupModalProps {
  onClose: () => void;
  onSuccess: (newGroupId: string) => void;
}

export function NewGroupModal({ onClose, onSuccess }: NewGroupModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"trip" | "home" | "couple" | "other">("trip");
  const [currency, setCurrency] = useState("USD");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [memberEmails, setMemberEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const emails = memberEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && e.includes("@"));

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          currency,
          budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null,
          memberEmails: emails,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }

      const data = await res.json();
      onSuccess(data.group.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { key: "trip", label: "Trip" },
    { key: "home", label: "Home" },
    { key: "couple", label: "Couple" },
    { key: "other", label: "Other" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded max-w-sm w-full p-6 space-y-4 shadow-subtle text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div>
            <span className="text-[10px] font-mono text-light-textMuted uppercase tracking-wider block">
              Ledger Configuration
            </span>
            <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
              New Group
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-light-textMuted hover:text-light-textPrimary">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded border border-debt/30 bg-debt/5 text-xs text-debt font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          <div>
            <label className="text-[10px] text-light-textMuted uppercase block">Group Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Barcelona Trip, Flat 402"
              className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-[10px] text-light-textMuted uppercase block mb-1">Type</label>
            <div className="grid grid-cols-4 gap-1">
              {types.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`py-1 rounded border text-center text-xs transition-colors ${
                    type === t.key
                      ? "border-accent text-accent font-medium bg-accent-subtle dark:bg-accent-darkSubtle"
                      : "border-light-border dark:border-dark-border text-light-textSecondary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-light-textMuted uppercase block">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-light-textMuted uppercase block">Budget Cap (Optional)</label>
              <input
                type="number"
                placeholder="2000"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs tabular-nums focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-light-textMuted uppercase block">
              Member Emails (Comma separated)
            </label>
            <input
              type="text"
              placeholder="sarah@tally.local, david@tally.local"
              value={memberEmails}
              onChange={(e) => setMemberEmails(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs focus:outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 rounded border border-light-border dark:border-dark-border text-xs font-medium text-light-textSecondary hover:bg-light-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
            >
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
