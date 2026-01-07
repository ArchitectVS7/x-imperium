import type { Sector } from "@/lib/db/schema";
import { PLANET_TYPE_LABELS } from "@/lib/game/constants";

interface PlanetListProps {
  planets: Sector[];
}

const PLANET_TYPE_COLORS: Record<string, string> = {
  food: "text-green-400",
  ore: "text-gray-400",
  petroleum: "text-yellow-500",
  tourism: "text-lcars-amber",
  urban: "text-blue-400",
  education: "text-purple-400",
  government: "text-red-400",
  research: "text-cyan-400",
  supply: "text-orange-400",
  anti_pollution: "text-green-300",
};

export function PlanetList({ planets }: PlanetListProps) {
  // Group planets by type and count
  const sectorsByType = planets.reduce(
    (acc, planet) => {
      acc[planet.type] = (acc[planet.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Sort by count (descending) then alphabetically
  const sortedTypes = Object.entries(sectorsByType).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  return (
    <div className="lcars-panel" data-testid="planet-list">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Planets ({planets.length})
      </h2>
      <div className="space-y-1 text-gray-300">
        {sortedTypes.map(([type, count]) => {
          const label = PLANET_TYPE_LABELS[type as keyof typeof PLANET_TYPE_LABELS] || type;
          const color = PLANET_TYPE_COLORS[type] || "text-gray-300";

          return (
            <div
              key={type}
              className="flex justify-between"
              data-testid={`planet-type-${type}`}
            >
              <span className={color}>{label}:</span>
              <span className="font-mono text-lcars-amber">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
