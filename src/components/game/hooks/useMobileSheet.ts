"use client";

import { useState, useCallback } from "react";

/**
 * Hook for managing the mobile action sheet state.
 *
 * Controls the visibility of the bottom action sheet on mobile devices.
 */
export function useMobileSheet() {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  /**
   * Open the mobile action sheet.
   */
  const openMobileSheet = useCallback(() => {
    setMobileSheetOpen(true);
  }, []);

  /**
   * Close the mobile action sheet.
   */
  const closeMobileSheet = useCallback(() => {
    setMobileSheetOpen(false);
  }, []);

  /**
   * Toggle the mobile action sheet.
   */
  const toggleMobileSheet = useCallback(() => {
    setMobileSheetOpen((prev) => !prev);
  }, []);

  return {
    mobileSheetOpen,
    setMobileSheetOpen,
    openMobileSheet,
    closeMobileSheet,
    toggleMobileSheet,
  };
}
