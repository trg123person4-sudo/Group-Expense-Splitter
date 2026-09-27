"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  COUNTRIES,
  ALL_CURRENCIES,
  getCountryByCode,
  CountryItem,
  CurrencyInfo,
} from "@/lib/countries";
import { ChevronDown, Check, Search, X, SlidersHorizontal } from "lucide-react";

export interface CountryCurrencySelectProps {
  countryCode: string;
  currencyCode: string;
  onCountryChange: (countryCode: string) => void;
  onCurrencyChange: (currencyCode: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function CountryCurrencySelect({
  countryCode,
  currencyCode,
  onCountryChange,
  onCurrencyChange,
  disabled = false,
  className = "",
  label = "Country & Currency",
}: CountryCurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected country lookup
  const selectedCountry = useMemo(
    () => getCountryByCode(countryCode) || getCountryByCode("US"),
    [countryCode]
  );

  // Filtered countries based on search term
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q)
    );
  }, [search]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when combobox opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelectCountry = (country: CountryItem) => {
    onCountryChange(country.code);
    // Automatically set primary currency for the selected country
    onCurrencyChange(country.currencyCode);
    setIsOpen(false);
    setSearch("");
  };

  const isOverridden = selectedCountry?.currencyCode !== currencyCode;

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      <label className="text-[10px] text-light-textMuted dark:text-dark-textMuted uppercase font-mono tracking-wider block">
        {label}
      </label>

      {/* Main Combobox Trigger */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
              setSearch("");
            }
          }}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-xs text-left focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="text-base leading-none select-none">
              {selectedCountry?.flag || "🌐"}
            </span>
            <span className="font-medium text-light-textPrimary dark:text-dark-textPrimary truncate">
              {selectedCountry?.name || "Select Country"}
            </span>
            <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase">
              ({selectedCountry?.code})
            </span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted transition-transform duration-150 ${
              isOpen ? "rotate-180 text-accent" : ""
            }`}
          />
        </button>

        {/* Combobox Dropdown Popover */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full z-50 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface shadow-md">
            {/* Search Input */}
            <div className="p-2 border-b border-light-border dark:border-dark-border flex items-center gap-1.5 bg-light-subtle dark:bg-dark-subtle">
              <Search className="w-3.5 h-3.5 text-light-textMuted dark:text-dark-textMuted shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or currency..."
                className="w-full bg-transparent text-xs text-light-textPrimary dark:text-dark-textPrimary placeholder:text-light-textMuted focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-light-textMuted hover:text-light-textPrimary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Country List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-light-border/40 dark:divide-dark-border/40 py-1">
              {filteredCountries.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-light-textMuted dark:text-dark-textMuted">
                  No matching countries found
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = selectedCountry?.code === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                        isSelected
                          ? "bg-accent-subtle dark:bg-accent-darkSubtle text-accent font-medium"
                          : "hover:bg-light-subtle dark:hover:bg-dark-subtle text-light-textPrimary dark:text-dark-textPrimary"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base leading-none select-none">
                          {c.flag}
                        </span>
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] font-mono text-light-textMuted dark:text-dark-textMuted uppercase">
                          {c.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono text-light-textSecondary dark:text-dark-textSecondary">
                          {c.currencySymbol} {c.currencyCode}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolved Currency Read-Only Confirmation Chip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border border-light-border dark:border-dark-border bg-light-subtle dark:bg-dark-subtle text-light-textSecondary dark:text-dark-textSecondary">
          <span>{selectedCountry?.flag}</span>
          <span className="font-sans font-medium text-light-textPrimary dark:text-dark-textPrimary">
            {selectedCountry?.name}
          </span>
          <span className="text-light-textMuted">→</span>
          <span className="font-semibold text-accent">
            {selectedCountry?.currencySymbol} {currencyCode}
          </span>
          {isOverridden && (
            <span className="text-[9px] uppercase px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-sans">
              Custom
            </span>
          )}
        </div>

        {/* Currency Override Toggle Link */}
        <button
          type="button"
          onClick={() => setShowOverride((prev) => !prev)}
          className="text-[11px] text-light-textMuted dark:text-dark-textMuted hover:text-accent dark:hover:text-accent transition-colors underline flex items-center gap-1"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>{showOverride ? "Hide override" : "Advanced: override currency"}</span>
        </button>
      </div>

      {/* Collapsible Currency Override Dropdown */}
      {showOverride && (
        <div className="p-2.5 rounded border border-light-border dark:border-dark-border bg-light-subtle/50 dark:bg-dark-subtle/50 mt-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-light-textMuted dark:text-dark-textMuted">
              Select Alternate Currency
            </span>
            {isOverridden && (
              <button
                type="button"
                onClick={() => onCurrencyChange(selectedCountry?.currencyCode || "USD")}
                className="text-[10px] text-accent hover:underline font-mono"
              >
                Reset to {selectedCountry?.currencyCode}
              </button>
            )}
          </div>

          <select
            value={currencyCode}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-xs text-light-textPrimary dark:text-dark-textPrimary focus:outline-none focus:border-accent font-mono"
          >
            {/* Show country currencies first if multiple exist */}
            {selectedCountry && selectedCountry.allCurrencies.length > 1 && (
              <optgroup label={`${selectedCountry.name} Official Currencies`}>
                {selectedCountry.allCurrencies.map((c) => (
                  <option key={`nat-${c.code}`} value={c.code}>
                    {c.code} ({c.symbol}) — {c.name}
                  </option>
                ))}
              </optgroup>
            )}

            <optgroup label="All Global Currencies">
              {ALL_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) — {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}
    </div>
  );
}
