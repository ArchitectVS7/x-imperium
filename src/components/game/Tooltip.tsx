"use client";

/**
 * Tooltip Component
 *
 * A reusable tooltip for explaining game mechanics to new players.
 * Shows on hover with a small delay to avoid accidental triggers.
 */

import { useState, useRef, useEffect, ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  maxWidth = 280,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 ${positionClasses[position]}`}
          style={{ maxWidth }}
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 text-sm text-gray-200">
            {content}
          </div>
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * InfoIcon Component
 *
 * A small info icon that shows a tooltip on hover.
 * Perfect for adding explanations to game mechanics.
 */
interface InfoIconProps {
  tooltip: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function InfoIcon({ tooltip, position = "top" }: InfoIconProps) {
  return (
    <Tooltip content={tooltip} position={position}>
      <span
        className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-full cursor-help hover:text-gray-300 hover:border-gray-600 transition-colors"
        aria-label="More information"
      >
        ?
      </span>
    </Tooltip>
  );
}

/**
 * Game Mechanic Tooltips
 *
 * Pre-defined tooltips for common game mechanics.
 * These are functions that return JSX to avoid Next.js Server Component bundler issues.
 */
export function CivilStatusTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Civil Status</strong>
      <p className="mt-1">
        Your population&apos;s happiness affects your income. Happy citizens (Ecstatic)
        give 4x income, while unhappy ones (Revolting) give only 0.25x.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Keep your people fed and avoid overpopulation!
      </p>
    </div>
  );
}

export function ProtectionTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Protection Period</strong>
      <p className="mt-1">
        For the first 20 turns, your empire is protected from attacks.
        Use this time to build up your economy and military!
      </p>
    </div>
  );
}

export function NetworthTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Networth</strong>
      <p className="mt-1">
        Your empire&apos;s total value. Calculated from sectors, military units,
        and special assets. Win an Economic Victory by having 1.5x the
        networth of the second-place empire!
      </p>
    </div>
  );
}

export function ResearchTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Research Level</strong>
      <p className="mt-1">
        Higher research levels unlock advanced military units:
      </p>
      <ul className="mt-1 text-xs space-y-0.5">
        <li>Level 2: Light Cruisers</li>
        <li>Level 4: Heavy Cruisers</li>
        <li>Level 6: Carriers</li>
      </ul>
      <p className="mt-1 text-gray-400 text-xs">
        Build Research sectors to generate research points!
      </p>
    </div>
  );
}

export function FoodTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Food</strong>
      <p className="mt-1">
        Each citizen consumes 0.05 food per turn. If you run out of food,
        your population will starve and civil status will drop!
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Food sectors produce 160 food/turn each.
      </p>
    </div>
  );
}

export function CarriersTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Carriers</strong>
      <p className="mt-1">
        Carriers transport soldiers to enemy sectors. Each carrier holds
        100 soldiers. Without carriers, your soldiers can&apos;t participate
        in ground combat!
      </p>
    </div>
  );
}

export function CombatPhasesTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Combat Phases</strong>
      <ol className="mt-1 text-xs space-y-1 list-decimal list-inside">
        <li><strong>Space:</strong> Cruisers fight for space superiority</li>
        <li><strong>Orbital:</strong> Fighters vs Stations for orbital control</li>
        <li><strong>Ground:</strong> Soldiers capture the sector</li>
      </ol>
      <p className="mt-1 text-gray-400 text-xs">
        You must win all 3 phases to capture a sector!
      </p>
    </div>
  );
}

export function SyndicateTooltip() {
  return (
    <div>
      <strong className="text-lcars-purple">The Galactic Syndicate</strong>
      <p className="mt-1">
        A shadowy criminal organization. Complete contracts to build trust
        and gain access to the Black Market&apos;s exclusive items.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Warning: Trust decays over time without activity!
      </p>
    </div>
  );
}

export function CreditsTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Credits</strong>
      <p className="mt-1">
        Your treasury. Credits fund military purchases, sector acquisitions,
        and unit maintenance.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Earn credits from residential and commercial sectors.
      </p>
    </div>
  );
}

export function OreTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Ore</strong>
      <p className="mt-1">
        Raw material used for building military units and structures.
        Mined from industrial sectors.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Industrial sectors produce 100 ore/turn each.
      </p>
    </div>
  );
}

export function PetroleumTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Petroleum</strong>
      <p className="mt-1">
        Fuel for advanced military units. Required for cruisers and carriers.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Petroleum sectors produce 80 petroleum/turn each.
      </p>
    </div>
  );
}

export function PopulationTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Population</strong>
      <p className="mt-1">
        Your citizens. Population grows 2% per turn when fed, but starves
        if food runs out. More population means more production!
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Each citizen consumes 0.05 food per turn.
      </p>
    </div>
  );
}

export function SectorsTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Sectors</strong>
      <p className="mt-1">
        Your territory. Different sector types produce different resources.
        Capture enemy sectors through combat or buy unclaimed ones.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Control 60% of all sectors to win by Conquest!
      </p>
    </div>
  );
}

export function MilitaryPowerTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Military Power</strong>
      <p className="mt-1">
        Combined strength of all your military units. Higher power means
        better chances in combat.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Soldiers, fighters, cruisers, and carriers all contribute.
      </p>
    </div>
  );
}

export function RankTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Rank</strong>
      <p className="mt-1">
        Your position among all empires, based on Renown (networth).
        #1 is the most powerful empire in the galaxy.
      </p>
    </div>
  );
}

export function TurnTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Turn Progress</strong>
      <p className="mt-1">
        Current turn / total turns in the game. When the turn limit is reached,
        the empire with the highest score wins by Survival.
      </p>
      <p className="mt-1 text-gray-400 text-xs">
        Press SPACE to end your turn.
      </p>
    </div>
  );
}

export function FoodStatusTooltip() {
  return (
    <div>
      <strong className="text-lcars-amber">Food Status</strong>
      <ul className="mt-1 text-xs space-y-0.5">
        <li><span className="text-green-400">Surplus</span>: Producing more than consuming</li>
        <li><span className="text-blue-400">Stable</span>: Balanced food supply</li>
        <li><span className="text-yellow-400">Deficit</span>: Running low on food</li>
        <li><span className="text-red-400">Critical</span>: Starvation imminent!</li>
      </ul>
    </div>
  );
}

// Note: Tooltip content functions are exported above for use in components.
// Import them directly (e.g., CivilStatusTooltip) rather than using an object
// to avoid Next.js Server Components bundler issues with JSX objects.
