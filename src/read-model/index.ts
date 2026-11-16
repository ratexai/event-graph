/* ═══════════════════════════════════════════════════════════════
   RADIANT read model — public surface
   Read-only by construction: no persistence, projection or writer.
   ═══════════════════════════════════════════════════════════════ */

export {
  buildEventDetail,
  buildEvidenceTimeline,
  compareEventRevisions,
} from "./build";
export { eventFromPrototypeMap, marketBindingsForEvent } from "./prototype";
export { ReadModelError } from "./validate";
export type { ReadModelErrorCode } from "./validate";

export type {
  EpistemicStatus,
  EvidenceRelationType,
  RelationType,
  EventLifecycleStatus,
  QualityStatus,
  IdAuthority,
  ValidTimePrecision,
  ValidTime,
  EvidenceIdentityStatus,
  EvidenceRefRead,
  QualityEnvelope,
  ProbabilityBasis,
  MarketOutcomeRead,
  MarketBindingAmbiguity,
  MarketBindingRead,
  RelationRead,
  EvidenceClaimRead,
  EvidenceExplanationRead,
  EventDetailRead,
  TimelineTimeBasis,
  EvidenceTimelineItem,
  EvidenceTimelineRead,
  RevisionFieldChange,
  RevisionEvidenceChange,
  RevisionDiffRead,
  EvidenceClaimInput,
  EventRevisionInput,
  PrototypeEvidenceInput,
  PrototypeMapNode,
  PrototypeMap,
} from "./types";
