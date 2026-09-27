"use client";

import { useState } from "react";
import { ParsedReceipt, ParsedReceiptItem, SAMPLE_RECEIPTS } from "@/lib/receipt-parser";
import { calculateItemizedSplit } from "@/lib/split-calculator";
import { formatCurrency } from "@/lib/utils";
import { Upload, X, Plus, Trash2, Check } from "lucide-react";

interface Member {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface ReceiptSplitModalProps {
  groupId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiptSplitModal({
  groupId,
  currency,
  members,
  currentUserId,
  onClose,
  onSuccess,
}: ReceiptSplitModalProps) {
  const [step, setStep] = useState<"upload" | "assign">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receiptTitle, setReceiptTitle] = useState("Restaurant Dinner");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [category, setCategory] = useState("food");
  const [items, setItems] = useState<(ParsedReceiptItem & { assignedUserIds: string[] })[]>([]);
  const [tax, setTax] = useState(0);
  const [tip, setTip] = useState(0);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const handleSelectPreset = async (presetKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/receipts/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samplePreset: presetKey }),
      });
      const data: ParsedReceipt = await res.json();
      populateReceiptData(data);
    } catch (err: any) {
      setError("Failed to parse preset receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setReceiptImage(base64);

      try {
        const res = await fetch("/api/receipts/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data: ParsedReceipt = await res.json();
        populateReceiptData(data);
      } catch (err) {
        setError("Error analyzing receipt image");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const populateReceiptData = (data: ParsedReceipt) => {
    setReceiptTitle(data.merchantName || "Receipt Expense");
    setTax(data.tax || 0);
    setTip(data.tip || 0);

    const allIds = members.map((m) => m.user.id);
    const mappedItems = data.items.map((it) => ({
      ...it,
      assignedUserIds: [...allIds],
    }));

    setItems(mappedItems);
    setStep("assign");
  };

  const toggleItemUser = (itemIndex: number, userId: string) => {
    setItems((prev) => {
      const copy = [...prev];
      const currentAssigned = copy[itemIndex].assignedUserIds;
      if (currentAssigned.includes(userId)) {
        copy[itemIndex].assignedUserIds = currentAssigned.filter((id) => id !== userId);
      } else {
        copy[itemIndex].assignedUserIds = [...currentAssigned, userId];
      }
      return copy;
    });
  };

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: "New Line Item",
        price: 10.0,
        assignedUserIds: members.map((m) => m.user.id),
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const allMemberIds = members.map((m) => m.user.id);
  const splitResult = calculateItemizedSplit({
    items,
    taxAmount: tax,
    tipAmount: tip,
    memberIds: allMemberIds,
  });

  const handleSaveExpense = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        description: receiptTitle,
        amount: splitResult.total,
        currency,
        category,
        paidBy,
        date: new Date().toISOString(),
        receiptImageUrl: receiptImage,
        splitType: "itemized",
        itemizedData: {
          items: items.map((i) => ({
            name: i.name,
            price: i.price,
            assignedUserIds: i.assignedUserIds,
          })),
          taxAmount: tax,
          tipAmount: tip,
        },
      };

      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save receipt expense");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded max-w-2xl w-full p-6 my-8 space-y-6 shadow-subtle">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted dark:text-dark-textMuted block">
              Receipt OCR Parsing
            </span>
            <h3 className="font-display text-lg font-bold text-light-textPrimary dark:text-dark-textPrimary">
              Receipt-to-Split
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-light-textMuted hover:text-light-textPrimary">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded border border-debt/30 bg-debt/5 text-xs text-debt font-mono">
            {error}
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-6">
            <label className="border border-dashed border-light-border dark:border-dark-border rounded p-8 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors text-center group">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
              <Upload className="w-6 h-6 text-light-textSecondary mb-2 group-hover:text-accent transition-colors" strokeWidth={1.5} />
              <span className="text-xs font-medium text-light-textPrimary dark:text-dark-textPrimary">
                Upload or photograph receipt image
              </span>
              <span className="text-[11px] font-mono text-light-textMuted mt-1">
                JPG, PNG • Vision API extraction
              </span>
            </label>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-light-textMuted dark:text-dark-textMuted">
                Or select verified receipt preset
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { key: "bistro", name: "Sea Breeze Bistro", desc: "$119.64 • 5 items" },
                  { key: "groceries", name: "Fresh Harvest Market", desc: "$83.21 • 5 items" },
                  { key: "pizza", name: "Napoli Woodfired Pizza", desc: "$77.58 • 3 items" },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleSelectPreset(preset.key)}
                    disabled={loading}
                    className="p-3 rounded border border-light-border dark:border-dark-border hover:border-accent text-left transition-colors"
                  >
                    <div className="text-xs font-medium text-light-textPrimary dark:text-dark-textPrimary">
                      {preset.name}
                    </div>
                    <div className="text-[10px] font-mono text-light-textMuted mt-0.5">
                      {preset.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "assign" && (
          <div className="space-y-5">
            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-light-textMuted uppercase block">
                  Description
                </label>
                <input
                  type="text"
                  value={receiptTitle}
                  onChange={(e) => setReceiptTitle(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-light-textMuted uppercase block">
                  Paid By
                </label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent font-medium"
                >
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-light-textMuted uppercase block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded border border-light-border dark:border-dark-border bg-transparent font-medium"
                >
                  <option value="food">Food & Drinks</option>
                  <option value="groceries">Groceries</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="travel">Travel</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            {/* Line Items Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-light-textSecondary uppercase tracking-wider text-[10px]">
                  Extracted Items ({items.length})
                </span>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1 text-accent hover:underline text-[11px]"
                >
                  <Plus className="w-3 h-3" strokeWidth={1.5} />
                  <span>Add line</span>
                </button>
              </div>

              <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border max-h-56 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-3 space-y-2 bg-light-surface dark:bg-dark-surface">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const c = [...prev];
                            c[idx].name = val;
                            return c;
                          });
                        }}
                        className="bg-transparent border-none text-light-textPrimary dark:text-dark-textPrimary flex-1 font-medium focus:outline-none"
                      />
                      <div className="flex items-center gap-2 font-mono">
                        <span className="tabular-nums text-light-textPrimary dark:text-dark-textPrimary">
                          {formatCurrency(item.price, currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="text-light-textMuted hover:text-debt"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {members.map((m) => {
                        const isAssigned = item.assignedUserIds.includes(m.user.id);
                        return (
                          <button
                            key={m.user.id}
                            type="button"
                            onClick={() => toggleItemUser(idx, m.user.id)}
                            className={`px-2 py-0.5 rounded border text-[11px] font-mono transition-colors ${
                              isAssigned
                                ? "border-accent text-accent bg-accent-subtle dark:bg-accent-darkSubtle font-medium"
                                : "border-light-border dark:border-dark-border text-light-textSecondary hover:border-light-textSecondary"
                            }`}
                          >
                            {m.user.name.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax & Tip inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded border border-light-border dark:border-dark-border">
                <span className="text-[10px] text-light-textMuted uppercase block">Tax ({currency})</span>
                <input
                  type="number"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 bg-transparent font-medium tabular-nums focus:outline-none"
                />
              </div>

              <div className="p-2.5 rounded border border-light-border dark:border-dark-border">
                <span className="text-[10px] text-light-textMuted uppercase block">Tip ({currency})</span>
                <input
                  type="number"
                  step="0.01"
                  value={tip}
                  onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 bg-transparent font-medium tabular-nums focus:outline-none"
                />
              </div>
            </div>

            {/* Proportional Split Results Table */}
            <div className="border border-light-border dark:border-dark-border rounded divide-y divide-light-border dark:divide-dark-border bg-light-subtle dark:bg-dark-subtle text-xs font-mono">
              <div className="px-3 py-2 text-[10px] text-light-textMuted uppercase tracking-wider flex justify-between">
                <span>Calculated Distribution</span>
                <span>Total: {formatCurrency(splitResult.total, currency)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-light-border dark:divide-dark-border">
                {members.map((m) => {
                  const b = splitResult.breakdown[m.user.id] || { total: 0 };
                  return (
                    <div key={m.user.id} className="p-2.5 text-center">
                      <div className="text-[11px] text-light-textSecondary truncate">
                        {m.user.name.split(" ")[0]}
                      </div>
                      <div className="text-sm font-medium tabular-nums text-light-textPrimary dark:text-dark-textPrimary mt-0.5">
                        {formatCurrency(b.total, currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="py-1.5 px-3 rounded border border-light-border dark:border-dark-border text-xs font-medium text-light-textSecondary hover:bg-light-subtle"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={loading || splitResult.total <= 0}
                className="flex-1 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
              >
                {loading ? "Recording..." : "Record Expense & Itemized Splits"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
