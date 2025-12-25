import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MarketPanel } from "@/components/game/market/MarketPanel";

export default async function MarketPage() {
  const cookieStore = await cookies();
  const gameId = cookieStore.get("gameId")?.value;
  const empireId = cookieStore.get("empireId")?.value;

  if (!gameId || !empireId) {
    redirect("/game");
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Market</h1>
      <MarketPanel gameId={gameId} empireId={empireId} />
    </div>
  );
}
