"use client";

import { useState } from "react";
import { ConfirmationModal } from "./ConfirmationModal";

export function ClearDataButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      // Clear both games and cookies
      const [gamesResponse, cookiesResponse] = await Promise.all([
        fetch("/api/admin/clear-games", { method: "POST" }),
        fetch("/api/admin/clear-cookies", { method: "POST" }),
      ]);

      if (gamesResponse.ok && cookiesResponse.ok) {
        // Force a hard refresh to clear all state
        window.location.href = "/game?newGame=true";
      } else {
        alert("Failed to clear data. Check console for details.");
      }
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert("Failed to clear data. Check console for details.");
    } finally {
      setIsClearing(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirmModal(true)}
        disabled={isClearing}
        className="text-sm text-red-400 hover:text-red-300 underline disabled:opacity-50"
        type="button"
      >
        {isClearing ? "Clearing..." : "Clear corrupted data"}
      </button>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleClear}
        title="Clear All Game Data"
        message="Are you sure you want to clear all game data and start fresh?"
        details="This action cannot be undone. All saved games, progress, and settings will be permanently deleted."
        variant="danger"
        confirmText="Clear Data"
        cancelText="Cancel"
      />
    </>
  );
}
