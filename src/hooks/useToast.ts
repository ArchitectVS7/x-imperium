/**
 * useToast Hook
 *
 * Provides toast notification functionality with auto-dismiss.
 * Extracted from GameShell for reusability.
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface ToastState {
  message: string;
  type: "error" | "success" | "info";
}

export interface UseToastOptions {
  /** Duration in ms before auto-dismiss (default: 5000) */
  duration?: number;
}

export interface UseToastReturn {
  /** Current toast state, or null if no toast is showing */
  toast: ToastState | null;
  /** Show a toast notification */
  showToast: (message: string, type?: ToastState["type"]) => void;
  /** Dismiss the current toast */
  dismissToast: () => void;
}

/**
 * Hook for managing toast notifications with auto-dismiss.
 *
 * @example
 * ```tsx
 * const { toast, showToast, dismissToast } = useToast({ duration: 3000 });
 *
 * // Show an error toast
 * showToast("Something went wrong!", "error");
 *
 * // Show a success toast
 * showToast("Operation completed!", "success");
 * ```
 */
export function useToast(options: UseToastOptions = {}): UseToastReturn {
  const { duration = 5000 } = options;

  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "error") => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set the new toast
      setToast({ message, type });

      // Auto-dismiss after duration
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, duration);
    },
    [duration]
  );

  return { toast, showToast, dismissToast };
}
