import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  fetchDashboardDataAction,
  hasActiveGameAction,
} from "@/app/actions/game-actions";
import { getSectorTypeLabel, UI_LABELS } from "@/lib/game/constants";
import type { Sector } from "@/lib/db/schema";
import { ColonizeSectorPanel } from "@/components/game/sectors/ColonizeSectorPanel";
import { SectorsList } from "@/components/game/sectors/SectorsList";
import { SectorIcons } from "@/lib/theme/icons";

async function SectorsContent() {
  const hasGame = await hasActiveGameAction();

  if (!hasGame) {
    redirect("/game");
  }

  const data = await fetchDashboardDataAction();

  if (!data) {
    redirect("/game");
  }

  // Group sectors by type
  const sectorsByType = data.sectors.reduce<Record<string, Sector[]>>(
    (acc, sector) => {
      const existing = acc[sector.type];
      if (existing) {
        existing.push(sector);
      } else {
        acc[sector.type] = [sector];
      }
      return acc;
    },
    {}
  );

  // Sort types by count (descending)
  const sortedTypes = Object.entries(sectorsByType).sort(
    (a, b) => b[1].length - a[1].length
  );

  return (
    <div data-testid="sectors-page">
      {/* Summary Section */}
      <div className="lcars-panel mb-6">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Empire Holdings
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedTypes.map(([type, sectors]) => {
            const label = getSectorTypeLabel(type as Parameters<typeof getSectorTypeLabel>[0]);
            const IconComponent = SectorIcons[type as keyof typeof SectorIcons];
            return (
              <div
                key={type}
                className="text-center p-2 bg-gray-800/50 rounded"
                data-testid={`sector-summary-${type}`}
              >
                <div className="text-2xl mb-1 flex justify-center">
                  {IconComponent ? <IconComponent className="w-7 h-7" /> : <span>?</span>}
                </div>
                <div className="text-lcars-amber font-mono text-xl">
                  {sectors.length}
                </div>
                <div className="text-gray-400 text-sm">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Colonize Sector Section */}
      <div className="mb-6">
        <ColonizeSectorPanel credits={data.resources.credits} />
      </div>

      {/* Detailed Sector Cards with Release Option */}
      <SectorsList sectors={data.sectors} sectorCount={data.stats.sectorCount} />
    </div>
  );
}

function SectorsSkeleton() {
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

export default function SectorsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">
        {UI_LABELS.sectors}
      </h1>
      <Suspense fallback={<SectorsSkeleton />}>
        <SectorsContent />
      </Suspense>
    </div>
  );
}
