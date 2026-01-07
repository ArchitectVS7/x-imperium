"use client";

import { useState, useTransition } from "react";
import { releaseSectorAction } from "@/app/actions/sector-actions";
import type { Sector } from "@/lib/db/schema";
import { PLANET_TYPE_LABELS, PLANET_COSTS, type PlanetType } from "@/lib/game/constants";
import { calculateReleaseRefund } from "@/lib/formulas/sector-costs";

interface SectorReleaseButtonProps {
  sector: Sector;  // Still uses Sector type from DB schema
  totalSectors: number;
  onRelease?: () => void;
}

export function SectorReleaseButton({ sector, totalSectors, onRelease }: SectorReleaseButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sectorLabel = PLANET_TYPE_LABELS[sector.type as keyof typeof PLANET_TYPE_LABELS];
  const baseCost = PLANET_COSTS[sector.type as PlanetType];
  const refundAmount = calculateReleaseRefund(baseCost, totalSectors);
  const canRelease = totalSectors > 1;

  const handleRelease = () => {
    setError(null);
    startTransition(async () => {
      const result = await releaseSectorAction(sector.id);
      if (result.success) {
        setShowConfirm(false);
        onRelease?.();
      } else {
        setError(result.error || "Failed to release sector");
      }
    });
  };

  if (!canRelease) {
    return (
      <span className="text-xs text-gray-600" title="Cannot release your last sector">
        Last sector
      </span>
    );
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-300">
          Refund: <span className="text-green-400">{refundAmount.toLocaleString()}</span>
        </div>
        <button
          onClick={handleRelease}
          disabled={isPending}
          className="px-2 py-0.5 text-xs bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isPending ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-2 py-0.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
      title={`Release ${sectorLabel} for ${refundAmount.toLocaleString()} credits (50% refund)`}
    >
      Release
    </button>
  );
}
