"use client";

/**
 * Client-Side Providers Wrapper
 *
 * Wraps all client-side context providers for use in the root layout.
 * This allows server components to render while providing client contexts.
 */

import { ReactNode } from "react";
import { AudioProvider } from "./AudioProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <AudioProvider>{children}</AudioProvider>;
}
