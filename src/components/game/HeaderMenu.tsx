"use client";

/**
 * Header Menu
 *
 * Dropdown menu for settings, help, and navigation.
 * Replaces the full nav bar for a cleaner header.
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { UI_LABELS } from "@/lib/theme/names";

interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

const MENU_SECTIONS = {
  primary: [
    { href: "/game", label: UI_LABELS.dashboard, icon: "🏠" },
    { href: "/game/starmap", label: UI_LABELS.galaxyMap, icon: "🌌" },
  ] as MenuItem[],
  actions: [
    { href: "/game/military", label: UI_LABELS.military, icon: "⚔️" },
    { href: "/game/planets", label: UI_LABELS.planets, icon: "🌍" },
    { href: "/game/combat", label: UI_LABELS.combat, icon: "💥" },
    { href: "/game/diplomacy", label: UI_LABELS.diplomacy, icon: "🤝" },
    { href: "/game/market", label: UI_LABELS.market, icon: "📊" },
    { href: "/game/covert", label: UI_LABELS.covert, icon: "🕵️" },
    { href: "/game/research", label: UI_LABELS.research, icon: "🔬" },
    { href: "/game/crafting", label: UI_LABELS.crafting, icon: "🔧" },
  ] as MenuItem[],
  communication: [
    { href: "/game/messages", label: UI_LABELS.messages, icon: "📬" },
  ] as MenuItem[],
};

export function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
    return undefined;
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-lcars-amber/30 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Primary section */}
          <div className="p-2">
            {MENU_SECTIONS.primary.map((item) => (
              <MenuLink key={item.href} item={item} onClick={() => setIsOpen(false)} />
            ))}
          </div>

          <div className="border-t border-gray-800" />

          {/* Actions section */}
          <div className="p-2">
            <div className="px-3 py-1 text-xs text-gray-500 uppercase">Actions</div>
            {MENU_SECTIONS.actions.map((item) => (
              <MenuLink key={item.href} item={item} onClick={() => setIsOpen(false)} />
            ))}
          </div>

          <div className="border-t border-gray-800" />

          {/* Communication section */}
          <div className="p-2">
            {MENU_SECTIONS.communication.map((item) => (
              <MenuLink key={item.href} item={item} onClick={() => setIsOpen(false)} />
            ))}
          </div>

          <div className="border-t border-gray-800" />

          {/* Footer links */}
          <div className="p-2 bg-gray-800/50">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <span>🚪</span>
              <span>Exit to Main Menu</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

export default HeaderMenu;
