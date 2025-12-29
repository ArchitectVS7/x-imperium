"use client";

/**
 * Food Warning Component
 *
 * Displays a warning when food reserves are insufficient to feed the population.
 * Food consumption: 0.05 per citizen per turn.
 */

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
        <span className="text-xl" aria-hidden="true">
          {severity === "critical" ? "🚨" : severity === "danger" ? "⚠️" : "🍞"}
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
            <p className="mt-2 text-xs text-gray-400">
              Tip: Buy Food planets in the Planets page or buy food on the Market.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
