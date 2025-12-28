"use client";

/**
 * Animated Counter Component
 *
 * Uses GSAP to smoothly animate number transitions when values change.
 * Great for credits, resources, networth, etc.
 */

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (val: number) => string;
}

export function AnimatedCounter({
  value,
  duration = 0.8,
  className = "",
  formatFn = (val) => val.toLocaleString(),
}: AnimatedCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      valueRef.current = value;
      return;
    }

    if (counterRef.current && valueRef.current !== value) {
      const obj = { val: valueRef.current };
      gsap.to(obj, {
        val: value,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          if (counterRef.current) {
            counterRef.current.textContent = formatFn(Math.round(obj.val));
          }
        },
      });
      valueRef.current = value;
    }
  }, [value, duration, formatFn]);

  return (
    <span ref={counterRef} className={className}>
      {formatFn(value)}
    </span>
  );
}
