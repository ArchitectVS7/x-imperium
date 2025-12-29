import { GameShell } from "@/components/game/GameShell";
import { GameHeader } from "@/components/game/GameHeader";
import { getGameLayoutDataAction } from "@/app/actions/turn-actions";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch initial layout data on server
  const layoutData = await getGameLayoutDataAction();

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header - Compact with status indicators and menu */}
      <GameHeader
        credits={layoutData?.credits}
        foodStatus={layoutData?.foodStatus}
        population={layoutData?.population}
        currentTurn={layoutData?.currentTurn}
        turnLimit={layoutData?.turnLimit}
      />

      {/* Main content with GameShell wrapper */}
      <main className="flex-1 overflow-hidden">
        <GameShell initialLayoutData={layoutData}>
          <div className="p-4 md:p-6 h-full overflow-y-auto">
            {children}
          </div>
        </GameShell>
      </main>
    </div>
  );
}
