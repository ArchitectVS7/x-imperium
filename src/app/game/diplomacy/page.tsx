import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DiplomacyPanel } from "@/components/game/diplomacy/DiplomacyPanel";
import { ProposeTreatyPanel } from "@/components/game/diplomacy/ProposeTreatyPanel";

export default async function DiplomacyPage() {
  const cookieStore = await cookies();
  const gameId = cookieStore.get("gameId")?.value;
  const empireId = cookieStore.get("empireId")?.value;

  if (!gameId || !empireId) {
    redirect("/game");
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-display text-lcars-amber mb-8">Diplomacy</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DiplomacyPanel gameId={gameId} empireId={empireId} />
        <ProposeTreatyPanel gameId={gameId} empireId={empireId} />
      </div>
    </div>
  );
}
