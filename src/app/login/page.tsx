"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lock, Mail, ShieldAlert } from "lucide-react";

const DEMO_PERSONAS = [
  { name: "Alex Rivera", email: "alex@tally.local", role: "Villa Payer ($840)" },
  { name: "Sarah Chen", email: "sarah@tally.local", role: "Dinner & Wifi Payer" },
  { name: "David Miller", email: "david@tally.local", role: "Scuba Charter Payer" },
  { name: "Priya Patel", email: "priya@tally.local", role: "Transit Payer" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError("Invalid email or password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (personaEmail: string) => {
    setEmail(personaEmail);
    setPassword("password123");
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email: personaEmail,
      password: "password123",
      callbackUrl,
    });

    if (res?.error) {
      setError("Demo authentication failed. Make sure database is seeded.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
    setLoading(false);
  };

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
            Zero-Bloat Group Ledger & Expense Splitter
          </p>
        </div>

        {/* Card */}
        <div className="border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface p-6 space-y-5">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-light-textPrimary dark:text-dark-textPrimary">
              Sign in to your account
            </h1>
            <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
              Enter your credentials or click any demo member below.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-light-textSecondary dark:text-dark-textSecondary block">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-accent"
                />
                <Mail className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-light-textSecondary dark:text-dark-textSecondary block">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-accent"
                />
                <Lock className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted absolute left-2.5 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="pt-2 border-t border-light-border dark:border-dark-border space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted dark:text-dark-textMuted block">
              Quick Demo Personas (password: password123)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleQuickLogin(p.email)}
                  className="text-left p-2 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle hover:border-accent transition-colors"
                >
                  <div className="text-xs font-medium text-light-textPrimary dark:text-dark-textPrimary truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-light-textMuted dark:text-dark-textMuted truncate">
                    {p.role}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-accent hover:underline font-medium">
                Create one
              </Link>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-light-base dark:bg-dark-base">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
