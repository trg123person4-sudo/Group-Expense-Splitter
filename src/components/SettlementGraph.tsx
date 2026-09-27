"use client";

import { useState } from "react";
import { SimplifiedTransaction, BalanceMember } from "@/lib/settlement";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Check, DollarSign } from "lucide-react";

interface SettlementGraphProps {
  members: BalanceMember[];
  netBalances: Record<string, number>;
  transactions: SimplifiedTransaction[];
  currency?: string;
  currentUserId?: string;
  onRecordSettlement: (fromUser: string, toUser: string, amount: number, method: string) => Promise<void>;
}

export function SettlementGraph({
  members,
  netBalances,
  transactions,
  currency = "USD",
  currentUserId,
  onRecordSettlement,
}: SettlementGraphProps) {
  const [selectedTxn, setSelectedTxn] = useState<SimplifiedTransaction | null>(null);
  const [settling, setSettling] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  const width = 600;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 150;

  const nodePositions: Record<string, { x: number; y: number }> = {};
  const activeMembers = members.filter((m) => netBalances[m.id] !== undefined);
  const count = activeMembers.length;

  activeMembers.forEach((m, idx) => {
    const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
    nodePositions[m.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const handleSettle = async () => {
    if (!selectedTxn) return;
    setSettling(true);
    try {
      await onRecordSettlement(
        selectedTxn.fromUser,
        selectedTxn.toUser,
        selectedTxn.amount,
        paymentMethod
      );
      setSelectedTxn(null);
    } catch (err) {
      console.error("Failed to settle", err);
    } finally {
      setSettling(false);
    }
  };

  const totalDebtVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Ledger Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface divide-y sm:divide-y-0 sm:divide-x divide-light-border dark:divide-dark-border">
        <div className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase tracking-wider block">
            Optimal Transactions
          </span>
          <div className="text-2xl font-mono font-medium tabular-nums text-light-textPrimary dark:text-dark-textPrimary">
            {transactions.length}
          </div>
          <span className="text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary block">
            Greedy $O(n-1)$ algorithm
          </span>
        </div>

        <div className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase tracking-wider block">
            Active Debt Volume
          </span>
          <div className="text-2xl font-mono font-medium tabular-nums text-light-textPrimary dark:text-dark-textPrimary">
            {formatCurrency(totalDebtVolume, currency)}
          </div>
          <span className="text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary block">
            Across {transactions.length} transfer(s)
          </span>
        </div>

        <div className="p-4 space-y-1">
          <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase tracking-wider block">
            Participant Status
          </span>
          <div className="text-2xl font-mono font-medium tabular-nums text-light-textPrimary dark:text-dark-textPrimary">
            {activeMembers.length}
          </div>
          <span className="text-[11px] font-mono text-light-textSecondary dark:text-dark-textSecondary block">
            Members in ledger
          </span>
        </div>
      </div>

      {/* SVG Directed Graph */}
      <div className="p-6 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-light-border dark:border-dark-border">
          <span className="text-xs font-mono uppercase tracking-wider text-light-textSecondary dark:text-dark-textSecondary">
            Directed Debt Graph
          </span>
          <div className="flex items-center gap-4 text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-credit"></span> Creditor (+)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-debt"></span> Debtor (-)
            </span>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="text-sm font-medium text-light-textPrimary dark:text-dark-textPrimary">
              All debts settled
            </div>
            <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary font-mono">
              Net balance is zero across all group members.
            </p>
          </div>
        ) : (
          <div className="relative flex justify-center items-center py-4">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full max-w-xl h-auto overflow-visible select-none"
            >
              <defs>
                <marker
                  id="arrow-marker"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#C84420" />
                </marker>
              </defs>

              {/* Transaction Vectors */}
              {transactions.map((txn) => {
                const from = nodePositions[txn.fromUser];
                const to = nodePositions[txn.toUser];
                if (!from || !to) return null;

                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const normX = -dy / dist;
                const normY = dx / dist;
                const curvature = 20;
                const midX = (from.x + to.x) / 2 + normX * curvature;
                const midY = (from.y + to.y) / 2 + normY * curvature;

                const pathData = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

                return (
                  <g key={txn.id} className="cursor-pointer group" onClick={() => setSelectedTxn(txn)}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#C84420"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="animate-flow-dash"
                      markerEnd="url(#arrow-marker)"
                    />

                    {/* Amount Pill */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-30"
                        y="-10"
                        width="60"
                        height="20"
                        rx="4"
                        className="fill-light-surface dark:fill-dark-surface stroke-light-border dark:stroke-dark-border"
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        y="3.5"
                        className="fill-accent text-[11px] font-mono font-medium pointer-events-none"
                      >
                        {formatCurrency(txn.amount, currency)}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Member Nodes */}
              {activeMembers.map((member) => {
                const pos = nodePositions[member.id];
                if (!pos) return null;
                const balance = netBalances[member.id] || 0;
                const isCreditor = balance > 0.01;
                const isDebtor = balance < -0.01;

                return (
                  <g key={member.id} transform={`translate(${pos.x}, ${pos.y})`}>
                    <circle
                      r="22"
                      className={`fill-light-surface dark:fill-dark-surface stroke-1 ${
                        isCreditor
                          ? "stroke-credit"
                          : isDebtor
                          ? "stroke-debt"
                          : "stroke-light-border dark:stroke-dark-border"
                      }`}
                    />

                    {/* Member Initials */}
                    <text
                      textAnchor="middle"
                      y="4"
                      className="fill-light-textPrimary dark:fill-dark-textPrimary text-xs font-mono font-medium pointer-events-none"
                    >
                      {member.name.split(" ")[0].slice(0, 2).toUpperCase()}
                    </text>

                    {/* Name */}
                    <text
                      y="34"
                      textAnchor="middle"
                      className="fill-light-textPrimary dark:fill-dark-textPrimary text-xs font-medium"
                    >
                      {member.name.split(" ")[0]}
                    </text>

                    {/* Balance */}
                    <text
                      y="46"
                      textAnchor="middle"
                      className={`text-[11px] font-mono tabular-nums ${
                        isCreditor ? "fill-credit font-medium" : isDebtor ? "fill-debt font-medium" : "fill-light-textMuted"
                      }`}
                    >
                      {balance > 0 ? `+${formatCurrency(balance, currency)}` : formatCurrency(balance, currency)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Transaction List */}
      {transactions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-wider text-light-textSecondary dark:text-dark-textSecondary">
            Execution Ledger
          </span>
          <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border bg-light-surface dark:bg-dark-surface">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-light-subtle dark:hover:bg-dark-subtle transition-colors text-xs"
              >
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-debt font-medium">{txn.fromName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted" strokeWidth={1.5} />
                  <span className="text-credit font-medium">{txn.toName}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono font-medium tabular-nums text-light-textPrimary dark:text-dark-textPrimary">
                    {formatCurrency(txn.amount, currency)}
                  </span>
                  <button
                    onClick={() => setSelectedTxn(txn)}
                    className="px-2.5 py-1 rounded border border-light-border dark:border-dark-border hover:border-accent text-light-textPrimary dark:text-dark-textPrimary hover:text-accent text-xs font-mono transition-colors"
                  >
                    Settle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded max-w-sm w-full p-6 space-y-4 shadow-subtle">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase tracking-wider">
                Confirm Settlement
              </span>
              <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
                {selectedTxn.fromName} pays {selectedTxn.toName}
              </h3>
            </div>

            <div className="p-3 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-center">
              <span className="text-2xl font-mono font-medium tabular-nums text-accent">
                {formatCurrency(selectedTxn.amount, currency)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary">
                Method
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                {["UPI", "PayPal", "Venmo", "Cash"].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1 rounded border transition-colors ${
                      paymentMethod === method
                        ? "border-accent text-accent font-medium"
                        : "border-light-border dark:border-dark-border text-light-textSecondary"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="flex-1 py-1.5 rounded border border-light-border dark:border-dark-border text-xs font-medium text-light-textSecondary hover:bg-light-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettle}
                disabled={settling}
                className="flex-1 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
              >
                {settling ? "Recording..." : "Record Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
