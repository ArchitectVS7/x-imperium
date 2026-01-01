"use client";

/**
 * Market Panel Component (M7)
 *
 * Displays market prices and allows buying/selling resources.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getMarketStatusAction,
  buyResourceAction,
  sellResourceAction,
  validateBuyOrderAction,
  validateSellOrderAction,
} from "@/app/actions/market-actions";

interface MarketPriceInfo {
  resourceType: "food" | "ore" | "petroleum";
  basePrice: number;
  currentPrice: number;
  multiplier: number;
  trend: "up" | "down" | "stable";
}

interface MarketStatus {
  prices: MarketPriceInfo[];
  playerResources: {
    food: number;
    ore: number;
    petroleum: number;
    credits: number;
  };
}

interface TradeValidation {
  valid: boolean;
  error?: string;
  totalCost: number;
  fee: number;
  pricePerUnit: number;
}

interface MarketPanelProps {
  gameId: string;
  empireId: string;
  onTradeComplete?: () => void;
}

export function MarketPanel({ gameId, empireId, onTradeComplete }: MarketPanelProps) {
  const [status, setStatus] = useState<MarketStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trade state
  const [selectedResource, setSelectedResource] = useState<"food" | "ore" | "petroleum">("food");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState(100);
  const [validation, setValidation] = useState<TradeValidation | null>(null);
  const [trading, setTrading] = useState(false);

  const fetchStatus = useCallback(async () => {
    const result = await getMarketStatusAction(gameId, empireId);
    if (result.success) {
      setStatus(result.data);
    } else {
      setError(result.error || "Failed to load market");
    }
    setLoading(false);
  }, [gameId, empireId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Validate trade when inputs change
  useEffect(() => {
    async function validate() {
      if (quantity <= 0) {
        setValidation(null);
        return;
      }

      const validateFn = tradeType === "buy" ? validateBuyOrderAction : validateSellOrderAction;
      const result = await validateFn(gameId, empireId, selectedResource, quantity);

      if (result.success) {
        setValidation(result.data);
      }
    }

    const timer = setTimeout(validate, 300);
    return () => clearTimeout(timer);
  }, [gameId, empireId, selectedResource, tradeType, quantity]);

  const handleTrade = async () => {
    if (!validation?.valid || trading) return;

    setTrading(true);
    setError(null);

    const tradeFn = tradeType === "buy" ? buyResourceAction : sellResourceAction;
    const result = await tradeFn(gameId, empireId, selectedResource, quantity);

    if (result.success) {
      await fetchStatus();
      onTradeComplete?.();
    } else {
      setError(result.error || "Trade failed");
    }

    setTrading(false);
  };

  if (loading) {
    return (
      <div className="lcars-panel animate-pulse" data-testid="market-panel-loading">
        <div className="h-64 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="lcars-panel" data-testid="market-panel-error">
        <p className="text-red-400">{error || "Failed to load market"}</p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-red-400";
      case "down":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="lcars-panel" data-testid="market-panel">
      <h2 className="text-xl font-display text-lcars-amber mb-4">Global Market</h2>

      {/* Horizontal Layout: Resource List (Left) + Trade Form (Right) */}
      <div className="flex gap-6 h-[600px]">
        {/* LEFT: Resource Selection & Prices (1/3 width, scrollable) */}
        <div className="w-1/3 flex flex-col gap-4">
          {/* Market Prices */}
          <div className="flex-1 overflow-y-auto pr-2">
            <h3 className="text-sm text-gray-400 mb-3 sticky top-0 bg-gray-900 py-1">Current Prices</h3>
            <div className="space-y-2">
              {status.prices.map((price) => (
                <div
                  key={price.resourceType}
                  className={`flex items-center justify-between p-3 rounded cursor-pointer transition-colors ${
                    selectedResource === price.resourceType
                      ? "bg-lcars-amber/20 border border-lcars-amber"
                      : "bg-gray-800/50 hover:bg-gray-800"
                  }`}
                  onClick={() => setSelectedResource(price.resourceType)}
                  data-testid={`market-price-${price.resourceType}`}
                >
                  <span className="capitalize font-medium">{price.resourceType}</span>
                  <div className="flex flex-col items-end">
                    <span className="text-lcars-blue font-mono">{price.currentPrice.toFixed(2)} cr</span>
                    <span className={`text-xs ${getTrendColor(price.trend)}`}>
                      {getTrendIcon(price.trend)} {(price.multiplier * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Your Resources (Fixed at bottom of left column) */}
          <div className="p-3 bg-gray-800/50 rounded border-t border-gray-700">
            <h3 className="text-xs text-gray-400 uppercase mb-2">Your Resources</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Food: <span className="text-lcars-mint font-mono">{status.playerResources.food.toLocaleString()}</span></div>
              <div>Ore: <span className="text-lcars-mint font-mono">{status.playerResources.ore.toLocaleString()}</span></div>
              <div>Petrol: <span className="text-lcars-mint font-mono">{status.playerResources.petroleum.toLocaleString()}</span></div>
              <div>Credits: <span className="text-lcars-amber font-mono">{status.playerResources.credits.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT: Trade Interface (2/3 width, no scroll) */}
        <div className="w-2/3 border-l border-gray-700 pl-6 flex flex-col">
          <h3 className="text-lg font-display text-white mb-4">
            Trade <span className="capitalize text-lcars-amber">{selectedResource}</span>
          </h3>

          {/* Buy/Sell Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              className={`flex-1 py-2 rounded transition-colors font-medium ${
                tradeType === "buy"
                  ? "bg-lcars-blue text-black"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              onClick={() => setTradeType("buy")}
              data-testid="market-buy-tab"
            >
              Buy
            </button>
            <button
              className={`flex-1 py-2 rounded transition-colors font-medium ${
                tradeType === "sell"
                  ? "bg-lcars-orange text-black"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              onClick={() => setTradeType("sell")}
              data-testid="market-sell-tab"
            >
              Sell
            </button>
          </div>

          {/* Quantity Input */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white text-lg font-mono focus:border-lcars-amber focus:outline-none"
              data-testid="market-quantity-input"
            />
          </div>

          {/* Validation Result (Flex-grow to push button down) */}
          <div className="flex-1 mb-4">
            {validation && (
              <div className={`p-4 rounded ${validation.valid ? "bg-gray-800" : "bg-red-900/30"}`}>
                {validation.valid ? (
                  <div className="space-y-2" data-testid="market-validation-success">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Price per unit:</span>
                      <span className="font-mono">{validation.pricePerUnit.toFixed(2)} cr</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Fee (2%):</span>
                      <span className="font-mono">{validation.fee.toLocaleString()} cr</span>
                    </div>
                    <div className="flex justify-between font-bold text-lcars-amber text-lg pt-2 border-t border-gray-700">
                      <span>{tradeType === "buy" ? "Total Cost:" : "You Receive:"}</span>
                      <span className="font-mono">{validation.totalCost.toLocaleString()} cr</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-400" data-testid="market-validation-error">
                    {validation.error}
                  </p>
                )}
              </div>
            )}
            {error && (
              <p className="text-red-400 text-sm mt-2" data-testid="market-error">
                {error}
              </p>
            )}
          </div>

          {/* Trade Button - ALWAYS VISIBLE at bottom */}
          <button
            onClick={handleTrade}
            disabled={!validation?.valid || trading}
            className={`w-full py-4 rounded-lg font-display text-lg transition-all ${
              validation?.valid && !trading
                ? tradeType === "buy"
                  ? "bg-lcars-blue text-black hover:bg-lcars-blue/80 hover:scale-[1.02]"
                  : "bg-lcars-orange text-black hover:bg-lcars-orange/80 hover:scale-[1.02]"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
            data-testid="market-trade-button"
          >
            {trading
              ? "Processing..."
              : tradeType === "buy"
              ? `BUY ${quantity.toLocaleString()} ${selectedResource.toUpperCase()}`
              : `SELL ${quantity.toLocaleString()} ${selectedResource.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
