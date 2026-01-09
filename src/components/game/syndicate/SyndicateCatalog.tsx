"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getBlackMarketCatalogAction,
  purchaseBlackMarketItemAction,
  type BlackMarketItemDisplay,
} from "@/app/actions/syndicate-actions";

interface SyndicateCatalogProps {
  refreshTrigger?: number;
  onPurchase?: () => void;
}

type CategoryFilter = "all" | "component" | "system" | "weapon" | "intel";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "All Items",
  component: "Components",
  system: "Systems",
  weapon: "Weapons",
  intel: "Intelligence",
};

const CATEGORY_COLORS: Record<Exclude<CategoryFilter, "all">, string> = {
  component: "text-cyan-400",
  system: "text-purple-400",
  weapon: "text-red-400",
  intel: "text-green-400",
};

export function SyndicateCatalog({ refreshTrigger, onPurchase }: SyndicateCatalogProps) {
  const [catalog, setCatalog] = useState<BlackMarketItemDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedItem, setSelectedItem] = useState<BlackMarketItemDisplay | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBlackMarketCatalogAction();
      setCatalog(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog, refreshTrigger]);

  const handlePurchase = async () => {
    if (!selectedItem || !selectedItem.isUnlocked || selectedItem.price === null) return;

    setIsPurchasing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await purchaseBlackMarketItemAction(selectedItem.itemId, quantity);
      if (result.success) {
        setSuccess(
          `Purchased ${quantity} ${selectedItem.name} for ${result.creditsSpent?.toLocaleString()} credits`
        );
        setSelectedItem(null);
        setQuantity(1);
        onPurchase?.();
      } else {
        setError(result.error ?? "Purchase failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setIsPurchasing(false);
    }
  };

  const filteredCatalog = catalog.filter(
    (item) => categoryFilter === "all" || item.type === categoryFilter
  );

  const unlockedCount = catalog.filter((c) => c.isUnlocked).length;

  if (isLoading) {
    return (
      <div className="bg-black/40 border border-gray-700/50 rounded p-4">
        <div className="text-gray-400 text-sm">Loading Black Market catalog...</div>
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <div className="bg-black/40 border border-gray-700/50 rounded p-4">
        <div className="text-gray-500 text-sm text-center py-4">
          The Black Market is not available at your current trust level.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-gray-700/50 rounded overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-white">Black Market</h3>
          <span className="text-xs text-gray-400">
            {unlockedCount} / {catalog.length} items available
          </span>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                categoryFilter === cat
                  ? "bg-lcars-purple/30 text-lcars-purple"
                  : "bg-gray-800 text-gray-400 hover:text-gray-300"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-900/30 border-b border-red-800/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/30 border-b border-green-800/50">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Catalog Grid */}
      <div className="p-4 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredCatalog.map((item) => (
            <button
              key={item.itemId}
              onClick={() => {
                if (item.isUnlocked) {
                  setSelectedItem(item);
                  setQuantity(item.singleUse ? 1 : quantity);
                  setError(null);
                  setSuccess(null);
                }
              }}
              disabled={!item.isUnlocked}
              className={`text-left border rounded p-3 transition-all ${
                item.isUnlocked
                  ? selectedItem?.itemId === item.itemId
                    ? "border-lcars-purple bg-lcars-purple/10"
                    : "border-gray-700/50 bg-black/20 hover:border-gray-600"
                  : "border-gray-800/50 bg-black/10 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-medium text-white text-sm">{item.name}</h4>
                <span className={`text-xs ${CATEGORY_COLORS[item.type]}`}>
                  {item.type.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                {item.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-lcars-amber font-mono text-sm">
                  {item.price !== null
                    ? `${item.price.toLocaleString()} Cr`
                    : "Locked"}
                </span>
                {item.singleUse && (
                  <span className="text-xs text-red-400">Single-use</span>
                )}
              </div>
              {item.coordinatorResponse && (
                <p className="text-xs text-orange-400 mt-1">
                  Warning: {item.coordinatorResponse}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Panel */}
      {selectedItem && (
        <div className="p-4 border-t border-gray-700/50 bg-black/30">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">{selectedItem.name}</h4>
              <p className="text-xs text-gray-400">{selectedItem.description}</p>
            </div>

            <div className="flex items-center gap-3">
              {!selectedItem.singleUse && (
                <div className="flex items-center gap-2">
                  <label htmlFor="syndicate-quantity" className="text-xs text-gray-400">Qty:</label>
                  <input
                    id="syndicate-quantity"
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                    }
                    className="w-16 px-2 py-1 bg-black/50 border border-gray-600 rounded
                             text-white text-sm font-mono focus:outline-none focus:border-lcars-purple"
                  />
                </div>
              )}

              <div className="text-right">
                <div className="text-lcars-amber font-mono">
                  {((selectedItem.price ?? 0) * quantity).toLocaleString()} Cr
                </div>
                <div className="text-xs text-gray-500">
                  Total Cost
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="px-4 py-2 bg-lcars-amber/20 border border-lcars-amber/50
                         text-lcars-amber rounded hover:bg-lcars-amber/30
                         disabled:opacity-50 transition-colors"
              >
                {isPurchasing ? "Purchasing..." : "Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
