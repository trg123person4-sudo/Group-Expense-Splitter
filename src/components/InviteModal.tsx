"use client";

import { useState } from "react";
import { Copy, Check, X, Mail, ShieldAlert, ArrowRight } from "lucide-react";

interface InviteModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export function InviteModal({ groupId, groupName, onClose }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to dispatch invitation.");
        return;
      }

      setGeneratedInviteUrl(data.inviteUrl);
      setSuccessMessage(`Invitation dispatched to ${email}!`);
      setEmail("");
    } catch {
      setError("An unexpected error occurred while sending invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded max-w-sm w-full p-6 space-y-4 shadow-subtle text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div>
            <span className="text-[10px] font-mono text-light-textMuted uppercase tracking-wider block">
              Access &amp; Membership
            </span>
            <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
              Invite to {groupName}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-light-textMuted hover:text-light-textPrimary">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Email Invite Form */}
        <form onSubmit={handleSendEmail} className="space-y-2">
          <label className="text-[10px] font-mono text-light-textMuted uppercase block">
            Invite via Email
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="email"
              required
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-xs text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 rounded bg-accent text-white hover:bg-accent-hover text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              <Mail className="w-3 h-3" />
              <span>{loading ? "Sending..." : "Send"}</span>
            </button>
          </div>
          <span className="text-[10px] text-light-textMuted dark:text-dark-textMuted block">
            A secure single-use invitation token will be generated and dispatched.
          </span>
        </form>

        {/* Generated Invite Link */}
        {generatedInviteUrl && (
          <div className="space-y-1.5 pt-3 border-t border-light-border dark:border-dark-border">
            <label className="text-[10px] font-mono text-light-textMuted uppercase block">
              Generated Invitation Link
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={generatedInviteUrl}
                className="flex-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-xs select-all text-light-textSecondary truncate font-mono"
              />
              <button
                onClick={() => handleCopy(generatedInviteUrl)}
                className="px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border hover:border-accent text-light-textPrimary text-xs flex items-center gap-1 transition-colors shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-credit" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
