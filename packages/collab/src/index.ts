/**
 * @webstudio-is/collab - realtime collaboration client
 *
 * Public exports (framework-agnostic, browser + Node.js compatible):
 *   - Protocol types: relay message shapes
 *   - Atom exports: $collaborators, $collabUnsaved
 */

export type {
  SyncMessage,
  Transaction,
  RevertedTransaction,
  SyncEmitter,
  SyncObject,
} from "./types";
export type {
  ApplyMessage,
  BroadcastMessage,
  AckMessage,
  ReloadMessage,
  ErrorMessage,
  AppliedMessage,
  PresenceMessage,
  RelayClientMessage,
  RelayServerMessage,
  CollaboratorInfo,
} from "./protocol";
export {
  persistenceBacklogErrorMessage,
  rateLimitedErrorMessage,
  stripRevisePatchesFromTransaction,
} from "./protocol";
export { $collaborators, $collabUnsaved } from "./collab-state";
export {
  assignCollaboratorColors,
  collaboratorColor,
  collaboratorColorPalette,
} from "./collaborator-colors";
export type { OperationOrder } from "./protocol";
export {
  ACK_TIMEOUT_MS,
  FAST_RETRY_MS,
  MAX_FAST_RETRIES,
  createRealtimeRetryTracker,
  syncDelayedMessage,
  type RealtimeRetryBackoff,
  type RealtimeRetryTrackerOptions,
  type RetryReason,
} from "./realtime-retry-tracker";
export { createBackoff, type Backoff, type BackoffOptions } from "./backoff";
