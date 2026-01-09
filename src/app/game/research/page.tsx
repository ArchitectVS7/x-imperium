import { ResearchPanel } from "@/components/game/research/ResearchPanel";
import { FundamentalResearchProgress } from "@/components/game/research/FundamentalResearchProgress";

export default function ResearchPage() {
  return (
    <div className="max-w-6xl mx-auto" data-testid="research-page">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Research</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main research panel */}
        <ResearchPanel />

        {/* Research progress visualization */}
        <FundamentalResearchProgress />
      </div>

      <div className="mt-6 lcars-panel">
        <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
          Research System
        </h2>
        <div className="text-sm text-gray-400 space-y-2">
          <p>
            <span className="text-cyan-400">Research Sectors</span> generate{" "}
            <span className="text-white font-mono">100 RP</span> per turn.
          </p>
          <p>
            Research costs increase exponentially:{" "}
            <span className="text-white font-mono">1,000 × 2^level</span>
          </p>
          <p>
            <span className="text-cyan-400">Level 2</span> unlocks{" "}
            <span className="text-white">Light Cruisers</span> for construction.
          </p>
        </div>
      </div>
    </div>
  );
}
