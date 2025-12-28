"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getAvailableRecipesAction,
  queueCraftingOrderAction,
  type RecipeDisplay,
} from "@/app/actions/crafting-actions";
import type { CraftedResource } from "@/lib/game/constants/crafting";

interface RecipeListProps {
  refreshTrigger?: number;
  onCraftQueued?: () => void;
}

const TIER_COLORS = {
  1: "text-green-400",
  2: "text-cyan-400",
  3: "text-purple-400",
} as const;

const TIER_LABELS = {
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
} as const;

export function RecipeList({ refreshTrigger, onCraftQueued }: RecipeListProps) {
  const [recipes, setRecipes] = useState<RecipeDisplay[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDisplay | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<1 | 2 | 3 | "all">("all");
  const [showLocked, setShowLocked] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadRecipes = async () => {
      setIsLoading(true);
      try {
        const data = await getAvailableRecipesAction(true);
        if (!cancelled) {
          setRecipes(data);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadRecipes();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleCraft = () => {
    if (!selectedRecipe || quantity <= 0) return;

    setError(null);
    setSuccess(null);

    // Use startTransition for the state update, but handle async separately
    const doCraft = async () => {
      const result = await queueCraftingOrderAction(
        selectedRecipe.resource as CraftedResource,
        quantity
      );

      startTransition(() => {
        if (result.success) {
          setSuccess(
            `Queued ${quantity} ${selectedRecipe.label}. Completes turn ${result.completionTurn}.`
          );
          setQuantity(1);
          onCraftQueued?.();
        } else {
          setError(result.error || "Failed to queue crafting");
        }
      });
    };

    doCraft();
  };

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading recipes...</div>;
  }

  if (!recipes || recipes.length === 0) {
    return <div className="text-gray-500 text-sm">No recipes available</div>;
  }

  const filteredRecipes = recipes.filter((recipe) => {
    if (filterTier !== "all" && recipe.tier !== filterTier) return false;
    if (!showLocked && !recipe.isAvailable) return false;
    return true;
  });

  const groupedRecipes = {
    1: filteredRecipes.filter((r) => r.tier === 1),
    2: filteredRecipes.filter((r) => r.tier === 2),
    3: filteredRecipes.filter((r) => r.tier === 3),
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <span className="text-gray-400">Filter:</span>
        <button
          onClick={() => setFilterTier("all")}
          className={`px-2 py-1 rounded ${
            filterTier === "all"
              ? "bg-lcars-amber text-black"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          All
        </button>
        {([1, 2, 3] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setFilterTier(tier)}
            className={`px-2 py-1 rounded ${
              filterTier === tier
                ? "bg-lcars-amber text-black"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {TIER_LABELS[tier]}
          </button>
        ))}
        <label className="flex items-center gap-1 ml-2">
          <input
            type="checkbox"
            checked={showLocked}
            onChange={(e) => setShowLocked(e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          <span className="text-gray-400">Show locked</span>
        </label>
      </div>

      {error && (
        <div className="p-2 bg-red-900/50 border border-red-500 text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="p-2 bg-green-900/50 border border-green-500 text-green-300 text-sm rounded">
          {success}
        </div>
      )}

      {/* Recipe list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {([1, 2, 3] as const).map((tier) => {
          const tierRecipes = groupedRecipes[tier];
          if (tierRecipes.length === 0 && filterTier === "all") return null;

          return (
            <div key={tier}>
              {filterTier === "all" && tierRecipes.length > 0 && (
                <div className={`text-xs font-semibold ${TIER_COLORS[tier]} mb-1`}>
                  {TIER_LABELS[tier]}
                </div>
              )}
              {tierRecipes.map((recipe) => {
                const isSelected = selectedRecipe?.resource === recipe.resource;
                return (
                  <button
                    key={recipe.resource}
                    onClick={() => {
                      if (recipe.isAvailable) {
                        setSelectedRecipe(recipe);
                        setError(null);
                        setSuccess(null);
                      }
                    }}
                    disabled={!recipe.isAvailable}
                    className={`w-full text-left p-2 rounded border transition-colors mb-1 ${
                      isSelected
                        ? "border-lcars-amber bg-lcars-amber/10"
                        : !recipe.isAvailable
                        ? "border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed"
                        : "border-gray-700 bg-black/30 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-semibold ${recipe.isAvailable ? TIER_COLORS[recipe.tier] : "text-gray-500"}`}>
                          {recipe.label}
                          {!recipe.isAvailable && (
                            <span className="ml-2 text-xs text-red-400">LOCKED</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {recipe.inputs.map((i) => `${i.amount} ${i.label}`).join(" + ")}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-gray-400">
                          {recipe.craftingTime} turn{recipe.craftingTime !== 1 ? "s" : ""}
                        </div>
                        {!recipe.isAvailable && (
                          <div className="text-red-400">
                            Research L{recipe.researchRequired}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Craft controls */}
      {selectedRecipe && (
        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center gap-4 mb-3">
            <label className="text-gray-400 text-sm">Quantity:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-2 py-1 bg-black border border-gray-600 rounded text-white font-mono text-center focus:border-lcars-amber focus:outline-none"
            />
          </div>

          <div className="text-sm text-gray-400 mb-3 space-y-1">
            <div className="flex justify-between">
              <span>Resources Required:</span>
            </div>
            {selectedRecipe.inputs.map((input) => (
              <div key={input.resource} className="flex justify-between pl-4 text-xs">
                <span>{input.label}:</span>
                <span className="font-mono text-lcars-amber">
                  {(input.amount * quantity).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-1">
              <span>Total Crafting Time:</span>
              <span className="text-gray-300">
                {selectedRecipe.craftingTime * quantity} turn{selectedRecipe.craftingTime * quantity !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <button
            onClick={handleCraft}
            disabled={isPending || quantity <= 0}
            className={`w-full py-2 rounded font-semibold transition-colors ${
              quantity > 0
                ? "bg-lcars-amber text-black hover:bg-lcars-amber/80"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isPending ? "Queueing..." : `Craft ${quantity} ${selectedRecipe.label}`}
          </button>
        </div>
      )}
    </div>
  );
}
