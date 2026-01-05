"use client";

/**
 * Sectors List Component
 *
 * Client-side wrapper for sector cards that handles refresh on release.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Planet } from "@/lib/db/schema";
import { SectorCard } from "./SectorCard";

interface SectorsListProps {
  planets: Planet[];  // Still uses Planet type from DB schema
  planetCount: number;
}

export function SectorsList({ planets, planetCount }: SectorsListProps) {
  const router = useRouter();
  const [currentSectorCount, setCurrentSectorCount] = useState(planetCount);

  const handleRelease = useCallback(() => {
    // Decrement local count immediately for optimistic UI
    setCurrentSectorCount((prev) => Math.max(1, prev - 1));
    // Refresh the page to get updated data
    router.refresh();
  }, [router]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {planets.map((sector) => (
        <SectorCard
          key={sector.id}
          sector={sector}
          sectorCount={currentSectorCount}
          onRelease={handleRelease}
        />
      ))}
    </div>
  );
}
