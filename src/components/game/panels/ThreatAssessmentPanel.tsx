"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  type ThreatInfo,
  type ThreatLevel,
  formatRecentAction,
} from "@/lib/game/services/military/threat-service";
import { getThreatAssessmentAction } from "@/app/actions/threat-actions";
import { Circle, Crown, Handshake, ScrollText, Swords } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ThreatAssessmentPanelProps {
  refreshTrigger?: number;
  compact?: boolean;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ThreatIcon({ level }: { level: ThreatLevel }) {
  switch (level) {
    case "immediate":
      return <Circle className="w-3 h-3 fill-red-500 text-red-500" />;
    case "watch":
      return <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />;
    case "neutral":
      return <Circle className="w-3 h-3 fill-gray-500 text-gray-500" />;
    case "friendly":
      return <Circle className="w-3 h-3 fill-green-500 text-green-500" />;
  }
}

function ThreatBadge({ level }: { level: ThreatLevel }) {
  const labels: Record<ThreatLevel, string> = {
    immediate: "THREAT",
    watch: "WATCH",
    neutral: "NEUTRAL",
    friendly: "FRIENDLY",
  };

  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium",
        level === "immediate" && "bg-red-900/50 text-red-400",
        level === "watch" && "bg-yellow-900/50 text-yellow-400",
        level === "neutral" && "bg-gray-800 text-gray-400",
        level === "friendly" && "bg-green-900/50 text-green-400"
      )}
    >
      {labels[level]}
    </span>
  );
}

function ThreatRow({
  threat,
  compact,
}: {
  threat: ThreatInfo;
  compact?: boolean;
}) {
  const formattedAction = formatRecentAction(threat.recentAction);

  return (
    <div
      className={cn(
        "p-2 rounded border-l-4 transition-colors",
        threat.threatLevel === "immediate" && "border-red-500 bg-red-900/20",
        threat.threatLevel === "watch" && "border-yellow-500 bg-yellow-900/20",
        threat.threatLevel === "neutral" && "border-gray-600 bg-gray-900/20",
        threat.threatLevel === "friendly" && "border-green-500 bg-green-900/20"
      )}
      data-testid={`threat-row-${threat.empireId}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ThreatIcon level={threat.threatLevel} />
          <span className="font-medium truncate">{threat.empireName}</span>
          {threat.isBoss && (
            <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
          )}
        </div>
        {!compact && <ThreatBadge level={threat.threatLevel} />}
      </div>

      {!compact && (
        <div className="text-xs text-gray-400 mt-1 space-y-0.5">
          <div className="flex gap-3">
            <span>
              Networth:{" "}
              <span
                className={cn(
                  "font-mono",
                  threat.networthRatio >= 2 && "text-red-400",
                  threat.networthRatio >= 1.5 &&
                    threat.networthRatio < 2 &&
                    "text-yellow-400",
                  threat.networthRatio < 1 && "text-green-400"
                )}
              >
                {threat.networthRatio.toFixed(1)}×
              </span>
            </span>
            <span>
              Military:{" "}
              <span
                className={cn(
                  "font-mono",
                  threat.militaryRatio >= 1.5 && "text-yellow-400",
                  threat.militaryRatio < 0.8 && "text-green-400"
                )}
              >
                {threat.militaryRatio.toFixed(1)}×
              </span>
            </span>
          </div>
          {formattedAction && (
            <div className="text-yellow-400">{formattedAction}</div>
          )}
          {threat.diplomaticStatus !== "neutral" && (
            <div
              className={cn(
                "flex items-center gap-1",
                threat.diplomaticStatus === "allied" && "text-green-400",
                threat.diplomaticStatus === "nap" && "text-blue-400",
                threat.diplomaticStatus === "hostile" && "text-red-400"
              )}
            >
              {threat.diplomaticStatus === "allied" && <><Handshake className="w-3 h-3" /> Alliance</>}
              {threat.diplomaticStatus === "nap" && <><ScrollText className="w-3 h-3" /> Non-Aggression Pact</>}
              {threat.diplomaticStatus === "hostile" && <><Swords className="w-3 h-3" /> Hostile</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThreatSummary({
  immediateCount,
  watchCount,
  friendlyCount,
}: {
  immediateCount: number;
  watchCount: number;
  friendlyCount: number;
}) {
  return (
    <div className="flex gap-3 text-xs mb-3">
      <div className="flex items-center gap-1">
        <Circle className="w-3 h-3 fill-red-500 text-red-500" />
        <span className="text-gray-400">{immediateCount}</span>
      </div>
      <div className="flex items-center gap-1">
        <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
        <span className="text-gray-400">{watchCount}</span>
      </div>
      <div className="flex items-center gap-1">
        <Circle className="w-3 h-3 fill-green-500 text-green-500" />
        <span className="text-gray-400">{friendlyCount}</span>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ThreatAssessmentPanel({
  refreshTrigger,
  compact = false,
}: ThreatAssessmentPanelProps) {
  const [threats, setThreats] = useState<ThreatInfo[]>([]);
  const [counts, setCounts] = useState({
    immediate: 0,
    watch: 0,
    friendly: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadThreats = useCallback(async () => {
    try {
      const result = await getThreatAssessmentAction();
      if (result) {
        setThreats(result.threats);
        setCounts({
          immediate: result.immediateCount,
          watch: result.watchCount,
          friendly: result.friendlyCount,
        });
        setError(null);
      } else {
        setError("Failed to load threat data");
      }
    } catch (err) {
      setError("Failed to load threat data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreats();
  }, [loadThreats, refreshTrigger]);

  if (loading) {
    return (
      <div className="lcars-panel" data-testid="threat-assessment-panel">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Threat Assessment
        </h2>
        <div className="text-gray-400 text-center py-4">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lcars-panel" data-testid="threat-assessment-panel">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Threat Assessment
        </h2>
        <div className="text-red-400 text-center py-4">{error}</div>
      </div>
    );
  }

  const visibleThreats = compact ? threats.slice(0, 3) : threats;

  return (
    <div className="lcars-panel" data-testid="threat-assessment-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-2">
        Threat Assessment
      </h2>

      <ThreatSummary
        immediateCount={counts.immediate}
        watchCount={counts.watch}
        friendlyCount={counts.friendly}
      />

      {visibleThreats.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          No threats detected
        </div>
      ) : (
        <div className="space-y-2">
          {visibleThreats.map((threat) => (
            <ThreatRow
              key={threat.empireId}
              threat={threat}
              compact={compact}
            />
          ))}
          {compact && threats.length > 3 && (
            <div className="text-xs text-gray-500 text-center">
              +{threats.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ThreatAssessmentPanel;
