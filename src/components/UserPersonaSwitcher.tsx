"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

interface PersonaUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export function UserPersonaSwitcher({ onPersonaChange }: { onPersonaChange?: () => void }) {
  const [users, setUsers] = useState<PersonaUser[]>([]);
  const [currentUser, setCurrentUser] = useState<PersonaUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/persona")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
        if (data.current) setCurrentUser(data.current);
      })
      .catch((err) => console.error("Failed to load personas", err));
  }, []);

  const switchPersona = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.current) {
        setCurrentUser(data.current);
        setIsOpen(false);
        if (onPersonaChange) onPersonaChange();
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch persona", err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface hover:bg-light-subtle dark:hover:bg-dark-subtle transition-colors text-xs text-light-textPrimary dark:text-dark-textPrimary"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
        <span className="font-medium">
          {currentUser.name.split(" ")[0]}
        </span>
        <ChevronDown className="w-3 h-3 text-light-textMuted dark:text-dark-textMuted" strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-52 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-subtle py-1 z-50">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-light-textMuted dark:text-dark-textMuted border-b border-light-border dark:border-dark-border">
            Switch Perspective
          </div>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => switchPersona(u.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-light-subtle dark:hover:bg-dark-subtle transition-colors text-xs"
            >
              <div>
                <div className="font-medium text-light-textPrimary dark:text-dark-textPrimary">
                  {u.name}
                </div>
                <div className="text-[10px] text-light-textMuted dark:text-dark-textMuted font-mono">
                  {u.email}
                </div>
              </div>
              {currentUser.id === u.id && (
                <Check className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
