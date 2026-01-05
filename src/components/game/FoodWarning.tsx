"use client";

/**
 * Food Warning Component
 *
 * Displays a warning when food reserves are insufficient to feed the population.
 * Food consumption: 0.05 per citizen per turn.
 */

import Link from "next/link";
import { Siren, AlertTriangle, Apple, ShoppingCart, Store } from "lucide-react";

interface FoodWarningProps {
  food: number;
  population: number;
  foodProduction: number;
}

const FOOD_CONSUMPTION_PER_CITIZEN = 0.05;

export function FoodWarning({ food, population, foodProduction }: FoodWarningProps) {
  const foodNeeded = Math.ceil(population * FOOD_CONSUMPTION_PER_CITIZEN);
  const foodAfterConsumption = food + foodProduction - foodNeeded;
  const turnsOfFood = foodProduction > 0
    ? Math.floor(food / (foodNeeded - foodProduction))
    : food > foodNeeded ? Infinity : 0;

  // Show warning if food will run out
  const willStarve = foodAfterConsumption < 0;
  const lowFood = food < foodNeeded * 3; // Less than 3 turns of reserves
  const criticalFood = food < foodNeeded;

  if (!willStarve && !lowFood && !criticalFood) {
    return null;
  }

  const severity = criticalFood ? "critical" : willStarve ? "danger" : "warning";
  const bgColor = {
    critical: "bg-red-900/50 border-red-500",
    danger: "bg-orange-900/50 border-orange-500",
    warning: "bg-yellow-900/50 border-yellow-500",
  }[severity];

  const textColor = {
    critical: "text-red-400",
    danger: "text-orange-400",
    warning: "text-yellow-400",
  }[severity];

  const message = criticalFood
    ? "CRITICAL: Not enough food! Population will starve this turn!"
    : willStarve
    ? "DANGER: Food production insufficient. Population will begin starving!"
    : `Low food reserves. ~${turnsOfFood} turns until starvation.`;

  return (
    <div
      className={`p-3 rounded border ${bgColor} mb-4`}
      role="alert"
      data-testid="food-warning"
    >
      <div className="flex items-start gap-3">
        <span className={`${textColor}`} aria-hidden="true">
          {severity === "critical" ? (
            <Siren className="w-6 h-6" />
          ) : severity === "danger" ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <Apple className="w-6 h-6" />
          )}
        </span>
        <div className="flex-1">
          <p className={`font-semibold ${textColor}`}>{message}</p>
          <div className="mt-2 text-sm text-gray-300 grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Current Food:</span>{" "}
              <span className="font-mono text-white">{food.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Food Needed:</span>{" "}
              <span className="font-mono text-white">{foodNeeded.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Production:</span>{" "}
              <span className="font-mono text-green-400">+{foodProduction.toLocaleString()}/turn</span>
            </div>
            <div>
              <span className="text-gray-500">Balance:</span>{" "}
              <span className={`font-mono ${foodAfterConsumption >= 0 ? "text-green-400" : "text-red-400"}`}>
                {foodAfterConsumption >= 0 ? "+" : ""}{foodAfterConsumption.toLocaleString()}
              </span>
            </div>
          </div>
          {(willStarve || criticalFood) && (
            <div className="mt-3 flex gap-2">
              <Link
                href="/game/sectors?filter=food"
                className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-sm font-medium transition-colors"
                data-testid="colonize-agriculture-button"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Colonize Agriculture</span>
              </Link>
              <Link
                href="/game/market?resource=food&action=buy"
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
                data-testid="buy-food-market-button"
              >
                <Store className="w-4 h-4" />
                <span>Buy Food Now</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
