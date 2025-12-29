"use client";

/**
 * Game Header
 *
 * Compact header with logo, status indicators, and menu.
 * Replaces the full nav bar for a cleaner, boardgame-style layout.
 */

import Link from "next/link";
import { CompactHeaderStatus } from "./CompactHeaderStatus";
import { HeaderMenu } from "./HeaderMenu";
import { THEME_INFO } from "@/lib/theme/names";

interface GameHeaderProps {
  credits?: number;
  foodStatus?: "surplus" | "stable" | "deficit" | "critical";
  population?: number;
  currentTurn?: number;
  turnLimit?: number;
}

export function GameHeader({
  credits = 0,
  foodStatus = "stable",
  population = 0,
  currentTurn = 1,
  turnLimit = 200,
}: GameHeaderProps) {
  return (
    <header
      className="bg-gray-900 border-b border-lcars-amber/30 px-4 py-2"
      data-testid="game-header"
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/game"
          className="text-xl font-display text-lcars-amber hover:text-lcars-amber/80 transition-colors"
        >
          {THEME_INFO.name.toUpperCase()}
        </Link>

        {/* Status indicators (hidden on mobile) */}
        <CompactHeaderStatus
          credits={credits}
          foodStatus={foodStatus}
          population={population}
          currentTurn={currentTurn}
          turnLimit={turnLimit}
        />

        {/* Menu button */}
        <HeaderMenu />
      </div>
    </header>
  );
}

export default GameHeader;
