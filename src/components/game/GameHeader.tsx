"use client";

/**
 * Game Header
 *
 * Compact header with logo, status indicators, and menu.
 * Replaces the full nav bar for a cleaner, boardgame-style layout.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map } from "lucide-react";
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
  const pathname = usePathname();
  const isOnStarmap = pathname === "/game/starmap";

  return (
    <>
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

      {/* Floating Return to Map button - only show when not on starmap */}
      {!isOnStarmap && (
        <Link
          href="/game/starmap"
          className="fixed bottom-6 right-6 z-50 bg-lcars-amber text-gray-900 px-4 py-3 rounded-lg shadow-2xl hover:scale-105 hover:shadow-lcars-amber/50 transition-all flex items-center gap-2 font-display"
          data-testid="return-to-map-button"
        >
          <Map className="w-5 h-5" />
          <span className="hidden sm:inline">STAR MAP</span>
        </Link>
      )}
    </>
  );
}

export default GameHeader;
