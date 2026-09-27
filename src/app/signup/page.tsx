"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lock, Mail, User, ShieldAlert } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account.");
        setLoading(false);
        return;
      }

      // Automatically sign in upon successful registration
      const loginRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl: "/",
      });

      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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
            Create an Account to Manage Group Expenses
          </p>
        </div>

        {/* Card */}
        <div className="border border-light-border dark:border-dark-border rounded bg-light-surface dark:bg-dark-surface p-6 space-y-5">
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-light-textPrimary dark:text-dark-textPrimary">
              Get started with Tally
            </h1>
            <p className="text-xs text-light-textMuted dark:text-dark-textMuted">
              Sign up with your email and password.
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
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Taylor Smith"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-accent"
                />
                <User className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-light-textSecondary dark:text-dark-textSecondary block">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taylor@example.com"
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline font-medium">
                Sign in
              </Link>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
