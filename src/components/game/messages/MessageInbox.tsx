"use client";

/**
 * Message Inbox Component (M8)
 *
 * Displays the player's inbox with:
 * - Unread message indicator
 * - Message list with sender and preview
 * - Mark as read functionality
 * - Filtering options
 */

import { useEffect, useState, useCallback } from "react";
import {
  getInboxAction,
  getInboxSummaryAction,
  markMessageReadAction,
  markAllMessagesReadAction,
} from "@/app/actions/message-actions";
import type { StoredMessage, InboxSummary, BotArchetype } from "@/lib/messages/types";

interface MessageInboxProps {
  gameId: string;
  playerId: string;
  onUnreadCountChange?: (count: number) => void;
}

// Archetype colors for visual distinction
const ARCHETYPE_COLORS: Record<BotArchetype, string> = {
  warlord: "text-red-400",
  diplomat: "text-blue-400",
  merchant: "text-yellow-400",
  schemer: "text-purple-400",
  turtle: "text-green-400",
  blitzkrieg: "text-orange-400",
  tech_rush: "text-cyan-400",
  opportunist: "text-gray-400",
};

export function MessageInbox({
  gameId,
  playerId,
  onUnreadCountChange,
}: MessageInboxProps) {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<StoredMessage | null>(
    null
  );

  // Fetch inbox data
  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxResult, summaryResult] = await Promise.all([
        getInboxAction(gameId, playerId, { unreadOnly: showUnreadOnly }),
        getInboxSummaryAction(gameId, playerId),
      ]);

      if (inboxResult.success) {
        setMessages(inboxResult.data);
      }
      if (summaryResult.success) {
        setSummary(summaryResult.data);
        onUnreadCountChange?.(summaryResult.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch inbox:", error);
    } finally {
      setLoading(false);
    }
  }, [gameId, playerId, showUnreadOnly, onUnreadCountChange]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // Mark single message as read
  const handleMarkRead = async (message: StoredMessage) => {
    if (message.isRead) return;

    const result = await markMessageReadAction(message.id);
    if (result.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
      );
      if (summary) {
        const newUnread = summary.unreadCount - 1;
        setSummary({ ...summary, unreadCount: newUnread, directUnread: newUnread });
        onUnreadCountChange?.(newUnread);
      }
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const result = await markAllMessagesReadAction(gameId, playerId);
    if (result.success) {
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      if (summary) {
        setSummary({ ...summary, unreadCount: 0, directUnread: 0 });
        onUnreadCountChange?.(0);
      }
    }
  };

  // Open message detail
  const handleSelectMessage = async (message: StoredMessage) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      await handleMarkRead(message);
    }
  };

  if (loading) {
    return (
      <div className="lcars-panel animate-pulse">
        <div className="h-64 bg-gray-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="lcars-panel">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-display text-lcars-amber">
          Inbox
          {summary && summary.unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 text-sm bg-lcars-blue rounded-full">
              {summary.unreadCount} unread
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-3 py-1 text-sm rounded ${
              showUnreadOnly
                ? "bg-lcars-amber text-black"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {showUnreadOnly ? "Show All" : "Unread Only"}
          </button>
          {summary && summary.unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {showUnreadOnly ? "No unread messages" : "No messages yet"}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <MessageListItem
              key={message.id}
              message={message}
              isSelected={selectedMessage?.id === message.id}
              onClick={() => handleSelectMessage(message)}
            />
          ))}
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <MessageDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Message List Item
// =============================================================================

function MessageListItem({
  message,
  isSelected,
  onClick,
}: {
  message: StoredMessage;
  isSelected: boolean;
  onClick: () => void;
}) {
  const archetypeColor = message.senderArchetype
    ? ARCHETYPE_COLORS[message.senderArchetype]
    : "text-gray-400";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded transition-colors ${
        isSelected
          ? "bg-lcars-amber/20 border border-lcars-amber"
          : message.isRead
          ? "bg-gray-800/50 hover:bg-gray-700/50"
          : "bg-gray-800 hover:bg-gray-700 border-l-4 border-lcars-blue"
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className={`font-medium ${archetypeColor}`}>
          {message.senderName || "Unknown"}
        </span>
        <span className="text-xs text-gray-500">Turn {message.turn}</span>
      </div>
      <p className="text-sm text-gray-300 line-clamp-2">{message.content}</p>
    </button>
  );
}

// =============================================================================
// Message Detail
// =============================================================================

function MessageDetail({
  message,
  onClose,
}: {
  message: StoredMessage;
  onClose: () => void;
}) {
  const archetypeColor = message.senderArchetype
    ? ARCHETYPE_COLORS[message.senderArchetype]
    : "text-gray-400";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-lcars-amber rounded-lg max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className={`text-lg font-display ${archetypeColor}`}>
              {message.senderName || "Unknown Empire"}
            </h3>
            <p className="text-sm text-gray-500">
              Turn {message.turn} - {message.senderArchetype || "Unknown"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Close message"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded p-4 mb-4">
          <p className="text-gray-200 whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Received: {new Date(message.createdAt).toLocaleString()}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-lcars-amber text-black rounded hover:bg-lcars-amber/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
