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
import { ActionIcons } from "@/lib/theme/icons";
import { Home, Map, Menu, X, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const MENU_SECTIONS = {
  primary: [
    { href: "/game", label: UI_LABELS.dashboard, icon: Home },
    { href: "/game/starmap", label: UI_LABELS.galaxyMap, icon: Map },
  ] as MenuItem[],
  actions: [
    { href: "/game/military", label: UI_LABELS.military, icon: ActionIcons.military },
    { href: "/game/sectors", label: UI_LABELS.planets, icon: ActionIcons.planets },
    { href: "/game/combat", label: UI_LABELS.combat, icon: ActionIcons.combat },
    { href: "/game/diplomacy", label: UI_LABELS.diplomacy, icon: ActionIcons.diplomacy },
    { href: "/game/market", label: UI_LABELS.market, icon: ActionIcons.market },
    { href: "/game/covert", label: UI_LABELS.covert, icon: ActionIcons.covert },
    { href: "/game/research", label: UI_LABELS.research, icon: ActionIcons.research },
    { href: "/game/crafting", label: UI_LABELS.crafting, icon: ActionIcons.crafting },
  ] as MenuItem[],
  communication: [
    { href: "/game/messages", label: UI_LABELS.messages, icon: ActionIcons.messages },
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
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
              <LogOut className="w-4 h-4" />
              <span>Exit to Main Menu</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const IconComponent = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
    >
      <IconComponent className="w-4 h-4" />
      <span>{item.label}</span>
    </Link>
  );
}

export default HeaderMenu;
