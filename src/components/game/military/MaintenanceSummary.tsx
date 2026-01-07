"use client";

import { useState, useEffect } from "react";
import { getTotalMaintenanceAction } from "@/app/actions/unit-actions";
import { UNIT_LABELS, type UnitType } from "@/lib/game/unit-config";
import type { UnitMaintenanceBreakdown } from "@/lib/game/services/unit-service";

interface MaintenanceSummaryProps {
  refreshTrigger?: number;
}

export function MaintenanceSummary({ refreshTrigger }: MaintenanceSummaryProps) {
  const [maintenance, setMaintenance] = useState<{
    sectorCost: number;
    unitCost: number;
    totalCost: number;
    unitBreakdown: UnitMaintenanceBreakdown;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadMaintenance = async () => {
      const data = await getTotalMaintenanceAction();
      setMaintenance(data);
      setIsLoading(false);
    };
    loadMaintenance();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <div className="lcars-panel" data-testid="maintenance-summary">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Maintenance Costs
        </h2>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!maintenance) {
    return null;
  }

  const unitEntries = Object.entries(maintenance.unitBreakdown.byUnit).filter(
    ([, data]) => data.count > 0
  ) as [UnitType, { count: number; cost: number }][];

  return (
    <div className="lcars-panel" data-testid="maintenance-summary">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-lcars-lavender">
          Maintenance Costs
        </h2>
        <span className="text-lcars-amber font-mono text-lg">
          {maintenance.totalCost.toLocaleString()} cr/turn
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-300">
          <span>Sector Maintenance:</span>
          <span className="font-mono text-purple-400">
            {maintenance.sectorCost.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Unit Maintenance:</span>
          <span className="font-mono text-blue-400">
            {maintenance.unitCost.toLocaleString()}
          </span>
        </div>
        <div className="border-t border-gray-700 pt-2 flex justify-between font-semibold text-gray-200">
          <span>Total:</span>
          <span className="font-mono text-lcars-amber">
            {maintenance.totalCost.toLocaleString()}
          </span>
        </div>
      </div>

      {maintenance.unitCost > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 w-full text-sm text-gray-400 hover:text-gray-200 text-left flex items-center gap-2"
          >
            <span className="text-lcars-amber">{isExpanded ? "▼" : "▶"}</span>
            <span>Unit breakdown ({unitEntries.length} types)</span>
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-1 text-xs border-l-2 border-gray-700 pl-3">
              {unitEntries.map(([unitType, data]) => (
                <div
                  key={unitType}
                  className="flex justify-between text-gray-400"
                >
                  <span>
                    {UNIT_LABELS[unitType]}{" "}
                    <span className="text-gray-600">×{data.count.toLocaleString()}</span>
                  </span>
                  <span className="font-mono">{data.cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
