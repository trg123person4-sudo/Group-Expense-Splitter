"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { SettlementGraph } from "@/components/SettlementGraph";
import { ReceiptSplitModal } from "@/components/ReceiptSplitModal";
import { LedgerAssistant } from "@/components/LedgerAssistant";
import { AnalyticsView } from "@/components/AnalyticsView";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { ExpenseCard, ExpenseProps } from "@/components/ExpenseCard";
import { ExpenseDetailModal } from "@/components/ExpenseDetailModal";
import { InviteModal } from "@/components/InviteModal";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Camera,
  Receipt,
  Users,
  Terminal,
  PieChart,
  UserPlus,
  RefreshCw,
} from "lucide-react";

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = use(params);

  const [groupData, setGroupData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "settle" | "assistant" | "analytics">("expenses");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showReceiptScan, setShowReceiptScan] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseProps | null>(null);

  const loadGroup = () => {
    setLoading(true);
    fetch(`/api/groups/${groupId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load group");
        return res.json();
      })
      .then((data) => {
        setGroupData(data);
        if (data.currentUser) setCurrentUser(data.currentUser);
      })
      .catch((err) => console.error("Error loading group:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const handleRecordSettlement = async (
    fromUser: string,
    toUser: string,
    amount: number,
    method: string
  ) => {
    const res = await fetch(`/api/groups/${groupId}/settlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser, toUser, amount, method }),
    });

    if (!res.ok) throw new Error("Settlement failed");
    loadGroup();
  };

  if (loading && !groupData) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 text-center space-y-4">
          <div className="h-6 w-48 bg-light-subtle dark:bg-dark-subtle rounded mx-auto animate-pulse"></div>
          <div className="h-48 border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!groupData || !groupData.group) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto px-4 py-20 text-center space-y-3 font-mono">
          <h2 className="font-display text-xl font-bold">Group Not Found</h2>
          <p className="text-xs text-light-textSecondary">
            This group does not exist or unauthorized.
          </p>
          <Link
            href="/"
            className="inline-block mt-2 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { group, settlementSummary, totalSpent } = groupData;
  const myNet = currentUser && settlementSummary ? settlementSummary.netBalances[currentUser.id] || 0 : 0;

  const filteredExpenses = selectedCategory === "all"
    ? group.expenses
    : group.expenses.filter((e: any) => e.category === selectedCategory);

  return (
    <div className="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Breadcrumb & Refresh */}
        <div className="flex items-center justify-between text-xs font-mono">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-light-textSecondary hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Groups</span>
          </Link>

          <button
            onClick={loadGroup}
            className="p-1 text-light-textMuted hover:text-light-textPrimary transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          </button>
        </div>

        {/* Group Header */}
        <section className="border-b border-light-border dark:border-dark-border pb-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-light-textMuted dark:text-dark-textMuted px-1.5 py-0.5 rounded border border-light-border dark:border-dark-border">
                  {group.type}
                </span>
                <span className="text-xs font-mono text-light-textSecondary">
                  {group.currency} • {group.members.length} participants
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-light-textPrimary dark:text-dark-textPrimary mt-1">
                {group.name}
              </h1>
            </div>

            {/* Individual Net Balance in Group */}
            <div className="text-left md:text-right font-mono">
              <span className="text-[10px] text-light-textMuted uppercase tracking-wider block">
                Your Position in Group
              </span>
              <span
                className={`text-2xl sm:text-3xl font-medium tabular-nums ${
                  myNet > 0 ? "text-credit" : myNet < 0 ? "text-debt" : "text-light-textMuted"
                }`}
              >
                {myNet > 0 ? `+${formatCurrency(myNet, group.currency)}` : formatCurrency(myNet, group.currency)}
              </span>
              <span className="text-[11px] text-light-textSecondary block mt-0.5">
                {myNet > 0 ? "Owed to you" : myNet < 0 ? "You owe group" : "Settled ($0.00)"}
              </span>
            </div>
          </div>

          {/* Members Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs font-mono text-light-textSecondary">
              <span>Members:</span>
              <div className="flex items-center gap-1.5">
                {group.members.map((m: any) => (
                  <span
                    key={m.userId}
                    className="px-2 py-0.5 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-[11px]"
                  >
                    {m.user.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-light-border dark:border-dark-border hover:border-accent text-xs font-mono text-light-textPrimary hover:text-accent transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
              <span>Invite</span>
            </button>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-mono">
              {[
                { key: "expenses", label: "Ledger", icon: Receipt },
                { key: "settle", label: "Debt Graph", icon: Users },
                { key: "assistant", label: "Ledger AI", icon: Terminal },
                { key: "analytics", label: "Analytics", icon: PieChart },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                      isActive
                        ? "border-accent text-accent"
                        : "border-transparent text-light-textSecondary hover:text-light-textPrimary"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "expenses" && (
              <div className="hidden sm:flex items-center gap-2 pb-2">
                <button
                  onClick={() => setShowReceiptScan(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-light-border dark:border-dark-border hover:border-accent text-light-textPrimary hover:text-accent text-xs font-mono transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
                  <span>OCR Receipt</span>
                </button>

                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Add Expense</span>
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: EXPENSES */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Category filters */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
                  {["all", "food", "travel", "lodging", "entertainment", "utilities", "groceries"].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2 py-0.5 rounded border capitalize transition-colors ${
                          selectedCategory === cat
                            ? "border-accent text-accent font-medium bg-accent-subtle dark:bg-accent-darkSubtle"
                            : "border-light-border dark:border-dark-border text-light-textSecondary"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>

                <div className="flex sm:hidden items-center gap-2">
                  <button
                    onClick={() => setShowReceiptScan(true)}
                    className="flex-1 py-1.5 rounded border border-light-border text-xs font-mono text-center"
                  >
                    OCR Scan
                  </button>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="flex-1 py-1.5 rounded bg-accent text-white text-xs font-medium text-center"
                  >
                    Add Expense
                  </button>
                </div>
              </div>

              {/* Spreadsheet-like expenses table */}
              <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border bg-light-surface dark:bg-dark-surface">
                {filteredExpenses.length === 0 ? (
                  <div className="p-12 text-center text-xs text-light-textMuted font-mono">
                    No entries recorded in this category.
                  </div>
                ) : (
                  filteredExpenses.map((exp: any) => (
                    <ExpenseCard
                      key={exp.id}
                      expense={exp}
                      currency={group.currency}
                      currentUserId={currentUser?.id}
                      onOpenDetails={(e) => setSelectedExpense(e)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SETTLE GRAPH */}
          {activeTab === "settle" && (
            <SettlementGraph
              members={group.members.map((m: any) => ({
                id: m.user.id,
                name: m.user.name || "Member",
                avatarUrl: m.user.avatarUrl,
              }))}
              netBalances={settlementSummary.netBalances}
              transactions={settlementSummary.transactions}
              currency={group.currency}
              currentUserId={currentUser?.id}
              onRecordSettlement={handleRecordSettlement}
            />
          )}

          {/* TAB 3: ASSISTANT */}
          {activeTab === "assistant" && (
            <div className="max-w-2xl mx-auto">
              <LedgerAssistant
                groupId={groupId}
                groupName={group.name}
                currency={group.currency}
              />
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === "analytics" && (
            <AnalyticsView
              expenses={group.expenses}
              members={group.members}
              currency={group.currency}
              budgetLimit={group.budgetLimit}
              groupName={group.name}
            />
          )}
        </section>
      </main>

      <BottomNav
        isGroupPage={true}
        activeTab={activeTab}
        onSelectTab={(t) => setActiveTab(t as any)}
      />

      {showAddExpense && (
        <AddExpenseModal
          groupId={groupId}
          currency={group.currency}
          members={group.members}
          currentUserId={currentUser?.id}
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            setShowAddExpense(false);
            loadGroup();
          }}
          onOpenReceiptMode={() => {
            setShowAddExpense(false);
            setShowReceiptScan(true);
          }}
        />
      )}

      {showReceiptScan && (
        <ReceiptSplitModal
          groupId={groupId}
          currency={group.currency}
          members={group.members}
          currentUserId={currentUser?.id}
          onClose={() => setShowReceiptScan(false)}
          onSuccess={() => {
            setShowReceiptScan(false);
            loadGroup();
          }}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          groupId={groupId}
          currency={group.currency}
          currentUserId={currentUser?.id}
          onClose={() => setSelectedExpense(null)}
          onDeleted={() => {
            setSelectedExpense(null);
            loadGroup();
          }}
          onCommentAdded={() => {
            loadGroup();
          }}
        />
      )}

      {showInviteModal && (
        <InviteModal
          groupId={groupId}
          groupName={group.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
