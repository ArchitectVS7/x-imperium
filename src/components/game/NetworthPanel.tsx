interface NetworthPanelProps {
  networth: number;
  rank?: number;
}

export function NetworthPanel({ networth, rank }: NetworthPanelProps) {
  return (
    <div className="lcars-panel" data-testid="networth-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Networth
      </h2>
      <div className="space-y-2 text-gray-300">
        <div className="flex justify-between" data-testid="networth-value">
          <span>Total:</span>
          <span className="font-mono text-lcars-amber text-xl">
            {networth.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between" data-testid="rank">
          <span>Rank:</span>
          <span className="font-mono text-lcars-mint">
            {rank ?? "--"}
          </span>
        </div>
      </div>
    </div>
  );
}
