"use client";

/**
 * Compact Command Bar
 *
 * A distinctive, space-efficient resource and status display.
 * Replaces the bulky full-panel layout with a sleek, always-visible bar.
 *
 * Design Principles:
 * - Horizontal layout maximizes vertical space
 * - SVG icons replace emojis for crisp, professional look
 * - Color-coded resources with hover details
 * - Expandable panels for deep dives
 */

import { useState } from "react";
import { ResourceIconWithValue } from "@/lib/theme/icons";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CompactCommandBarProps {
  // Resources
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
  // Empire stats
  population: number;
  sectorCount: number;
  networth: number;
  civilStatus: string;
}

export function CompactCommandBar({
  credits,
  food,
  ore,
  petroleum,
  researchPoints,
  population,
  sectorCount,
  networth,
  civilStatus,
}: CompactCommandBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 border-b border-lcars-amber/30">
      {/* Compact View - Always Visible */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Primary Resources - Most Important */}
          <div className="flex items-center gap-4">
            <ResourceIconWithValue resource="credits" value={credits} />
            <div className="w-px h-5 bg-gray-700" />
            <ResourceIconWithValue resource="food" value={food} compact />
            <ResourceIconWithValue resource="ore" value={ore} compact />
            <ResourceIconWithValue resource="petroleum" value={petroleum} compact />
          </div>

          {/* Secondary Stats */}
          <div className="flex items-center gap-4 text-sm">
            <ResourceIconWithValue resource="researchPoints" value={researchPoints} compact />
            <div className="w-px h-5 bg-gray-700" />
            <ResourceIconWithValue resource="population" value={population} compact />
            <div className="text-gray-400">
              <span className="text-gray-500">Sectors: </span>
              <span className="font-mono text-white">{sectorCount}</span>
            </div>
          </div>

          {/* Expand/Collapse Toggle - WCAG 2.1 compliant 44px touch target */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-2 min-w-[44px] min-h-[44px] rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Show less details" : "Show more details"}
          >
            <span className="text-xs uppercase tracking-wider">
              {isExpanded ? "Less" : "More"}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded View - Additional Details */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-gray-800 pt-2 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Civil Status</span>
              <div className="text-white font-medium capitalize">{civilStatus}</div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Renown</span>
              <div className="text-lcars-lavender font-mono">{networth.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Food Balance</span>
              <div className={`font-mono ${food > 1000 ? "text-green-400" : food > 0 ? "text-yellow-400" : "text-red-400"}`}>
                {food > 0 ? `+${food}` : food}
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Research Level</span>
              <div className="text-blue-400 font-mono">
                {researchPoints > 0 ? Math.floor(researchPoints / 1000) : 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
