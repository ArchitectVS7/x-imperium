"use client";

/**
 * Game Error Boundary
 *
 * Next.js App Router error boundary for the game routes.
 * Catches errors in game pages and displays a user-friendly recovery UI.
 */

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GameError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development, or to error tracking service in production
    console.error("Game error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-lg border border-red-500/50 p-6 text-center">
        <div className="text-red-500 text-5xl mb-4">!</div>
        <h2 className="text-xl font-bold text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-400 mb-6">
          An error occurred while loading the game. This has been logged and
          we&apos;ll look into it.
        </p>

        {/* Error details in development */}
        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 text-left">
            <summary className="text-gray-500 cursor-pointer hover:text-gray-400">
              Technical details
            </summary>
            <pre className="mt-2 p-3 bg-gray-800 rounded text-xs text-red-400 overflow-auto max-h-32">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try again
          </button>
          <a
            href="/game"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Return to Dashboard
          </a>
        </div>

        <p className="mt-6 text-xs text-gray-600">
          If this keeps happening, try refreshing the page or starting a new
          game.
        </p>
      </div>
    </div>
  );
}
