"use client";

/**
 * Sectors List Component
 *
 * Client-side wrapper for sector cards that handles refresh on release.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Sector } from "@/lib/db/schema";
import { SectorCard } from "./SectorCard";

interface SectorsListProps {
  sectors: Sector[];  // Still uses Sector type from DB schema
  sectorCount: number;
}

export function SectorsList({ sectors, sectorCount }: SectorsListProps) {
  const router = useRouter();
  const [currentSectorCount, setCurrentSectorCount] = useState(sectorCount);

  const handleRelease = useCallback(() => {
    // Decrement local count immediately for optimistic UI
    setCurrentSectorCount((prev) => Math.max(1, prev - 1));
    // Refresh the page to get updated data
    router.refresh();
  }, [router]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sectors.map((sector) => (
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
