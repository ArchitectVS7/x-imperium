"use client";

import { useState, useCallback } from "react";
import { ResourceInventory } from "./ResourceInventory";
import { RecipeList } from "./RecipeList";
import { CraftingQueue } from "./CraftingQueue";

interface CraftingPanelProps {
  refreshTrigger?: number;
}

type TabId = "recipes" | "inventory" | "queue";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "recipes", label: "Craft" },
  { id: "inventory", label: "Inventory" },
  { id: "queue", label: "Queue" },
];

export function CraftingPanel({ refreshTrigger }: CraftingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("recipes");
  const [localRefresh, setLocalRefresh] = useState(0);

  const handleCraftQueued = useCallback(() => {
    setLocalRefresh((prev) => prev + 1);
  }, []);

  const handleQueueUpdated = useCallback(() => {
    setLocalRefresh((prev) => prev + 1);
  }, []);

  const combinedRefresh = (refreshTrigger ?? 0) + localRefresh;

  return (
    <div className="lcars-panel" data-testid="crafting-panel">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-lcars-lavender">
          Manufacturing
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-700 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              activeTab === tab.id
                ? "bg-lcars-purple/20 text-lcars-purple border-b-2 border-lcars-purple"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === "recipes" && (
          <RecipeList
            refreshTrigger={combinedRefresh}
            onCraftQueued={handleCraftQueued}
          />
        )}

        {activeTab === "inventory" && (
          <ResourceInventory
            refreshTrigger={combinedRefresh}
          />
        )}

        {activeTab === "queue" && (
          <CraftingQueue
            refreshTrigger={combinedRefresh}
            onQueueUpdated={handleQueueUpdated}
          />
        )}
      </div>

      {/* Quick summary at bottom */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <ResourceInventory
          refreshTrigger={combinedRefresh}
          compact
        />
      </div>
    </div>
  );
}
