/**
 * Bot Memory Module (PRD 7.9)
 *
 * Exports the weighted memory system for bot relationships.
 * Memories have weight and decay resistance - major events persist longer.
 *
 * @see docs/PRD.md Section 7.9 (Relationship Memory)
 */

export type {
  MemoryEventType,
  DecayResistance,
  MemoryWeightDefinition,
  MemoryRecord,
  RelationshipMemory,
} from "./weights";

export {
  MEMORY_EVENT_TYPES,
  DECAY_RESISTANCE_VALUES,
  MEMORY_WEIGHTS,
  PERMANENT_SCAR_CHANCE,
  SCAR_WEIGHT_THRESHOLD,
  ALL_MEMORY_EVENTS,
  getMemoryWeight,
  calculateMemoryDecay,
  rollPermanentScar,
  createMemoryRecord,
  updateMemoryWeight,
  calculateNetRelationship,
  getMostSignificantMemories,
  pruneDecayedMemories,
  createRelationshipMemory,
  addMemoryToRelationship,
  updateRelationshipMemory,
  getRelationshipTier,
  hasPermanentScars,
} from "./weights";
