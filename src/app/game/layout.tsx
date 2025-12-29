import Link from "next/link";
import { GameFooter } from "@/components/game/GameFooter";
import { SyndicateNavItem } from "@/components/game/navigation";
import { GameShell } from "@/components/game/GameShell";
import { getTurnOrderPanelDataAction } from "@/app/actions/turn-actions";
import { UI_LABELS } from "@/lib/theme/names";

const navItems = [
  { href: "/game", label: UI_LABELS.dashboard },
  { href: "/game/starmap", label: UI_LABELS.galaxyMap },
  { href: "/game/military", label: UI_LABELS.military },
  { href: "/game/planets", label: UI_LABELS.planets },
  { href: "/game/combat", label: UI_LABELS.combat },
  { href: "/game/diplomacy", label: UI_LABELS.diplomacy },
  { href: "/game/market", label: UI_LABELS.market },
  { href: "/game/covert", label: UI_LABELS.covert },
  { href: "/game/research", label: UI_LABELS.research },
  { href: "/game/crafting", label: UI_LABELS.crafting },
  { href: "/game/messages", label: UI_LABELS.messages },
];

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch initial panel data on server
  const panelData = await getTurnOrderPanelDataAction();

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header - Compact */}
      <header className="bg-gray-900 border-b border-lcars-amber/30 px-4 py-2">
        <div className="flex items-center justify-between">
          <Link href="/game" className="text-xl font-display text-lcars-amber">
            X-IMPERIUM
          </Link>
          <nav className="hidden lg:flex gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2 py-1 text-xs text-gray-300 hover:text-lcars-amber hover:bg-gray-800/50 rounded transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <SyndicateNavItem />
          </nav>
          {/* Mobile menu button placeholder */}
          <button className="lg:hidden text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content with GameShell wrapper */}
      <main className="flex-1 overflow-hidden">
        <GameShell initialPanelData={panelData}>
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            {children}
          </div>
        </GameShell>
      </main>

      {/* Footer - Compact status bar */}
      <GameFooter />
    </div>
  );
}
