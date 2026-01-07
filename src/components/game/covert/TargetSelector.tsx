"use client";

/**
 * Target Selector Component
 *
 * Dropdown/list for selecting target empire for covert operations.
 */

interface Target {
  id: string;
  name: string;
  networth: number;
  sectorCount: number;
}

interface TargetSelectorProps {
  targets: Target[];
  selectedTarget: Target | null;
  onSelectTarget: (target: Target | null) => void;
  loading?: boolean;
}

export function TargetSelector({
  targets,
  selectedTarget,
  onSelectTarget,
  loading,
}: TargetSelectorProps) {
  if (loading) {
    return (
      <div className="lcars-panel animate-pulse">
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (targets.length === 0) {
    return (
      <div className="lcars-panel">
        <p className="text-gray-400">No targets available</p>
      </div>
    );
  }

  return (
    <div className="lcars-panel" data-testid="target-selector-panel">
      <h2 className="text-xl font-display text-lcars-amber mb-4">
        Select Target
      </h2>

      <select
        value={selectedTarget?.id || ""}
        onChange={(e) => {
          const target = targets.find((t) => t.id === e.target.value);
          onSelectTarget(target || null);
        }}
        className="w-full p-3 bg-gray-900 border border-lcars-orange/50 rounded text-gray-200 focus:border-lcars-orange focus:outline-none"
        data-testid="covert-target-select"
      >
        <option value="">-- Select an empire --</option>
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.name} ({target.sectorCount} sectors, NW: {target.networth.toLocaleString()})
          </option>
        ))}
      </select>

      {selectedTarget && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded">
          <h3 className="font-display text-lcars-blue mb-2">
            {selectedTarget.name}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Planets:</span>{" "}
              <span className="text-gray-300">{selectedTarget.sectorCount}</span>
            </div>
            <div>
              <span className="text-gray-500">Networth:</span>{" "}
              <span className="text-gray-300">
                {selectedTarget.networth.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
