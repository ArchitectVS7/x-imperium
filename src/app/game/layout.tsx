import Link from "next/link";
import { GameFooter } from "@/components/game/GameFooter";
import { SyndicateNavItem } from "@/components/game/navigation";

const navItems = [
  { href: "/game", label: "Dashboard" },
  { href: "/game/planets", label: "Planets" },
  { href: "/game/military", label: "Military" },
  { href: "/game/research", label: "Research" },
  { href: "/game/crafting", label: "Crafting" },
  { href: "/game/combat", label: "Combat" },
  { href: "/game/starmap", label: "Starmap" },
  { href: "/game/diplomacy", label: "Diplomacy" },
  { href: "/game/market", label: "Market" },
  { href: "/game/covert", label: "Covert" },
  { href: "/game/messages", label: "Messages" },
];

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-lcars-amber/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-display text-lcars-amber">
            X-IMPERIUM
          </Link>
          <nav className="hidden md:flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1 text-sm text-gray-300 hover:text-lcars-amber transition-colors"
              >
                {item.label}
              </Link>
            ))}
            {/* Conditional Syndicate nav - only shows when player has access */}
            <SyndicateNavItem />
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8">{children}</main>

      {/* Footer */}
      <GameFooter />
    </div>
  );
}
