import Link from "next/link";

const navItems = [
  { href: "/game", label: "Dashboard" },
  { href: "/game/planets", label: "Planets" },
  { href: "/game/military", label: "Military" },
  { href: "/game/research", label: "Research" },
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
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-lcars-amber/30 px-4 py-2 text-center text-sm text-gray-500">
        Turn 1 | Credits: 100,000 | Networth: 0
      </footer>
    </div>
  );
}
