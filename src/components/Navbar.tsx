"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Plus, Moon, Sun, LogOut, User as UserIcon, Bell, Check, DollarSign, Receipt, CreditCard } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  payload: any;
}

export function Navbar({ onNewGroup }: { onNewGroup?: () => void }) {
  const { data: session } = useSession();
  const [isDark, setIsDark] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDarkCurrent = document.documentElement.classList.contains("dark");
    setIsDark(isDarkCurrent);
  }, []);

  const loadNotifications = () => {
    if (!session?.user) return;
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) setNotifications(data.notifications);
        if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
  }, [session?.user]);

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tally_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tally_theme", "light");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent"></span>
          <span className="font-display text-xl font-bold tracking-tight text-light-textPrimary dark:text-dark-textPrimary">
            Tally
          </span>
          <span className="text-[11px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase tracking-wider pl-1.5 border-l border-light-border dark:border-dark-border hidden sm:inline">
            Ledger
          </span>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {session?.user ? (
            <div className="flex items-center gap-2">
              {/* Notification Bell Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1.5 rounded border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-subtle dark:hover:bg-dark-subtle relative transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-[9px] font-mono text-white flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-subtle z-50 text-xs overflow-hidden">
                    <div className="p-3 border-b border-light-border dark:border-dark-border flex items-center justify-between">
                      <span className="font-semibold text-light-textPrimary dark:text-dark-textPrimary">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-accent hover:underline flex items-center gap-1 font-medium"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-light-border dark:divide-dark-border">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-light-textMuted font-mono text-[11px]">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 space-y-1 transition-colors ${
                              n.read ? "opacity-75" : "bg-accent/5"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-light-textPrimary dark:text-dark-textPrimary text-xs flex items-center gap-1.5">
                                {n.type === "payment_received" ? (
                                  <CreditCard className="w-3.5 h-3.5 text-credit" />
                                ) : (
                                  <Receipt className="w-3.5 h-3.5 text-accent" />
                                )}
                                <span>
                                  {n.type === "payment_received"
                                    ? "Payment Received"
                                    : "New Expense Added"}
                                </span>
                              </span>
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-light-textSecondary dark:text-dark-textSecondary leading-snug">
                              {n.type === "payment_received"
                                ? `${n.payload.fromName || "Someone"} paid you $${Number(n.payload.amount || 0).toFixed(2)} in ${n.payload.groupName || "group"}.`
                                : `${n.payload.paidByName || "Someone"} added "${n.payload.description || "expense"}" ($${Number(n.payload.amount || 0).toFixed(2)}). Your share: $${Number(n.payload.yourShare || 0).toFixed(2)}.`}
                            </p>
                            <span className="text-[10px] font-mono text-light-textMuted block">
                              {new Date(n.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Pill */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-xs">
                <UserIcon className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted" />
                <span className="font-medium text-light-textPrimary dark:text-dark-textPrimary truncate max-w-[120px]">
                  {session.user.name || session.user.email}
                </span>
              </div>

              {/* Log out */}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 rounded border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-subtle dark:hover:bg-dark-subtle hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium px-2.5 py-1 rounded border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-subtle dark:hover:bg-dark-subtle"
            >
              Sign In
            </Link>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded border border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-subtle dark:hover:bg-dark-subtle transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
            ) : (
              <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </button>

          {onNewGroup && (
            <button
              onClick={onNewGroup}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>New Group</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
