/**
 * Message System (M8)
 *
 * Barrel exports for the bot messaging system.
 *
 * @see docs/MILESTONES.md Milestone 8
 */

// Types
export * from "./types";

// Template loading
export {
  loadPersonas,
  getPersona,
  getPersonasByArchetype,
  selectRandomPersona,
  loadPersonaTemplates,
  generateMessage,
  generateMessageForBot,
  FALLBACK_TEMPLATES,
} from "./template-loader";

// Message service
export {
  sendBotMessage,
  sendBroadcastMessage,
  getPlayerInbox,
  getInboxSummary,
  getGalacticNews,
  markMessageRead,
  markAllMessagesRead,
  deleteOldMessages,
} from "./message-service";

// Triggers (to be added)
export * from "./triggers";
