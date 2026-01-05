"use client";

/**
 * Mobile Action Sheet
 *
 * A bottom sheet that slides up to show the full action panel.
 * Contains all the TurnOrderPanel content in a mobile-friendly format.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { UI_LABELS, GAME_TERMS, RESOURCE_NAMES } from "@/lib/theme/names";
import { ActionIcons } from "@/lib/theme/icons";
import { Shield, Home, Map, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTurn: number;
  turnLimit: number;
  foodStatus: "surplus" | "stable" | "deficit" | "critical";
  armyStrength: "strong" | "moderate" | "weak" | "critical";
  threatCount: number;
  unreadMessages?: number;
  protectionTurnsLeft?: number;
}

interface ActionItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const ACTIONS: ActionItem[] = [
  { id: "military", label: UI_LABELS.military, href: "/game/military", icon: ActionIcons.military },
  { id: "sectors", label: UI_LABELS.planets, href: "/game/sectors", icon: ActionIcons.planets },
  { id: "combat", label: UI_LABELS.combat, href: "/game/combat", icon: ActionIcons.combat },
  { id: "diplomacy", label: UI_LABELS.diplomacy, href: "/game/diplomacy", icon: ActionIcons.diplomacy },
  { id: "market", label: UI_LABELS.market, href: "/game/market", icon: ActionIcons.market },
  { id: "covert", label: UI_LABELS.covert, href: "/game/covert", icon: ActionIcons.covert },
  { id: "crafting", label: UI_LABELS.crafting, href: "/game/crafting", icon: ActionIcons.crafting },
  { id: "research", label: UI_LABELS.research, href: "/game/research", icon: ActionIcons.research },
  { id: "starmap", label: "Starmap", href: "/game/starmap", icon: ActionIcons.starmap },
];

const STATUS_STYLES = {
  surplus: { color: "text-green-400", label: "Surplus" },
  stable: { color: "text-blue-400", label: "Stable" },
  deficit: { color: "text-yellow-400", label: "Deficit" },
  critical: { color: "text-red-400", label: "Critical" },
  strong: { color: "text-green-400", label: "Strong" },
  moderate: { color: "text-blue-400", label: "Moderate" },
  weak: { color: "text-yellow-400", label: "Weak" },
};

export function MobileActionSheet({
  isOpen,
  onClose,
  currentTurn,
  turnLimit,
  foodStatus,
  armyStrength,
  threatCount,
  unreadMessages = 0,
  protectionTurnsLeft,
}: MobileActionSheetProps) {
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Animate in/out
  useEffect(() => {
    if (!sheetRef.current || !backdropRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (isOpen) {
      // Show
      if (prefersReducedMotion) {
        gsap.set(sheetRef.current, { y: 0 });
        gsap.set(backdropRef.current, { opacity: 1, display: "block" });
      } else {
        gsap.set(backdropRef.current, { display: "block" });
        gsap.to(backdropRef.current, { opacity: 1, duration: 0.2 });
        gsap.fromTo(
          sheetRef.current,
          { y: "100%" },
          { y: 0, duration: 0.3, ease: "power2.out" }
        );
      }
    } else {
      // Hide
      if (prefersReducedMotion) {
        gsap.set(sheetRef.current, { y: "100%" });
        gsap.set(backdropRef.current, { opacity: 0, display: "none" });
      } else {
        gsap.to(sheetRef.current, { y: "100%", duration: 0.2, ease: "power2.in" });
        gsap.to(backdropRef.current, {
          opacity: 0,
          duration: 0.2,
          onComplete: () => {
            if (backdropRef.current) {
              gsap.set(backdropRef.current, { display: "none" });
            }
          },
        });
      }
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const foodStyle = STATUS_STYLES[foodStatus];
  const armyStyle = STATUS_STYLES[armyStrength];

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="lg:hidden fixed inset-0 bg-black/60 z-40"
        style={{ display: "none", opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col"
        style={{ transform: "translateY(100%)" }}
        data-testid="mobile-action-sheet"
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 uppercase">Turn</div>
              <div className="text-2xl font-display text-lcars-amber">
                {currentTurn} <span className="text-gray-500 text-base">/ {turnLimit}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {/* Protection notice */}
          {protectionTurnsLeft && protectionTurnsLeft > 0 && (
            <div className="mt-2 text-xs text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded inline-flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Protected for {protectionTurnsLeft} turns
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Actions Grid */}
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase mb-3">Actions</div>
            <div className="grid grid-cols-4 gap-3">
              {ACTIONS.map((action) => {
                const isCurrent = pathname.startsWith(action.href);
                const IconComponent = action.icon;
                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    onClick={onClose}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                      isCurrent
                        ? "bg-lcars-amber/20 border border-lcars-amber/50"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 ${isCurrent ? "text-lcars-amber" : "text-gray-400"}`} />
                    <span className={`text-xs ${isCurrent ? "text-lcars-amber" : "text-gray-300"}`}>
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Messages link */}
            <Link
              href="/game/messages"
              onClick={onClose}
              className={`flex items-center justify-between p-3 mt-3 rounded-lg ${
                pathname === "/game/messages"
                  ? "bg-lcars-amber/20 border border-lcars-amber/50"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <ActionIcons.messages className={`w-5 h-5 ${pathname === "/game/messages" ? "text-lcars-amber" : "text-gray-400"}`} />
                <span className={pathname === "/game/messages" ? "text-lcars-amber" : "text-gray-300"}>
                  {UI_LABELS.messages}
                </span>
              </div>
              {unreadMessages > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {unreadMessages}
                </span>
              )}
            </Link>
          </div>

          {/* Quick Status */}
          <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-gray-500 uppercase mb-3">Status</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">{RESOURCE_NAMES.food}</div>
                <div className={`text-sm font-medium ${foodStyle.color}`}>{foodStyle.label}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">{UI_LABELS.military}</div>
                <div className={`text-sm font-medium ${armyStyle.color}`}>{armyStyle.label}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">Threats</div>
                <div className={`text-sm font-medium ${
                  threatCount > 3 ? "text-red-400" : threatCount > 0 ? "text-yellow-400" : "text-gray-400"
                }`}>
                  {threatCount} {threatCount === 1 ? GAME_TERMS.empire : GAME_TERMS.empires}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <div className="p-4 border-t border-gray-800">
            <Link
              href="/game"
              onClick={onClose}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">{UI_LABELS.dashboard}</span>
            </Link>
            <Link
              href="/game/starmap"
              onClick={onClose}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mt-2"
            >
              <Map className="w-4 h-4" />
              <span className="text-sm">{UI_LABELS.galaxyMap}</span>
            </Link>
          </div>
        </div>

        {/* Safe area padding for phones with home indicators */}
        <div className="h-6 bg-gray-900" />
      </div>
    </>
  );
}

export default MobileActionSheet;
