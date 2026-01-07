/**
 * Game Icon System
 *
 * Replaces emoji icons with professional Lucide React SVG icons.
 * Provides consistent, crisp visuals across all platforms.
 *
 * Usage:
 *   import { ResourceIcons, UnitIcons } from "@/lib/theme/icons";
 *   <ResourceIcons.credits className="w-4 h-4" />
 */

import {
  // Resources
  Coins,
  Wheat,
  Pickaxe,
  Fuel,
  FlaskConical,
  Users,
  TrendingUp,
  // Sectors
  Sprout,
  Mountain,
  Factory,
  ShoppingBag,
  Building2,
  GraduationCap,
  Landmark,
  Microscope,
  Package,
  Recycle,
  // Military
  Shield,
  Plane,
  Castle,
  Rocket,
  UserSearch,
  Star,
  Swords,
  Zap,
  Ship,
  Target,
  Skull,
  Ghost,
  // Civil Status
  Sparkles,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Flame,
  // Game Actions
  MapPin,
  Mail,
  Eye,
  Handshake,
  BarChart3,
  Settings,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  PauseCircle,
  // UI Elements
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// RESOURCE ICONS
// =============================================================================

export const ResourceIcons = {
  credits: Coins,
  food: Wheat,
  ore: Pickaxe,
  petroleum: Fuel,
  researchPoints: FlaskConical,
  population: Users,
  networth: TrendingUp,
} as const;

// =============================================================================
// SECTOR ICONS
// =============================================================================

export const SectorIcons = {
  food: Sprout,
  ore: Mountain,
  petroleum: Fuel,
  tourism: ShoppingBag,
  urban: Building2,
  education: GraduationCap,
  government: Landmark,
  research: Microscope,
  supply: Package,
  anti_pollution: Recycle,
  industrial: Factory,
} as const;

// =============================================================================
// MILITARY UNIT ICONS
// =============================================================================

export const UnitIcons = {
  soldiers: Shield,
  fighters: Plane,
  stations: Castle,
  carriers: Rocket,
  covertAgents: UserSearch,
  generals: Star,
  marines: Swords,
  interceptors: Zap,
  lightCruisers: Ship,
  defenseStations: Target,
  heavyCruisers: Swords,
  battlecruisers: Swords,
  dreadnought: Skull,
  stealthCruiser: Ghost,
} as const;

// =============================================================================
// CIVIL STATUS ICONS
// =============================================================================

export const CivilStatusIcons = {
  ecstatic: Sparkles,
  happy: Smile,
  content: Meh,
  neutral: Meh,
  unhappy: Frown,
  angry: Frown,
  rioting: Flame,
  revolting: Skull,
} as const;

// =============================================================================
// GAME ACTION ICONS
// =============================================================================

export const ActionIcons = {
  military: Swords,
  sectors: MapPin,
  combat: Target,
  diplomacy: Handshake,
  market: BarChart3,
  covert: Eye,
  crafting: Settings,
  research: Microscope,
  starmap: MapPin,
  messages: Mail,
  dashboard: BarChart3,
  endTurn: PlayCircle,
} as const;

// =============================================================================
// UI ICONS
// =============================================================================

export const UIIcons = {
  menu: Menu,
  close: X,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronRight: ChevronRight,
  info: Info,
  alert: AlertCircle,
  warning: AlertTriangle,
  help: HelpCircle,
  success: CheckCircle2,
  pending: Circle,
  processing: PlayCircle,
  paused: PauseCircle,
} as const;

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Generic Icon Component
 *
 * Wraps Lucide icons with consistent sizing and styling
 */
interface IconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

export function Icon({ icon: IconComponent, className = "", size = 16 }: IconProps) {
  return <IconComponent className={className} size={size} />;
}

/**
 * Resource Icon with Value
 *
 * Displays a resource icon with its value
 */
interface ResourceIconWithValueProps {
  resource: keyof typeof ResourceIcons;
  value: number;
  compact?: boolean;
  className?: string;
}

export function ResourceIconWithValue({
  resource,
  value,
  compact = false,
  className = "",
}: ResourceIconWithValueProps) {
  const IconComponent = ResourceIcons[resource];
  const colorMap = {
    credits: "text-lcars-amber",
    food: "text-green-400",
    ore: "text-gray-400",
    petroleum: "text-purple-400",
    researchPoints: "text-blue-400",
    population: "text-cyan-400",
    networth: "text-lcars-lavender",
  };

  const color = colorMap[resource];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <IconComponent className={`${color} ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
      <span className={`font-mono ${color} ${compact ? "text-xs" : "text-sm"}`}>
        {value >= 1000000
          ? `${(value / 1000000).toFixed(1)}M`
          : value >= 1000
          ? `${Math.floor(value / 1000)}K`
          : value.toLocaleString()}
      </span>
    </div>
  );
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ResourceIconKey = keyof typeof ResourceIcons;
export type SectorIconKey = keyof typeof SectorIcons;
export type UnitIconKey = keyof typeof UnitIcons;
export type CivilStatusIconKey = keyof typeof CivilStatusIcons;
export type ActionIconKey = keyof typeof ActionIcons;
export type UIIconKey = keyof typeof UIIcons;
