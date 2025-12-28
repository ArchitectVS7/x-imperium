"use client";

/**
 * Alert Badge Component
 *
 * A pulsing badge for notifications and alerts.
 * Uses LCARS color scheme with optional pulse animation.
 */

interface AlertBadgeProps {
  count?: number;
  variant?: "default" | "alert" | "success";
  pulse?: boolean;
  className?: string;
}

export function AlertBadge({
  count,
  variant = "default",
  pulse = true,
  className = "",
}: AlertBadgeProps) {
  const variantClasses = {
    default: "bg-lcars-amber",
    alert: "bg-lcars-salmon",
    success: "bg-lcars-mint",
  };

  const pulseClasses = {
    default: "lcars-pulse",
    alert: "lcars-pulse-alert",
    success: "lcars-pulse-success",
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[1.5rem] h-6 px-2 rounded-full
        text-xs font-bold text-gray-950
        ${variantClasses[variant]}
        ${pulse ? pulseClasses[variant] : ""}
        ${className}
      `}
    >
      {count ?? "!"}
    </span>
  );
}
