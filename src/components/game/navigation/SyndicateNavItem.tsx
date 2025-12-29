"use client";

/**
 * Syndicate Navigation Item
 *
 * Conditionally visible navigation link for the Syndicate/Black Market.
 * Only shows when the player has been invited or has access.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSyndicateTrustAction } from "@/app/actions/syndicate-actions";

interface SyndicateNavItemProps {
  className?: string;
}

export function SyndicateNavItem({ className = "" }: SyndicateNavItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const status = await getSyndicateTrustAction();
        if (!cancelled) {
          // Show if player has received invitation or has access
          setIsVisible(
            status?.hasReceivedInvitation === true ||
              status?.hasAccess === true
          );
        }
      } catch {
        // Silently fail - just don't show the nav item
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render anything while loading or if not visible
  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <Link
      href="/game/syndicate"
      className={`px-3 py-1 text-sm text-purple-400 hover:text-purple-300 transition-colors ${className}`}
    >
      Syndicate
    </Link>
  );
}
