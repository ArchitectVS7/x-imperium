"use client";

import { useState } from "react";

type BotCount = 10 | 25 | 50;

interface BotCountOption {
  value: BotCount;
  label: string;
  description: string;
  tierBreakdown: string;
}

const BOT_COUNT_OPTIONS: BotCountOption[] = [
  {
    value: 10,
    label: "Small Galaxy",
    description: "Quick games with fewer rivals",
    tierBreakdown: "2 elite, 2 strategic, 3 simple, 3 random",
  },
  {
    value: 25,
    label: "Standard",
    description: "Balanced competitive experience",
    tierBreakdown: "5 elite, 6 strategic, 7 simple, 7 random",
  },
  {
    value: 50,
    label: "Large Galaxy",
    description: "Epic battles with many factions",
    tierBreakdown: "10 elite, 12 strategic, 14 simple, 14 random",
  },
];

interface BotCountSelectorProps {
  defaultValue?: BotCount;
  name?: string;
}

export function BotCountSelector({
  defaultValue = 25,
  name = "botCount",
}: BotCountSelectorProps) {
  const [selected, setSelected] = useState<BotCount>(defaultValue);
  const [showTooltip, setShowTooltip] = useState<BotCount | null>(null);

  return (
    <div className="space-y-3" data-testid="bot-count-selector">
      <label className="block text-sm font-medium text-gray-400">
        Galaxy Size
      </label>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-3 gap-2">
        {BOT_COUNT_OPTIONS.map((option) => (
          <div key={option.value} className="relative">
            <button
              type="button"
              onClick={() => setSelected(option.value)}
              onMouseEnter={() => setShowTooltip(option.value)}
              onMouseLeave={() => setShowTooltip(null)}
              className={`w-full p-3 rounded border transition-all text-center ${
                selected === option.value
                  ? "border-lcars-amber bg-lcars-amber/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
              data-testid={`bot-count-${option.value}`}
            >
              <div className="font-semibold text-lcars-blue">
                {option.value} Bots
              </div>
              <div className="text-xs text-gray-400 mt-1">{option.label}</div>
            </button>
            {showTooltip === option.value && (
              <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-lg text-xs whitespace-nowrap">
                <div className="text-gray-300 mb-1">{option.description}</div>
                <div className="text-gray-500">{option.tierBreakdown}</div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-gray-700" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BotCountSelector;
