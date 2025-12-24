interface MilitaryPanelProps {
  soldiers: number;
  fighters: number;
  stations: number;
  lightCruisers: number;
  heavyCruisers: number;
  carriers: number;
  covertAgents: number;
}

export function MilitaryPanel({
  soldiers,
  fighters,
  stations,
  lightCruisers,
  heavyCruisers,
  carriers,
  covertAgents,
}: MilitaryPanelProps) {
  const units = [
    { label: "Soldiers", value: soldiers, color: "text-green-400" },
    { label: "Fighters", value: fighters, color: "text-blue-400" },
    { label: "Stations", value: stations, color: "text-purple-400" },
    { label: "Light Cruisers", value: lightCruisers, color: "text-cyan-400" },
    { label: "Heavy Cruisers", value: heavyCruisers, color: "text-orange-400" },
    { label: "Carriers", value: carriers, color: "text-red-400" },
    { label: "Covert Agents", value: covertAgents, color: "text-gray-400" },
  ];

  const totalUnits = units.reduce((sum, unit) => sum + unit.value, 0);

  return (
    <div className="lcars-panel" data-testid="military-panel">
      <h2 className="text-lg font-semibold text-lcars-lavender mb-4">
        Military Forces
      </h2>
      <div className="space-y-1 text-gray-300 text-sm">
        {units.map(({ label, value, color }) => (
          <div key={label} className="flex justify-between">
            <span>{label}:</span>
            <span className={`font-mono ${value > 0 ? color : "text-gray-600"}`}>
              {value.toLocaleString()}
            </span>
          </div>
        ))}
        <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-semibold">
          <span>Total:</span>
          <span className="font-mono text-lcars-amber">
            {totalUnits.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
