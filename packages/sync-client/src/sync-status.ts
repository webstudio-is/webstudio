import { atom, computed } from "nanostores";

export type SyncStatus =
  | { status: "idle" }
  | { status: "syncing" }
  | { status: "recovering" }
  | { status: "failed" }
  | { status: "fatal"; error: string };

export const $syncStatus = atom<SyncStatus>({
  status: "idle",
});

export const $hasUnsavedSyncChanges = computed(
  $syncStatus,
  (status) => status.status !== "idle" && status.status !== "fatal"
);
