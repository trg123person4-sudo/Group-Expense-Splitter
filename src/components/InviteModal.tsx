"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";

interface InviteModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export function InviteModal({ groupId, groupName, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState(false);

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/invite/${groupId}` : `https://tally.app/invite/${groupId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInvited(true);
    setTimeout(() => {
      setEmail("");
      setInvited(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded max-w-sm w-full p-6 space-y-4 shadow-subtle text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div>
            <span className="text-[10px] font-mono text-light-textMuted uppercase tracking-wider block">
              Access & Membership
            </span>
            <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
              Invite to {groupName}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-light-textMuted hover:text-light-textPrimary">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Shareable Link */}
        <div className="space-y-1.5 font-mono">
          <label className="text-[10px] text-light-textMuted uppercase block">
            Invite URL
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs select-all text-light-textSecondary"
            />
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border hover:border-accent text-light-textPrimary text-xs flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-credit" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Email Invite */}
        <form onSubmit={handleSendEmail} className="space-y-2 pt-2 border-t border-light-border dark:border-dark-border font-mono">
          <label className="text-[10px] text-light-textMuted uppercase block">
            Invite via Email
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs text-light-textPrimary"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-accent text-white hover:bg-accent-hover text-xs transition-colors"
            >
              Send
            </button>
          </div>
          {invited && (
            <span className="text-[11px] text-credit block">
              Invitation dispatched.
            </span>
          )}
        </form>
      </div>
    </div>
  );
}
