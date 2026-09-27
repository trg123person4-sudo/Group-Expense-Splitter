"use client";

import { useState } from "react";
import { AssistantCitation, AssistantResponse } from "@/lib/ai-assistant";
import { formatCurrency } from "@/lib/utils";
import { Send, FileText, Terminal } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  toolExecuted?: string;
  citations?: AssistantCitation[];
}

export function LedgerAssistant({
  groupId,
  groupName,
  currency = "USD",
}: {
  groupId: string;
  groupName: string;
  currency?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Ledger Query Assistant active for ${groupName}.\nAll queries execute against real database records with zero generated figures. Ask questions like: "how much do I owe Sarah", "what did we spend on food", or "who paid for the villa".`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (queryText?: string) => {
    const promptToSend = queryText || input;
    if (!promptToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: promptToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, prompt: promptToSend.trim() }),
      });

      if (!res.ok) throw new Error("Assistant query failed");

      const data: AssistantResponse = await res.json();
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        sender: "assistant",
        text: data.answer,
        toolExecuted: data.toolExecuted,
        citations: data.citations,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: "Database query execution error. Please refine your query.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "How much do I owe Sarah?",
    "What did we spend on food?",
    "Who paid for the villa?",
    "Show settlement plan",
  ];

  return (
    <div className="flex flex-col h-[520px] rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface">
      {/* Header */}
      <div className="px-4 py-3 border-b border-light-border dark:border-dark-border flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-light-textSecondary dark:text-dark-textSecondary">
          <Terminal className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
          <span className="uppercase tracking-wider">Ledger Query Engine</span>
        </div>
        <span className="text-[10px] text-credit font-mono">● Ground Truth</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`space-y-2 ${m.sender === "user" ? "pl-8 text-right" : "pr-8 text-left"}`}
          >
            <div className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase">
              {m.sender === "user" ? "You" : "Ledger Engine"}
            </div>

            <div
              className={`p-3 rounded inline-block text-left text-xs leading-relaxed max-w-full ${
                m.sender === "user"
                  ? "bg-light-subtle dark:bg-dark-subtle border border-light-border dark:border-dark-border text-light-textPrimary dark:text-dark-textPrimary"
                  : "bg-transparent text-light-textPrimary dark:text-dark-textPrimary"
              }`}
            >
              <div className="whitespace-pre-line font-body">{m.text}</div>

              {m.toolExecuted && (
                <div className="mt-2 pt-2 border-t border-light-border dark:border-dark-border text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted">
                  Tool: {m.toolExecuted}()
                </div>
              )}

              {/* Citations */}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-light-border dark:border-dark-border space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted block">
                    Underlying Source Records
                  </span>
                  {m.citations.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface flex items-center justify-between text-[11px] font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-light-textMuted" strokeWidth={1.5} />
                        <span>{c.title}</span>
                      </div>
                      <span className="tabular-nums font-medium text-light-textPrimary dark:text-dark-textPrimary">
                        {formatCurrency(c.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-[11px] font-mono text-light-textMuted animate-pulse">
            Executing query against ledger database...
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 border-t border-light-border dark:border-dark-border flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(s)}
            className="flex-shrink-0 px-2 py-0.5 rounded border border-light-border dark:border-dark-border text-light-textSecondary hover:border-accent hover:text-accent transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2.5 border-t border-light-border dark:border-dark-border flex items-center gap-2 bg-light-surface dark:bg-dark-surface"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Query ledger records..."
          className="flex-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs font-mono text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-1.5 rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </form>
    </div>
  );
}
