/**
 * @webstudio-is/multiplayer-client - realtime multiplayer client
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
  RevertMessage,
  PresenceMessage,
  RelayClientMessage,
  RelayServerMessage,
  CollaboratorInfo,
} from "@webstudio-is/multiplayer-protocol";
export {
  persistenceBacklogErrorMessage,
  rateLimitedErrorMessage,
  stripRevisePatchesFromTransaction,
} from "@webstudio-is/multiplayer-protocol";
export { $collaborators, $collabUnsaved } from "./collab-state";
export {
  assignCollaboratorColors,
  collaboratorColor,
  collaboratorColorPalette,
} from "./collaborator-colors";
export type { OperationOrder } from "@webstudio-is/multiplayer-protocol";
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
