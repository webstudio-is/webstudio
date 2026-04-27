/**
 * @webstudio-is/sync-client - shared single-player and multiplayer sync client
 *
 * Public exports (framework-agnostic, browser + Node.js compatible):
 *   - Protocol types: relay message shapes
 *   - Sync state primitives
 *   - Atom exports: $collaborators, $syncStatus
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
} from "@webstudio-is/multiplayer-protocol";
export {
  stripRevisePatchesFromPayload,
  stripRevisePatchesFromTransaction,
} from "./transaction-utils";
export { $collaborators } from "./multiplayer/collab-state";
export {
  $hasUnsavedSyncChanges,
  $syncStatus,
  type SyncStatus,
} from "./sync-status";
export { createTransactionCompletionStore } from "./transaction-completion";
export {
  assignCollaboratorColors,
  collaboratorColor,
  collaboratorColorPalette,
} from "./multiplayer/collaborator-colors";
export type { OperationOrder } from "@webstudio-is/multiplayer-protocol";
export {
  ACK_TIMEOUT_MS,
  FAST_RETRY_MS,
  MAX_FAST_RETRIES,
  createMultiplayerRetryTracker,
  syncDelayedMessage,
  type MultiplayerRetryTrackerOptions,
  type RetryReason,
} from "./multiplayer/multiplayer-retry-tracker";
export { createBackoff, type Backoff, type BackoffOptions } from "./backoff";
