"use client";

/**
 * LCARS Button Component
 *
 * Styled button with optional sound effects on click and hover.
 * Follows the LCARS design system aesthetic.
 */

import { ButtonHTMLAttributes } from "react";
import { useAudio } from "@/components/providers/AudioProvider";

interface LCARSButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  soundOnClick?: boolean;
  soundOnHover?: boolean;
}

export function LCARSButton({
  variant = "primary",
  size = "md",
  soundOnClick = true,
  soundOnHover = false,
  className = "",
  onClick,
  onMouseEnter,
  children,
  disabled,
  ...props
}: LCARSButtonProps) {
  const { play } = useAudio();

  const variantClasses = {
    primary: "bg-lcars-amber text-gray-950 hover:bg-lcars-amber/90",
    secondary: "bg-lcars-lavender text-gray-950 hover:bg-lcars-lavender/90",
    danger: "bg-lcars-salmon text-gray-950 hover:bg-lcars-salmon/90",
    ghost: "bg-transparent text-lcars-amber border border-lcars-amber hover:bg-lcars-amber/10",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-2",
    lg: "px-8 py-3 text-lg",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundOnClick) {
      play("click");
    }
    onClick?.(e);
  };

  const handleHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && soundOnHover) {
      play("hover");
    }
    onMouseEnter?.(e);
  };

  return (
    <button
      className={`
        font-semibold rounded
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      onClick={handleClick}
      onMouseEnter={handleHover}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
