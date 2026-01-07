"use client";

/**
 * Sector Card Component
 *
 * Displays a single sector with its production info and release option.
 */

import { PLANET_TYPE_LABELS, PLANET_PRODUCTION } from "@/lib/game/constants";
import type { Sector } from "@/lib/db/schema";
import { ReleaseSectorButton } from "./ReleaseSectorButton";
import { SectorIcons } from "@/lib/theme/icons";
import { Globe } from "lucide-react";

const SECTOR_TYPE_COLORS: Record<string, string> = {
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

interface SectorCardProps {
  sector: Sector;  // Still uses Sector type from DB schema
  sectorCount: number;
  onRelease?: () => void;
}

export function SectorCard({ sector, sectorCount, onRelease }: SectorCardProps) {
  const borderColor = SECTOR_TYPE_COLORS[sector.type] || "border-gray-600";
  const IconComponent = SectorIcons[sector.type as keyof typeof SectorIcons] || Globe;
  const label = PLANET_TYPE_LABELS[sector.type as keyof typeof PLANET_TYPE_LABELS] || sector.type;
  const production = PLANET_PRODUCTION[sector.type as keyof typeof PLANET_PRODUCTION] || 0;

  const productionUnit = (() => {
    switch (sector.type) {
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
      data-testid={`sector-card-${sector.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <IconComponent className="w-6 h-6" />
          <h3 className="text-lg font-semibold text-lcars-lavender">{label}</h3>
        </div>
        <span className="text-sm text-gray-500">#{sector.id.slice(-6)}</span>
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
            {sector.purchasePrice.toLocaleString()} credits
          </span>
        </div>
      </div>
      {/* Release Button */}
      <div className="mt-3 pt-2 border-t border-gray-700/50 flex justify-end">
        <ReleaseSectorButton
          sectorId={sector.id}
          sectorType={label}
          purchasePrice={sector.purchasePrice}
          sectorCount={sectorCount}
          onRelease={onRelease}
        />
      </div>
    </div>
  );
}
