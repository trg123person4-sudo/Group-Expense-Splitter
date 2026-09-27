"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { NewGroupModal } from "@/components/NewGroupModal";
import { formatCurrency } from "@/lib/utils";
import { Plus, ArrowRight, ChevronRight, User } from "lucide-react";
import { getCountryByCode } from "@/lib/countries";

interface UserType {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Member {
  userId: string;
  user: UserType;
}

interface ExpenseSplit {
  userId: string;
  shareAmount: number;
}

interface Expense {
  id: string;
  amount: number;
  paidBy: string;
  splits: ExpenseSplit[];
}

interface Settlement {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  status: string;
}

interface Group {
  id: string;
  name: string;
  type: string;
  currency: string;
  country?: string;
  budgetLimit: number | null;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
}

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  const fetchDashboardData = () => {
    setLoading(true);
    fetch("/api/groups")
      .then((res) => res.json())
      .then((data) => {
        if (data.groups) setGroups(data.groups);
        if (data.currentUser) setCurrentUser(data.currentUser);
      })
      .catch((err) => console.error("Error loading dashboard", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const overallStats = groups.reduce(
    (acc, group) => {
      if (!currentUser) return acc;
      let myPaid = 0;
      let myOwed = 0;
      let mySettledSent = 0;
      let mySettledRcvd = 0;

      for (const exp of group.expenses) {
        if (exp.paidBy === currentUser.id) myPaid += exp.amount;
        for (const split of exp.splits) {
          if (split.userId === currentUser.id) myOwed += split.shareAmount;
        }
      }

      for (const s of group.settlements) {
        if (s.status === "completed") {
          if (s.fromUser === currentUser.id) mySettledSent += s.amount;
          if (s.toUser === currentUser.id) mySettledRcvd += s.amount;
        }
      }

      const net = myPaid - myOwed + mySettledSent - mySettledRcvd;
      acc.totalNet += net;
      if (net > 0) acc.totalOwedToMe += net;
      if (net < 0) acc.totalIOwe += Math.abs(net);
      return acc;
    },
    { totalNet: 0, totalOwedToMe: 0, totalIOwe: 0 }
  );

  return (
    <div className="min-h-screen flex flex-col bg-light-bg dark:bg-dark-bg">
      <Navbar onNewGroup={() => setShowNewGroupModal(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
        {/* Ledger Header & Main Balance Metric */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-light-border dark:border-dark-border pb-6">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-light-textMuted dark:text-dark-textMuted">
                Net Group Position
              </span>
              <div className="mt-1 flex items-baseline gap-3">
                <span
                  className={`text-4xl sm:text-5xl font-mono font-medium tracking-tight tabular-nums ${
                    overallStats.totalNet > 0
                      ? "text-credit"
                      : overallStats.totalNet < 0
                      ? "text-debt"
                      : "text-light-textPrimary dark:text-dark-textPrimary"
                  }`}
                >
                  {overallStats.totalNet > 0 ? "+" : ""}
                  {formatCurrency(overallStats.totalNet, "USD")}
                </span>
                <span className="text-xs text-light-textSecondary dark:text-dark-textSecondary font-mono">
                  USD
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono text-light-textSecondary dark:text-dark-textSecondary">
              <div>
                <span className="text-light-textMuted dark:text-dark-textMuted block text-[10px] uppercase">
                  Owed to you
                </span>
                <span className="text-credit font-medium">
                  +{formatCurrency(overallStats.totalOwedToMe, "USD")}
                </span>
              </div>
              <div className="border-l border-light-border dark:border-dark-border pl-6">
                <span className="text-light-textMuted dark:text-dark-textMuted block text-[10px] uppercase">
                  You owe
                </span>
                <span className="text-debt font-medium">
                  -{formatCurrency(overallStats.totalIOwe, "USD")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Groups Table / Ledger Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-wider text-light-textSecondary dark:text-dark-textSecondary">
                Groups & Ledgers ({groups.length})
              </h2>
            </div>

            <button
              onClick={() => setShowNewGroupModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-light-subtle dark:hover:bg-dark-subtle text-xs font-medium text-light-textPrimary dark:text-dark-textPrimary transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
              <span>Create Group</span>
            </button>
          </div>

          {loading ? (
            <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border bg-light-surface dark:bg-dark-surface">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 h-16 animate-pulse"></div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="border border-light-border dark:border-dark-border rounded p-12 text-center bg-light-surface dark:bg-dark-surface space-y-3">
              <div className="text-sm font-medium text-light-textPrimary dark:text-dark-textPrimary">
                No active groups
              </div>
              <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary max-w-sm mx-auto">
                Create a group for an apartment, trip, or shared project to start tracking expenses.
              </p>
              <button
                onClick={() => setShowNewGroupModal(true)}
                className="mt-2 px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
              >
                Create First Group
              </button>
            </div>
          ) : (
            <div className="border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface divide-y divide-light-border dark:divide-dark-border">
              {groups.map((g) => {
                const groupTotal = g.expenses.reduce((s, e) => s + e.amount, 0);

                let myGroupPaid = 0;
                let myGroupOwed = 0;
                let mySettledSent = 0;
                let mySettledRcvd = 0;

                if (currentUser) {
                  for (const exp of g.expenses) {
                    if (exp.paidBy === currentUser.id) myGroupPaid += exp.amount;
                    for (const split of exp.splits) {
                      if (split.userId === currentUser.id) myGroupOwed += split.shareAmount;
                    }
                  }
                  for (const s of g.settlements) {
                    if (s.status === "completed") {
                      if (s.fromUser === currentUser.id) mySettledSent += s.amount;
                      if (s.toUser === currentUser.id) mySettledRcvd += s.amount;
                    }
                  }
                }

                const myNet = myGroupPaid - myGroupOwed + mySettledSent - mySettledRcvd;

                return (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="p-4 sm:px-6 flex items-center justify-between hover:bg-light-subtle dark:hover:bg-dark-subtle transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {g.country && (
                            <span
                              className="text-base leading-none select-none"
                              title={getCountryByCode(g.country)?.name || g.country}
                            >
                              {getCountryByCode(g.country)?.flag || "🌐"}
                            </span>
                          )}
                          <span className="font-display font-bold text-base text-light-textPrimary dark:text-dark-textPrimary group-hover:text-accent transition-colors">
                            {g.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase text-light-textMuted dark:text-dark-textMuted px-1.5 py-0.5 rounded border border-light-border dark:border-dark-border">
                            {g.type}
                          </span>
                        </div>
                        <div className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-0.5 font-mono">
                          {g.members.length} members • {g.expenses.length} expenses
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:gap-12">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase block">
                          Total Volume
                        </span>
                        <span className="text-xs font-mono tabular-nums text-light-textSecondary dark:text-dark-textSecondary">
                          {formatCurrency(groupTotal, g.currency)}
                        </span>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase block">
                          Your Balance
                        </span>
                        <span
                          className={`text-sm font-mono font-medium tabular-nums ${
                            myNet > 0
                              ? "text-credit"
                              : myNet < 0
                              ? "text-debt"
                              : "text-light-textMuted dark:text-dark-textMuted"
                          }`}
                        >
                          {myNet > 0
                            ? `+${formatCurrency(myNet, g.currency)}`
                            : myNet < 0
                            ? formatCurrency(myNet, g.currency)
                            : "$0.00"}
                        </span>
                      </div>

                      <ChevronRight
                        className="w-4 h-4 text-light-textMuted dark:text-dark-textMuted group-hover:text-light-textPrimary dark:group-hover:text-dark-textPrimary transition-colors"
                        strokeWidth={1.5}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />

      {showNewGroupModal && (
        <NewGroupModal
          onClose={() => setShowNewGroupModal(false)}
          onSuccess={(id) => {
            setShowNewGroupModal(false);
            window.location.href = `/groups/${id}`;
          }}
        />
      )}
    </div>
  );
}
