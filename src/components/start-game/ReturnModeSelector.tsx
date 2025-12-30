"use client";

import { useTransition } from "react";
import type { ResumableCampaign } from "@/app/actions/game-actions";

interface ReturnModeSelectorProps {
  campaigns: ResumableCampaign[];
  resumeAction: (gameId: string) => Promise<void>;
  newGameAction: () => Promise<void>;
}

/**
 * Mode selector shown when a user returns to the game.
 * Options:
 * - Continue existing campaign (if any)
 * - Start new oneshot game
 */
export function ReturnModeSelector({
  campaigns,
  resumeAction,
  newGameAction,
}: ReturnModeSelectorProps) {
  const [isPending, startTransition] = useTransition();

  const handleResume = (gameId: string) => {
    startTransition(async () => {
      await resumeAction(gameId);
    });
  };

  const handleNewGame = () => {
    startTransition(async () => {
      await newGameAction();
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Resumable Campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-lcars-lavender">
            Continue Campaign
          </h3>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <button
                key={campaign.gameId}
                onClick={() => handleResume(campaign.gameId)}
                disabled={isPending}
                className="w-full p-4 bg-gray-800/50 border border-lcars-blue/30 rounded-lg hover:border-lcars-blue hover:bg-gray-800 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`resume-campaign-${campaign.gameId}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lcars-amber">
                      {campaign.empireName}
                    </div>
                    <div className="text-sm text-gray-400">
                      {campaign.gameName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lcars-blue font-mono">
                      Turn {campaign.currentTurn}/{campaign.turnLimit}
                    </div>
                    <div className="text-xs text-gray-500">
                      Session {campaign.sessionCount}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>{campaign.empireCount} empires remaining</span>
                  <span>Last played: {formatDate(campaign.lastSessionAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {campaigns.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-gray-500">or</span>
          </div>
        </div>
      )}

      {/* Start New Game */}
      <button
        onClick={handleNewGame}
        disabled={isPending}
        className="w-full p-4 bg-lcars-amber/10 border border-lcars-amber/30 rounded-lg hover:border-lcars-amber hover:bg-lcars-amber/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="start-new-game-button"
      >
        <div className="text-center">
          <div className="font-semibold text-lcars-amber text-lg">
            {campaigns.length > 0 ? "Start New Oneshot" : "Start New Game"}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {campaigns.length > 0
              ? "Quick game, 10-25 empires, single session"
              : "Begin your galactic conquest"}
          </div>
        </div>
      </button>

      {/* Loading overlay */}
      {isPending && (
        <div className="text-center text-lcars-amber animate-pulse">
          Loading...
        </div>
      )}
    </div>
  );
}
