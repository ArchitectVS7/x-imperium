interface ResourcePanelProps {
  credits: number;
  food: number;
  ore: number;
  petroleum: number;
  researchPoints: number;
}

export function ResourcePanel({
  credits,
  food,
  ore,
  petroleum,
  researchPoints,
}: ResourcePanelProps) {
  return (
    <div className="lcars-panel" data-testid="resource-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Resources
      </h2>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between" data-testid="credits">
          <span>Credits:</span>
          <span className="font-mono text-lcars-amber">
            {credits.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between" data-testid="food">
          <span>Food:</span>
          <span className="font-mono text-green-400">
            {food.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between" data-testid="ore">
          <span>Ore:</span>
          <span className="font-mono text-gray-400">
            {ore.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between" data-testid="petroleum">
          <span>Petroleum:</span>
          <span className="font-mono text-yellow-500">
            {petroleum.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between" data-testid="research-points">
          <span>Research:</span>
          <span className="font-mono text-lcars-blue">
            {researchPoints.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
