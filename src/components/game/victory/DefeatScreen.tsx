"use client";

/**
 * Defeat Screen Component
 *
 * Displays when the player is defeated:
 * - Defeat type and message
 * - What went wrong
 * - Try Again button
 */

interface DefeatScreenProps {
  defeatType: "bankruptcy" | "elimination" | "civil_collapse";
  empireName: string;
  message: string;
  turn: number;
  onTryAgain: () => void;
}

const DEFEAT_TITLES: Record<string, string> = {
  bankruptcy: "BANKRUPTCY",
  elimination: "ELIMINATED",
  civil_collapse: "CIVIL WAR",
};

const DEFEAT_DESCRIPTIONS: Record<string, string> = {
  bankruptcy:
    "Your empire could not pay its maintenance costs. Economic mismanagement led to your downfall.",
  elimination:
    "All your sectors have been conquered. Your empire has been wiped from the galaxy.",
  civil_collapse:
    "Three consecutive turns of revolting citizens led to civil war. Your government has collapsed.",
};

export function DefeatScreen({
  defeatType,
  empireName,
  message,
  turn,
  onTryAgain,
}: DefeatScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-red-900/20 to-gray-900" data-testid="defeat-screen">
      <div className="max-w-2xl mx-auto text-center p-8">
        {/* Defeat Icon */}
        <div className="text-8xl mb-6 opacity-60">\u2620\ufe0f</div>

        {/* Defeat Title */}
        <h1 className="text-5xl font-display text-red-500 mb-4" data-testid="defeat-title">
          {DEFEAT_TITLES[defeatType]}
        </h1>

        {/* Empire Name */}
        <h2 className="text-3xl font-display text-gray-400 mb-6 line-through">
          {empireName}
        </h2>

        {/* Defeat Message */}
        <p className="text-xl text-gray-300 mb-4">{message}</p>

        {/* Explanation */}
        <p className="text-gray-400 mb-8">{DEFEAT_DESCRIPTIONS[defeatType]}</p>

        {/* Stats */}
        <div className="lcars-panel mb-8">
          <div className="text-center">
            <span className="text-gray-500 text-sm">Survived Until</span>
            <p className="text-3xl text-gray-200">Turn {turn}</p>
          </div>
        </div>

        {/* Tips */}
        <div className="text-left mb-8 p-4 bg-gray-800/50 rounded">
          <h3 className="text-lg font-display text-lcars-amber mb-2">
            Tips for Next Time
          </h3>
          {defeatType === "bankruptcy" && (
            <ul className="text-sm text-gray-400 space-y-1">
              <li>- Do not expand faster than your income can support</li>
              <li>- Build tourism sectors for steady credit income</li>
              <li>- Release unprofitable sectors before bankruptcy</li>
            </ul>
          )}
          {defeatType === "elimination" && (
            <ul className="text-sm text-gray-400 space-y-1">
              <li>- Build military units to defend your sectors</li>
              <li>- Do not provoke stronger empires early</li>
              <li>- Form alliances when you are weak (coming in M7)</li>
            </ul>
          )}
          {defeatType === "civil_collapse" && (
            <ul className="text-sm text-gray-400 space-y-1">
              <li>- Keep your population fed to maintain civil status</li>
              <li>- Build education sectors for status bonus</li>
              <li>- Do not let civil status reach revolting for 3 turns</li>
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onTryAgain}
            className="px-8 py-3 bg-lcars-orange hover:bg-lcars-orange/80 text-black font-medium rounded transition-colors text-lg"
            data-testid="try-again-button"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors text-lg"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
