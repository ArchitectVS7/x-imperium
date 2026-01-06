"use client";

/**
 * Research Panel Content
 *
 * Panel version of the research page for starmap-centric UI.
 */

import { ResearchPanel } from "@/components/game/research/ResearchPanel";
import { FundamentalResearchProgress } from "@/components/game/research/FundamentalResearchProgress";
import { useState } from "react";

interface ResearchPanelContentProps {
  onClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ResearchPanelContent({ onClose }: ResearchPanelContentProps) {
  const [activeTab, setActiveTab] = useState<"allocate" | "progress">("allocate");

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setActiveTab("allocate")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "allocate"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Allocate
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "progress"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Progress
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "allocate" && <ResearchPanel />}
      {activeTab === "progress" && <FundamentalResearchProgress />}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-800">
        <p>
          <span className="text-cyan-400">Research Sectors</span> generate{" "}
          <span className="text-white font-mono">100 RP</span>/turn
        </p>
        <p>
          Cost scales: <span className="text-white font-mono">1,000 × 2^level</span>
        </p>
      </div>
    </div>
  );
}

export default ResearchPanelContent;
