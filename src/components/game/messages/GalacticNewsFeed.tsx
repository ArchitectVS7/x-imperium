"use client";

/**
 * Galactic News Feed Component (M8)
 *
 * Displays broadcast messages from bots as a news feed.
 * Shows empire-wide announcements and declarations.
 */

import { useEffect, useState, useCallback } from "react";
import { getGalacticNewsAction } from "@/app/actions/message-actions";
import type { GalacticNewsItem, BotArchetype } from "@/lib/messages/types";

interface GalacticNewsFeedProps {
  gameId: string;
  limit?: number;
}

// Archetype icons/labels for visual distinction
const ARCHETYPE_LABELS: Record<BotArchetype, string> = {
  warlord: "WARLORD",
  diplomat: "DIPLOMAT",
  merchant: "MERCHANT",
  schemer: "SCHEMER",
  turtle: "DEFENDER",
  blitzkrieg: "RAIDER",
  tech_rush: "SCIENTIST",
  opportunist: "OPPORTUNIST",
};

const ARCHETYPE_COLORS: Record<BotArchetype, string> = {
  warlord: "bg-red-900/50 border-red-500",
  diplomat: "bg-blue-900/50 border-blue-500",
  merchant: "bg-yellow-900/50 border-yellow-500",
  schemer: "bg-purple-900/50 border-purple-500",
  turtle: "bg-green-900/50 border-green-500",
  blitzkrieg: "bg-orange-900/50 border-orange-500",
  tech_rush: "bg-cyan-900/50 border-cyan-500",
  opportunist: "bg-gray-800/50 border-gray-500",
};

export function GalacticNewsFeed({ gameId, limit = 10 }: GalacticNewsFeedProps) {
  const [news, setNews] = useState<GalacticNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const result = await getGalacticNewsAction(gameId, { limit });
      if (result.success) {
        setNews(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to fetch galactic news:", err);
      setError("Failed to load news");
    } finally {
      setLoading(false);
    }
  }, [gameId, limit]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (loading) {
    return (
      <div className="lcars-panel animate-pulse">
        <div className="h-48 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lcars-panel">
        <h2 className="text-xl font-display text-lcars-amber mb-4">
          Galactic News
        </h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="lcars-panel">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-display text-lcars-amber">Galactic News</h2>
        <span className="text-xs text-gray-500">
          {news.length} broadcast{news.length !== 1 ? "s" : ""}
        </span>
      </div>

      {news.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No galactic broadcasts yet.</p>
          <p className="text-sm mt-2">
            Empires will make announcements as the game progresses.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {news.map((item) => (
            <NewsItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// News Item
// =============================================================================

function NewsItem({ item }: { item: GalacticNewsItem }) {
  const archetypeStyle = item.senderArchetype
    ? ARCHETYPE_COLORS[item.senderArchetype]
    : "bg-gray-800/50 border-gray-500";

  const archetypeLabel = item.senderArchetype
    ? ARCHETYPE_LABELS[item.senderArchetype]
    : "EMPIRE";

  return (
    <div
      className={`p-4 rounded-lg border-l-4 ${archetypeStyle}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-black/30 rounded text-gray-400">
            {archetypeLabel}
          </span>
          <span className="font-medium text-white">{item.senderName}</span>
        </div>
        <span className="text-xs text-gray-500">Turn {item.turn}</span>
      </div>

      {/* Content */}
      <p className="text-gray-200 italic">&quot;{item.content}&quot;</p>

      {/* Timestamp */}
      <p className="text-xs text-gray-600 mt-2">
        {new Date(item.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

// =============================================================================
// Compact News Widget (for dashboard)
// =============================================================================

export function GalacticNewsWidget({ gameId }: { gameId: string }) {
  const [latestNews, setLatestNews] = useState<GalacticNewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const result = await getGalacticNewsAction(gameId, { limit: 1 });
        if (result.success && result.data.length > 0) {
          const firstItem = result.data[0];
          if (firstItem) {
            setLatestNews(firstItem);
          }
        }
      } catch (error) {
        console.error("Failed to fetch latest news:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLatest();
  }, [gameId]);

  if (loading) {
    return (
      <div className="bg-gray-800/50 p-3 rounded animate-pulse">
        <div className="h-12 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!latestNews) {
    return (
      <div className="bg-gray-800/50 p-3 rounded">
        <p className="text-sm text-gray-500">No galactic news</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-3 rounded border-l-2 border-lcars-amber">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-lcars-amber">GALACTIC NEWS</span>
        <span className="text-xs text-gray-500">Turn {latestNews.turn}</span>
      </div>
      <p className="text-sm text-gray-300">
        <span className="text-white font-medium">{latestNews.senderName}:</span>{" "}
        &quot;{latestNews.content.substring(0, 100)}
        {latestNews.content.length > 100 ? "..." : ""}&quot;
      </p>
    </div>
  );
}
