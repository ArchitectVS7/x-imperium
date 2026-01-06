"use client";

/**
 * Messages Panel Content
 *
 * Panel version of the messages page for starmap-centric UI.
 */

import { useEffect, useState, useCallback } from "react";
import { MessageInbox } from "@/components/game/messages/MessageInbox";
import { GalacticNewsFeed } from "@/components/game/messages/GalacticNewsFeed";
import {
  getGameSessionAction,
  getInboxSummaryFromCookiesAction,
} from "@/app/actions/message-actions";

type TabType = "inbox" | "news";

interface MessagesPanelContentProps {
  onClose?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function MessagesPanelContent({ onUnreadCountChange }: MessagesPanelContentProps) {
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
    onUnreadCountChange?.(count);
  }, [onUnreadCountChange]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/2" />
        <div className="h-32 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!gameId || !playerId) {
    return (
      <div className="text-gray-400">
        No active game session. Start a game to receive messages.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-800">
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "inbox"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Inbox
          {unreadCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-lcars-blue text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("news")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "news"
              ? "text-lcars-amber border-b-2 border-lcars-amber"
              : "text-gray-400 hover:text-white"
          }`}
        >
          News
        </button>
      </div>

      {/* Tab Content */}
      <div className="max-h-[60vh] overflow-y-auto">
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

export default MessagesPanelContent;
