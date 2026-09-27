"use client";

import { useState } from "react";
import { ExpenseProps } from "./ExpenseCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { X, Trash2, Send } from "lucide-react";

interface ExpenseDetailModalProps {
  expense: ExpenseProps;
  groupId: string;
  currency: string;
  currentUserId: string;
  onClose: () => void;
  onDeleted: () => void;
  onCommentAdded: () => void;
}

export function ExpenseDetailModal({
  expense,
  groupId,
  currency = "USD",
  currentUserId,
  onClose,
  onDeleted,
  onCommentAdded,
}: ExpenseDetailModalProps) {
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this expense and recalculate group balances?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expense.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted();
      }
    } catch (err) {
      console.error("Failed to delete", err);
    } finally {
      setDeleting(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expense.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText("");
        onCommentAdded();
      }
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded max-w-lg w-full p-6 my-8 space-y-5 shadow-subtle text-xs">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div>
            <span className="text-[10px] font-mono text-light-textMuted uppercase tracking-wider block">
              {expense.category} • {formatDate(expense.date)}
            </span>
            <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
              {expense.description}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 text-light-textMuted hover:text-debt transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button onClick={onClose} className="p-1 text-light-textMuted hover:text-light-textPrimary">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Ledger Summary */}
        <div className="p-3 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-light-textMuted uppercase block">Total Amount</span>
            <span className="text-xl font-medium tabular-nums text-light-textPrimary dark:text-dark-textPrimary">
              {formatCurrency(expense.amount, currency)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-light-textMuted uppercase block">Payer</span>
            <span className="font-medium text-light-textPrimary dark:text-dark-textPrimary">
              {expense.payer.name}
            </span>
          </div>
        </div>

        {/* Splits */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted block">
            Distribution ({expense.splitType} split)
          </span>
          <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border font-mono">
            {expense.splits.map((s) => (
              <div key={s.userId} className="p-2.5 flex items-center justify-between text-xs">
                <span>
                  {s.user.name} {s.userId === currentUserId ? "(You)" : ""}
                </span>
                <span className="tabular-nums font-medium text-light-textPrimary dark:text-dark-textPrimary">
                  {formatCurrency(s.shareAmount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2 pt-2 border-t border-light-border dark:border-dark-border">
          <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted block">
            Discussion
          </span>

          <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono">
            {expense.comments && expense.comments.length > 0 ? (
              expense.comments.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded border border-light-border dark:border-dark-border space-y-0.5 text-[11px]"
                >
                  <div className="flex justify-between text-light-textMuted">
                    <span>{c.user.name}</span>
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                  <div className="text-light-textPrimary dark:text-dark-textPrimary font-body text-xs">
                    {c.text}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-light-textMuted py-2 text-center">No notes recorded</div>
            )}
          </div>

          <form onSubmit={handlePostComment} className="flex gap-2 pt-1">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add note..."
              className="flex-1 px-3 py-1 rounded border border-light-border dark:border-dark-border bg-transparent text-xs font-mono focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="px-3 py-1 rounded bg-accent text-white text-xs font-mono hover:bg-accent-hover transition-colors"
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
