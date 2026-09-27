"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Plus, Moon, Sun, LogOut, User as UserIcon } from "lucide-react";

export function Navbar({ onNewGroup }: { onNewGroup?: () => void }) {
  const { data: session } = useSession();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkCurrent = document.documentElement.classList.contains("dark");
    setIsDark(isDarkCurrent);
  }, []);

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
              <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-xs">
                <UserIcon className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted" />
                <span className="font-medium text-light-textPrimary dark:text-dark-textPrimary truncate max-w-[120px]">
                  {session.user.name || session.user.email}
                </span>
              </div>
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
