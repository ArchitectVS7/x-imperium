"use client";

/**
 * Messages Page (M8)
 *
 * Full messaging interface with:
 * - Inbox with direct messages from bots
 * - Galactic News feed (broadcasts)
 * - Read/unread status tracking
 */

import { useEffect, useState, useCallback } from "react";
import { MessageInbox } from "@/components/game/messages/MessageInbox";
import { GalacticNewsFeed } from "@/components/game/messages/GalacticNewsFeed";
import {
  getGameSessionAction,
  getInboxSummaryFromCookiesAction,
} from "@/app/actions/message-actions";

type TabType = "inbox" | "news";

export default function MessagesPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("inbox");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load game session
  useEffect(() => {
    async function loadSession() {
      const result = await getGameSessionAction();
      if (result.success) {
        setGameId(result.data.gameId);
        setPlayerId(result.data.empireId);

        // Get initial unread count
        const summaryResult = await getInboxSummaryFromCookiesAction();
        if (summaryResult.success) {
          setUnreadCount(summaryResult.data.unreadCount);
        }
      }
      setLoading(false);
    }
    loadSession();
  }, []);

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display text-lcars-amber mb-8">Messages</h1>
        <div className="lcars-panel animate-pulse h-64"></div>
      </div>
    );
  }

  if (!gameId || !playerId) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-display text-lcars-amber mb-8">Messages</h1>
        <div className="lcars-panel">
          <p className="text-gray-400">No active game session. Start a game to receive messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto" data-testid="messages-page">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Messages</h1>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-6 py-3 rounded-t font-medium transition-colors ${
            activeTab === "inbox"
              ? "bg-lcars-amber text-black"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Inbox
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-lcars-blue text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("news")}
          className={`px-6 py-3 rounded-t font-medium transition-colors ${
            activeTab === "news"
              ? "bg-lcars-amber text-black"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Galactic News
        </button>
      </div>

      {/* Tab Content */}
      <div className="border-t-4 border-lcars-amber pt-6">
        {activeTab === "inbox" ? (
          <MessageInbox
            gameId={gameId}
            playerId={playerId}
            onUnreadCountChange={handleUnreadCountChange}
          />
        ) : (
          <GalacticNewsFeed gameId={gameId} />
        )}
      </div>
    </div>
  );
}
