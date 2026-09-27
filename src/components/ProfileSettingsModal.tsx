"use client";

import { useState, useEffect } from "react";
import { X, Check, User } from "lucide-react";
import { CountryCurrencySelect } from "./CountryCurrencySelect";

interface ProfileSettingsModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export function ProfileSettingsModal({ onClose, onSaved }: ProfileSettingsModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          if (data.user.defaultCountry) setCountry(data.user.defaultCountry);
          if (data.user.defaultCurrency) setCurrency(data.user.defaultCurrency);
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          defaultCountry: country,
          defaultCurrency: currency,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update settings");
      }

      setSavedSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface p-5 space-y-4 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <h2 className="font-display font-semibold text-sm text-light-textPrimary dark:text-dark-textPrimary">
              Profile & Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-light-textMuted hover:text-light-textPrimary dark:hover:text-dark-textPrimary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 rounded text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        {savedSuccess && (
          <div className="p-2 rounded text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>Preferences saved successfully</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-light-textMuted dark:text-dark-textMuted">
            Loading preferences...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="text-[10px] text-light-textMuted uppercase font-mono tracking-wider block">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent text-xs focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[10px] text-light-textMuted uppercase font-mono tracking-wider block">
                Email
              </label>
              <input
                type="text"
                disabled
                value={email}
                className="w-full mt-1 px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-xs text-light-textMuted cursor-not-allowed font-mono"
              />
            </div>

            {/* Reusable Country & Currency Selector */}
            <CountryCurrencySelect
              label="Default Country & Currency"
              countryCode={country}
              currencyCode={currency}
              onCountryChange={setCountry}
              onCurrencyChange={setCurrency}
            />

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-light-border dark:border-dark-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded border border-light-border dark:border-dark-border text-xs text-light-textSecondary hover:bg-light-subtle dark:hover:bg-dark-subtle transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
