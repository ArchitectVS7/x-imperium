import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  fetchDashboardDataAction,
  hasActiveGameAction,
} from "@/app/actions/game-actions";
import { PLANET_TYPE_LABELS, PLANET_PRODUCTION } from "@/lib/game/constants";
import type { Planet } from "@/lib/db/schema";
import { BuyPlanetPanel } from "@/components/game/planets/BuyPlanetPanel";

const PLANET_TYPE_COLORS: Record<string, string> = {
  food: "border-green-500",
  ore: "border-gray-500",
  petroleum: "border-yellow-500",
  tourism: "border-amber-500",
  urban: "border-blue-500",
  education: "border-purple-500",
  government: "border-red-500",
  research: "border-cyan-500",
  supply: "border-orange-500",
  anti_pollution: "border-green-300",
};

const PLANET_ICONS: Record<string, string> = {
  food: "🌾",
  ore: "⛏️",
  petroleum: "🛢️",
  tourism: "🏖️",
  urban: "🏙️",
  education: "📚",
  government: "🏛️",
  research: "🔬",
  supply: "📦",
  anti_pollution: "🌿",
};

function PlanetCard({ planet }: { planet: Planet }) {
  const borderColor = PLANET_TYPE_COLORS[planet.type] || "border-gray-600";
  const icon = PLANET_ICONS[planet.type] || "🪐";
  const label = PLANET_TYPE_LABELS[planet.type as keyof typeof PLANET_TYPE_LABELS] || planet.type;
  const production = PLANET_PRODUCTION[planet.type as keyof typeof PLANET_PRODUCTION] || 0;

  const productionUnit = (() => {
    switch (planet.type) {
      case "tourism":
      case "urban":
        return "credits/turn";
      case "government":
        return "agent capacity";
      case "research":
        return "RP/turn";
      case "food":
        return "food/turn";
      case "ore":
        return "ore/turn";
      case "petroleum":
        return "petro/turn";
      default:
        return "/turn";
    }
  })();

  return (
    <div
      className={`lcars-panel border-l-4 ${borderColor}`}
      data-testid={`planet-card-${planet.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-semibold text-lcars-lavender">{label}</h3>
        </div>
        <span className="text-sm text-gray-500">#{planet.id.slice(-6)}</span>
      </div>
      <div className="text-gray-300 space-y-1">
        <div className="flex justify-between">
          <span>Production:</span>
          <span className="font-mono text-lcars-amber">
            {production.toLocaleString()} {productionUnit}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Base Value:</span>
          <span className="font-mono text-gray-400">
            {planet.purchasePrice.toLocaleString()} credits
          </span>
        </div>
      </div>
    </div>
  );
}

async function PlanetsContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  const data = await fetchDashboardDataAction();

  if (!data) {
    redirect("/game");
  }

  // Group planets by type
  const planetsByType = data.planets.reduce<Record<string, Planet[]>>(
    (acc, planet) => {
      const existing = acc[planet.type];
      if (existing) {
        existing.push(planet);
      } else {
        acc[planet.type] = [planet];
      }
      return acc;
    },
    {}
  );

  // Sort types by count (descending)
  const sortedTypes = Object.entries(planetsByType).sort(
    (a, b) => b[1].length - a[1].length
  );

  return (
    <div data-testid="planets-page">
      {/* Summary Section */}
      <div className="lcars-panel mb-6">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Empire Holdings
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedTypes.map(([type, planets]) => {
            const label = PLANET_TYPE_LABELS[type as keyof typeof PLANET_TYPE_LABELS] || type;
            const icon = PLANET_ICONS[type] || "🪐";
            return (
              <div
                key={type}
                className="text-center p-2 bg-gray-800/50 rounded"
                data-testid={`planet-summary-${type}`}
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-lcars-amber font-mono text-xl">
                  {planets.length}
                </div>
                <div className="text-gray-400 text-sm">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buy Planet Section */}
      <div className="mb-6">
        <BuyPlanetPanel credits={data.resources.credits} />
      </div>

      {/* Detailed Planet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.planets.map((planet) => (
          <PlanetCard key={planet.id} planet={planet} />
        ))}
      </div>
    </div>
  );
}

function PlanetsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="lcars-panel h-32 bg-gray-800/50 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="lcars-panel h-24 bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}

export default function PlanetsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        Planets
      </h1>
      <Suspense fallback={<PlanetsSkeleton />}>
        <PlanetsContent />
      </Suspense>
    </div>
  );
}
