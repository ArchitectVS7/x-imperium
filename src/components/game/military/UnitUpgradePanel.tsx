"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getAllUpgradeStatusesAction,
  upgradeUnitAction,
} from "@/app/actions/upgrade-actions";
import { UNIT_LABELS, type UnitType } from "@/lib/game/unit-config";
import { MAX_UPGRADE_LEVEL } from "@/lib/game/upgrade-config";
import type { AllUpgradeStatuses, UpgradeStatus } from "@/lib/game/services/military/upgrade-service";

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  soldiers: "border-green-500/50",
  fighters: "border-blue-500/50",
  stations: "border-purple-500/50",
  lightCruisers: "border-cyan-500/50",
  heavyCruisers: "border-orange-500/50",
  carriers: "border-red-500/50",
  covertAgents: "border-gray-500/50",
};

interface UnitUpgradePanelProps {
  onUpgrade?: () => void;
  refreshTrigger?: number;
}

export function UnitUpgradePanel({ onUpgrade, refreshTrigger }: UnitUpgradePanelProps) {
  const [data, setData] = useState<AllUpgradeStatuses | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, startUpgrade] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    const result = await getAllUpgradeStatusesAction();
    setData(result);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleUpgrade = async (unitType: UnitType) => {
    setError(null);
    setSuccess(null);

    startUpgrade(async () => {
      const result = await upgradeUnitAction(unitType);
      if (result.success) {
        setSuccess(
          `${UNIT_LABELS[unitType]} upgraded to Level ${result.newLevel}! ` +
          `Spent ${result.researchPointsSpent?.toLocaleString()} RP.`
        );
        await loadData();
        onUpgrade?.();
      } else {
        setError(result.error || "Upgrade failed");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="lcars-panel" data-testid="unit-upgrade-panel">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Unit Upgrades
        </h2>
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="lcars-panel" data-testid="unit-upgrade-panel">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Unit Upgrades
        </h2>
        <div className="text-gray-400 text-sm">
          Upgrade data unavailable. Initialize upgrades first.
        </div>
      </div>
    );
  }

  return (
    <div className="lcars-panel" data-testid="unit-upgrade-panel">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-lcars-lavender">
          Unit Upgrades
        </h2>
        <span className="text-sm text-gray-400">
          Available RP:{" "}
          <span className="text-cyan-400 font-mono">
            {data.availableResearchPoints.toLocaleString()}
          </span>
        </span>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-900/50 border border-red-500 text-red-300 text-sm rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-2 bg-green-900/50 border border-green-500 text-green-300 text-sm rounded">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {data.upgrades.map((upgrade) => (
          <UpgradeCard
            key={upgrade.unitType}
            upgrade={upgrade}
            onUpgrade={handleUpgrade}
            isUpgrading={isUpgrading}
          />
        ))}
      </div>
    </div>
  );
}

interface UpgradeCardProps {
  upgrade: UpgradeStatus;
  onUpgrade: (unitType: UnitType) => void;
  isUpgrading: boolean;
}

function UpgradeCard({ upgrade, onUpgrade, isUpgrading }: UpgradeCardProps) {
  const isMaxLevel = upgrade.level >= MAX_UPGRADE_LEVEL;
  const borderColor = UNIT_TYPE_COLORS[upgrade.unitType];

  return (
    <div
      className={`p-3 rounded border ${borderColor} bg-black/30`}
      data-testid={`upgrade-card-${upgrade.unitType}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-white">
            {UNIT_LABELS[upgrade.unitType]}
          </h3>
          <p className="text-xs text-gray-400">{upgrade.description}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_UPGRADE_LEVEL + 1 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i <= upgrade.level ? "bg-lcars-amber" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Level {upgrade.level}/{MAX_UPGRADE_LEVEL}
          </div>
        </div>
      </div>

      {/* Bonuses */}
      <div className="text-xs text-gray-400 mb-2">
        <span className="text-gray-500">Bonuses: </span>
        {Object.entries(upgrade.bonuses).map(([key, value], i) => (
          <span key={key}>
            {i > 0 && " | "}
            <span className="text-white capitalize">{key}</span>{" "}
            <span className="text-lcars-amber">{value}×</span>
          </span>
        ))}
      </div>

      {/* Upgrade button */}
      {isMaxLevel ? (
        <div className="text-center text-sm text-lcars-amber py-1">
          Maximum Level
        </div>
      ) : (
        <button
          onClick={() => onUpgrade(upgrade.unitType)}
          disabled={!upgrade.canUpgrade || isUpgrading}
          className={`w-full py-2 rounded font-semibold text-sm transition-colors ${
            upgrade.canUpgrade
              ? "bg-cyan-600 text-white hover:bg-cyan-500"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isUpgrading ? (
            "Upgrading..."
          ) : upgrade.canUpgrade ? (
            `Upgrade to Level ${upgrade.level + 1} (${upgrade.upgradeCost.toLocaleString()} RP)`
          ) : (
            `Need ${upgrade.upgradeCost.toLocaleString()} RP`
          )}
        </button>
      )}
    </div>
  );
}
