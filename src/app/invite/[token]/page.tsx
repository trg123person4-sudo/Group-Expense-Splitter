"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, ArrowRight, ShieldCheck, AlertCircle, Check } from "lucide-react";

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.alreadyAccepted) {
          setAlreadyAccepted(true);
          setInviteData(data.invitation);
        } else {
          setInviteData(data.invitation);
        }
      })
      .catch((err) => setError(err.message || "Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to join group.");
        return;
      }

      router.push(`/groups/${data.groupId}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred while accepting the invitation.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-light-base dark:bg-dark-base">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-light-base dark:bg-dark-base">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-accent"></span>
            <span className="font-display text-2xl font-bold tracking-tight text-light-textPrimary dark:text-dark-textPrimary">
              Tally
            </span>
          </div>
          <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary font-mono">
            Group Expense Invitation
          </p>
        </div>

        <div className="border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface p-6 space-y-6">
          {error ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-light-textPrimary dark:text-dark-textPrimary">
                  Invalid or Expired Invitation
                </h2>
                <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
                  {error}
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-light-border dark:border-dark-border text-xs font-medium text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-subtle dark:hover:bg-dark-subtle"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : alreadyAccepted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-light-textPrimary dark:text-dark-textPrimary">
                  Invitation Already Accepted
                </h2>
                <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
                  You or another member has already joined {inviteData?.group?.name}.
                </p>
              </div>
              <Link
                href={`/groups/${inviteData?.group?.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium"
              >
                <span>Open Group Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h1 className="text-base font-bold text-light-textPrimary dark:text-dark-textPrimary">
                  You&apos;re invited to join
                </h1>
                <div className="font-display text-xl font-bold text-accent">
                  {inviteData?.group?.name}
                </div>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
                  Invited by <strong className="text-light-textPrimary dark:text-dark-textPrimary">{inviteData?.inviterName}</strong> • {inviteData?.group?.memberCount} current member(s)
                </p>
              </div>

              <div className="p-3 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-xs space-y-1">
                <div className="flex justify-between text-light-textMuted dark:text-dark-textMuted font-mono text-[11px]">
                  <span>Group Type</span>
                  <span className="capitalize text-light-textPrimary dark:text-dark-textPrimary font-medium">{inviteData?.group?.type}</span>
                </div>
                <div className="flex justify-between text-light-textMuted dark:text-dark-textMuted font-mono text-[11px]">
                  <span>Default Currency</span>
                  <span className="text-light-textPrimary dark:text-dark-textPrimary font-medium">{inviteData?.group?.currency}</span>
                </div>
              </div>

              {session?.user ? (
                <div className="space-y-3">
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{accepting ? "Joining Group..." : "Accept & Join Group"}</span>
                  </button>
                  <p className="text-center text-[11px] text-light-textMuted dark:text-dark-textMuted">
                    Joining as <strong className="text-light-textPrimary dark:text-dark-textPrimary">{session.user.name || session.user.email}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <Link
                    href={`/login?callbackUrl=/invite/${token}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
                  >
                    <span>Sign In to Accept</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/signup?callbackUrl=/invite/${token}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary hover:bg-light-subtle dark:hover:bg-dark-subtle text-xs font-medium transition-colors"
                  >
                    <span>Create an Account First</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
