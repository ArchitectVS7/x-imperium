/**
 * AttackInterface Component
 *
 * Interface for configuring and launching attacks.
 * Allows players to select forces, attack type, and target.
 */

"use client";

import { useState, useMemo } from "react";
import type { Forces } from "@/lib/combat";
import { SOLDIERS_PER_CARRIER } from "@/lib/combat";
import type { CombatStance } from "@/lib/combat/stances";
import { CombatPreview } from "./CombatPreview";
import { StanceSelector } from "./StanceSelector";
import { UnitIcons, UIIcons, ActionIcons } from "@/lib/theme/icons";
import { Swords } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface AttackInterfaceProps {
  /** Available forces for attack */
  availableForces: Forces;
  /** Target empire info */
  target: {
    id: string;
    name: string;
    estimatedForces?: Forces;
    hasFullIntel: boolean;
  };
  /** Attacker name */
  attackerName: string;
  /** Attacker army effectiveness */
  attackerEffectiveness: number;
  /** Defender effectiveness (if known) */
  defenderEffectiveness?: number;
  /** Callback when attack is launched */
  onLaunchAttack: (forces: Forces, attackType: "invasion" | "guerilla", stance: CombatStance) => void;
  /** Callback when cancelled */
  onCancel: () => void;
}

type AttackType = "invasion" | "guerilla";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AttackInterface({
  availableForces,
  target,
  attackerName,
  attackerEffectiveness,
  defenderEffectiveness,
  onLaunchAttack,
  onCancel,
}: AttackInterfaceProps) {
  // State for selected forces
  const [selectedForces, setSelectedForces] = useState<Forces>({
    soldiers: 0,
    fighters: 0,
    stations: 0,
    lightCruisers: 0,
    heavyCruisers: 0,
    carriers: 0,
  });

  // State for attack type
  const [attackType, setAttackType] = useState<AttackType>("invasion");

  // State for combat stance
  const [selectedStance, setSelectedStance] = useState<CombatStance>("balanced");

  // State for showing preview
  const [showPreview, setShowPreview] = useState(false);

  // Calculate carrier capacity
  const carrierCapacity = selectedForces.carriers * SOLDIERS_PER_CARRIER;
  const effectiveSoldiers = Math.min(selectedForces.soldiers, carrierCapacity);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (attackType === "invasion") {
      if (selectedForces.carriers === 0) {
        errors.push("Invasions require at least 1 carrier for troop transport");
      }
      if (selectedForces.soldiers === 0) {
        errors.push("Invasions require soldiers to capture sectors");
      }
      if (selectedForces.soldiers > carrierCapacity && selectedForces.carriers > 0) {
        errors.push(`Only ${formatNumber(carrierCapacity)} soldiers can be transported. Consider adding more carriers.`);
      }
    } else {
      // Guerilla
      if (selectedForces.soldiers === 0) {
        errors.push("Guerilla attacks require soldiers");
      }
    }

    const totalUnits = Object.values(selectedForces).reduce((a, b) => a + b, 0);
    if (totalUnits === 0) {
      errors.push("Select at least some forces to attack with");
    }

    return errors;
  }, [selectedForces, attackType, carrierCapacity]);

  const isValid = validationErrors.length === 0;

  // Force selection handler
  const handleForceChange = (unit: keyof Forces, value: number) => {
    const maxValue = availableForces[unit];
    const clampedValue = Math.max(0, Math.min(value, maxValue));
    setSelectedForces(prev => ({ ...prev, [unit]: clampedValue }));
  };

  // Set all forces
  const handleSelectAll = () => {
    setSelectedForces({ ...availableForces });
  };

  // Clear all forces
  const handleClearAll = () => {
    setSelectedForces({
      soldiers: 0,
      fighters: 0,
      stations: 0,
      lightCruisers: 0,
      heavyCruisers: 0,
      carriers: 0,
    });
  };

  // Launch attack handler
  const handleLaunchAttack = () => {
    if (!isValid) return;

    // For invasions, limit soldiers to carrier capacity
    const attackForces: Forces = {
      ...selectedForces,
      soldiers: attackType === "invasion" ? effectiveSoldiers : selectedForces.soldiers,
    };

    onLaunchAttack(attackForces, attackType, selectedStance);
  };

  // Show preview
  if (showPreview) {
    const previewForces: Forces = {
      ...selectedForces,
      soldiers: attackType === "invasion" ? effectiveSoldiers : selectedForces.soldiers,
    };

    return (
      <CombatPreview
        attackerForces={previewForces}
        defenderForces={target.estimatedForces ?? {
          soldiers: 0,
          fighters: 0,
          stations: 0,
          lightCruisers: 0,
          heavyCruisers: 0,
          carriers: 0,
        }}
        attackerName={attackerName}
        defenderName={target.name}
        hasFullIntel={target.hasFullIntel}
        attackerEffectiveness={attackerEffectiveness}
        defenderEffectiveness={defenderEffectiveness}
        onConfirmAttack={handleLaunchAttack}
        onCancel={() => setShowPreview(false)}
      />
    );
  }

  // Unit configuration
  const units: { key: keyof Forces; label: string; icon: LucideIcon; color: string; forGuerilla: boolean }[] = [
    { key: "soldiers", label: "Soldiers", icon: UnitIcons.soldiers, color: "text-green-400", forGuerilla: true },
    { key: "fighters", label: "Fighters", icon: UnitIcons.fighters, color: "text-blue-400", forGuerilla: false },
    { key: "stations", label: "Stations", icon: UnitIcons.stations, color: "text-purple-400", forGuerilla: false },
    { key: "lightCruisers", label: "Light Cruisers", icon: UnitIcons.lightCruisers, color: "text-cyan-400", forGuerilla: false },
    { key: "heavyCruisers", label: "Heavy Cruisers", icon: UnitIcons.heavyCruisers, color: "text-orange-400", forGuerilla: false },
    { key: "carriers", label: "Carriers", icon: UnitIcons.carriers, color: "text-red-400", forGuerilla: false },
  ];

  return (
    <div className="lcars-panel max-w-xl mx-auto" data-testid="attack-interface">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-lcars-amber">Launch Attack</h2>
        <p className="text-gray-400">
          Target: <span className="text-lcars-lavender font-semibold">{target.name}</span>
        </p>
      </div>

      {/* Attack Type Selection */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Attack Type</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAttackType("invasion")}
            className={`p-4 rounded-lg border-2 transition-all ${
              attackType === "invasion"
                ? "border-lcars-amber bg-lcars-amber/20"
                : "border-gray-700 hover:border-gray-500"
            }`}
          >
            <ActionIcons.combat className="w-8 h-8 mx-auto mb-1" />
            <div className={`font-semibold ${attackType === "invasion" ? "text-lcars-amber" : "text-gray-300"}`}>
              Invasion
            </div>
            <div className="text-xs text-gray-500">
              Full assault to capture sectors
            </div>
          </button>

          <button
            onClick={() => setAttackType("guerilla")}
            className={`p-4 rounded-lg border-2 transition-all ${
              attackType === "guerilla"
                ? "border-lcars-amber bg-lcars-amber/20"
                : "border-gray-700 hover:border-gray-500"
            }`}
          >
            <Swords className="w-8 h-8 mx-auto mb-1" />
            <div className={`font-semibold ${attackType === "guerilla" ? "text-lcars-amber" : "text-gray-300"}`}>
              Guerilla
            </div>
            <div className="text-xs text-gray-500">
              Quick raid with soldiers only
            </div>
          </button>
        </div>
      </div>

      {/* Combat Stance Selection */}
      <div className="mb-6">
        <StanceSelector
          selectedStance={selectedStance}
          onStanceChange={setSelectedStance}
        />
      </div>

      {/* Force Selection */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-400">Select Forces</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-lcars-amber hover:underline"
            >
              Select All
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-400 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {units.map(({ key, label, icon: IconComponent, color, forGuerilla }) => {
            const isDisabled = attackType === "guerilla" && !forGuerilla && key !== "soldiers";
            const available = availableForces[key];
            const selected = selectedForces[key];

            return (
              <div
                key={key}
                className={`p-3 rounded-lg bg-gray-900/50 ${isDisabled ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <IconComponent className={`w-4 h-4 ${color}`} />
                    <span className={color}>{label}</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Available: {formatNumber(available)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={available}
                    value={selected}
                    onChange={(e) => handleForceChange(key, parseInt(e.target.value, 10))}
                    disabled={isDisabled}
                    className="flex-1 accent-lcars-amber"
                  />
                  <input
                    type="number"
                    min={0}
                    max={available}
                    value={selected}
                    onChange={(e) => handleForceChange(key, parseInt(e.target.value, 10) || 0)}
                    disabled={isDisabled}
                    className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-right font-mono text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carrier Capacity Info */}
      {attackType === "invasion" && selectedForces.carriers > 0 && (
        <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Carrier Capacity:</span>
            <span className="font-mono">
              {formatNumber(carrierCapacity)} soldiers
            </span>
          </div>
          {selectedForces.soldiers > carrierCapacity && (
            <div className="text-xs text-orange-400 mt-1 flex items-center gap-1">
              <UIIcons.warning className="w-3 h-3" />
              <span>Only {formatNumber(carrierCapacity)} soldiers will participate</span>
            </div>
          )}
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          {validationErrors.map((error, index) => (
            <p key={index} className="text-red-400 text-sm flex items-center gap-1">
              <UIIcons.warning className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </p>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-700 text-gray-200 font-semibold rounded hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => setShowPreview(true)}
          disabled={!isValid}
          className={`px-6 py-2 font-semibold rounded transition-colors ${
            isValid
              ? "bg-lcars-amber text-black hover:bg-lcars-amber/80"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          Preview Attack
        </button>
      </div>
    </div>
  );
}
