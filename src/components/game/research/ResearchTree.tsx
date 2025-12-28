"use client";

import { useState, useCallback } from "react";
import { RESEARCH_LEVELS, RESEARCH_UNLOCKS_BY_LEVEL } from "@/lib/game/constants/crafting";

interface ResearchTreeProps {
  currentLevel: number;
  currentPoints?: number; // Reserved for future use (progress display)
}

interface TreeNodeProps {
  level: number;
  currentLevel: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function ResearchTreeNode({ level, currentLevel, isExpanded, onToggle }: TreeNodeProps) {
  const levelConfig = RESEARCH_LEVELS[level as keyof typeof RESEARCH_LEVELS];
  const unlocks = RESEARCH_UNLOCKS_BY_LEVEL[level] || [];
  const isUnlocked = currentLevel >= level;
  const isNext = currentLevel === level - 1;
  const isCurrent = currentLevel === level;

  // Calculate cumulative RP required
  const cumulativeRP = Object.entries(RESEARCH_LEVELS)
    .filter(([l]) => parseInt(l) <= level)
    .reduce((sum, [, config]) => sum + config.rpRequired, 0);

  return (
    <div className={`border rounded transition-all duration-200 ${
      isUnlocked
        ? "border-green-700/50 bg-green-900/10"
        : isNext
          ? "border-cyan-600/50 bg-cyan-900/10"
          : "border-gray-700/50 bg-gray-900/20"
    }`}>
      <button
        onClick={onToggle}
        className="w-full p-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isUnlocked
              ? "bg-green-600 text-white"
              : isNext
                ? "bg-cyan-600 text-white"
                : "bg-gray-700 text-gray-400"
          }`}>
            {level}
          </span>
          <div>
            <div className={`font-semibold ${
              isUnlocked
                ? "text-green-400"
                : isNext
                  ? "text-cyan-400"
                  : "text-gray-400"
            }`}>
              Level {level}
              {isCurrent && <span className="ml-2 text-xs bg-lcars-amber/20 text-lcars-amber px-2 py-0.5 rounded">Current</span>}
            </div>
            <div className="text-xs text-gray-500">
              {levelConfig?.rpRequired.toLocaleString()} RP ({cumulativeRP.toLocaleString()} cumulative)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${
            isUnlocked ? "text-green-400" : "text-gray-500"
          }`}>
            {unlocks.length} unlock{unlocks.length !== 1 ? "s" : ""}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && unlocks.length > 0 && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-700/50">
          <div className="space-y-2">
            {unlocks.map((unlock, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 text-sm p-2 rounded ${
                  isUnlocked
                    ? "bg-green-900/20 text-green-300"
                    : "bg-gray-800/50 text-gray-400"
                }`}
              >
                <span className={isUnlocked ? "text-green-500" : "text-gray-500"}>
                  {isUnlocked ? "✓" : "○"}
                </span>
                <span>{formatUnlockName(unlock)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatUnlockName(unlock: string): string {
  // Convert snake_case or camelCase to Title Case with spaces
  return unlock
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
    .replace(/\s+/g, " ");
}

export function ResearchTree({ currentLevel }: ResearchTreeProps) {
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(
    new Set([currentLevel, currentLevel + 1].filter(l => l >= 0 && l <= 8))
  );

  const toggleLevel = useCallback((level: number) => {
    setExpandedLevels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedLevels(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedLevels(new Set());
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-lcars-lavender">Research Tech Tree</h3>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Expand All
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
        <ResearchTreeNode
          key={level}
          level={level}
          currentLevel={currentLevel}
          isExpanded={expandedLevels.has(level)}
          onToggle={() => toggleLevel(level)}
        />
      ))}
    </div>
  );
}
