"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClearDataButton() {
  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all game data? This cannot be undone.")) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch("/api/admin/clear-games", {
        method: "POST",
      });

      if (response.ok) {
        // Refresh the page to show new game form
        router.refresh();
      } else {
        alert("Failed to clear data. Check console for details.");
      }
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert("Failed to clear data. Check console for details.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <button
      onClick={handleClear}
      disabled={isClearing}
      className="text-sm text-red-400 hover:text-red-300 underline disabled:opacity-50"
      type="button"
    >
      {isClearing ? "Clearing..." : "Clear corrupted data"}
    </button>
  );
}
