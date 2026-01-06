"use client";

/**
 * Market Panel Content
 *
 * Panel version of the market page for starmap-centric UI.
 */

import { useState, useEffect } from "react";
import { getCurrentGameAction } from "@/app/actions/game-actions";
import { MarketPanel } from "@/components/game/market/MarketPanel";

interface MarketPanelContentProps {
  onClose?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MarketPanelContent({ onClose }: MarketPanelContentProps) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [empireId, setEmpireId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const { gameId, empireId } = await getCurrentGameAction();
      setGameId(gameId ?? null);
      setEmpireId(empireId ?? null);
      setIsLoading(false);
    }
    loadSession();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="h-32 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!gameId || !empireId) {
    return (
      <div className="text-gray-400">
        No active game session. Please start a new game.
      </div>
    );
  }

  return <MarketPanel gameId={gameId} empireId={empireId} />;
}

export default MarketPanelContent;
