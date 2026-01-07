/**
 * Message System Types (M8)
 *
 * Type definitions for the bot messaging system.
 *
 * @see docs/MILESTONES.md Milestone 8
 */

// =============================================================================
// MESSAGE TRIGGER TYPES
// =============================================================================

/**
 * Message trigger events that cause bots to send messages.
 * Corresponds to template categories in data/templates/*.json
 */
export type MessageTrigger =
  | "greeting"
  | "battle_taunt"
  | "victory_gloat"
  | "defeat"
  | "trade_offer"
  | "alliance_proposal"
  | "betrayal"
  | "covert_detected"
  | "tribute_demand"
  | "threat_warning"
  | "retreat"
  | "eliminated"
  | "endgame"
  | "broadcast_shout"
  | "casual_message";

/**
 * Maps trigger types to template JSON keys
 */
export const TRIGGER_TO_TEMPLATE_KEY: Record<MessageTrigger, string> = {
  greeting: "greeting",
  battle_taunt: "battleTaunt",
  victory_gloat: "victoryGloat",
  defeat: "defeat",
  trade_offer: "tradeOffer",
  alliance_proposal: "allianceProposal",
  betrayal: "betrayal",
  covert_detected: "covertDetected",
  tribute_demand: "tributeDemand",
  threat_warning: "threatWarning",
  retreat: "retreat",
  eliminated: "eliminated",
  endgame: "endgame",
  broadcast_shout: "broadcastShout",
  casual_message: "casualMessage",
};

// =============================================================================
// MESSAGE CHANNEL TYPES
// =============================================================================

/**
 * Message delivery channels
 */
export type MessageChannel = "direct" | "broadcast";

// =============================================================================
// MESSAGE CONTEXT
// =============================================================================

/**
 * Context for template variable substitution
 */
export interface MessageContext {
  /** Target empire name */
  empire_name?: string;
  /** Current turn number */
  turn?: number;
  /** Credits involved (trades, tributes) */
  credits?: number;
  /** Resources involved */
  resources?: string;
  /** Sector name (for combat) */
  planet_name?: string;
  /** Custom values */
  [key: string]: string | number | undefined;
}

// =============================================================================
// PERSONA TYPES
// =============================================================================

/**
 * Bot archetype determines messaging style and template selection
 */
export type BotArchetype =
  | "warlord"
  | "diplomat"
  | "merchant"
  | "schemer"
  | "turtle"
  | "blitzkrieg"
  | "tech_rush"
  | "opportunist";

/**
 * Bot persona voice characteristics
 */
export interface PersonaVoice {
  tone: string;
  quirks: string[];
  vocabulary: string[];
  catchphrase: string;
}

/**
 * Full bot persona definition
 */
export interface Persona {
  id: string;
  name: string;
  emperorName: string;
  archetype: BotArchetype;
  voice: PersonaVoice;
  tellRate: number;
}

// =============================================================================
// MESSAGE TEMPLATE TYPES
// =============================================================================

/**
 * Template library for a single persona
 */
export interface PersonaTemplates {
  personaId: string;
  templates: {
    greeting?: string[];
    battleTaunt?: string[];
    victoryGloat?: string[];
    defeat?: string[];
    tradeOffer?: string[];
    allianceProposal?: string[];
    betrayal?: string[];
    covertDetected?: string[];
    tributeDemand?: string[];
    threatWarning?: string[];
    retreat?: string[];
    eliminated?: string[];
    endgame?: string[];
    broadcastShout?: string[];
    casualMessage?: string[];
  };
}

// =============================================================================
// MESSAGE RESULT TYPES
// =============================================================================

/**
 * Result of message generation
 */
export interface GeneratedMessage {
  content: string;
  templateId: string;
  trigger: MessageTrigger;
  channel: MessageChannel;
}

/**
 * Message as stored in the database
 */
export interface StoredMessage {
  id: string;
  gameId: string;
  senderId: string | null;
  senderName?: string;
  senderArchetype?: BotArchetype;
  recipientId: string | null;
  recipientName?: string;
  channel: MessageChannel;
  trigger: MessageTrigger;
  content: string;
  templateId: string | null;
  isRead: boolean;
  turn: number;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * Message inbox summary
 */
export interface InboxSummary {
  totalMessages: number;
  unreadCount: number;
  directMessages: number;
  directUnread: number;
  broadcasts: number;
}

// =============================================================================
// GALACTIC NEWS TYPES
// =============================================================================

/**
 * Galactic news item (broadcast message for news feed)
 */
export interface GalacticNewsItem {
  id: string;
  senderName: string;
  senderArchetype?: BotArchetype;
  content: string;
  turn: number;
  createdAt: Date;
}
