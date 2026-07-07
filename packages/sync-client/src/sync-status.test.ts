import { afterEach, describe, expect, test } from "vitest";
import { $hasUnsavedSyncChanges, $syncStatus } from "./sync-status";

afterEach(() => {
  $syncStatus.set({ status: "idle" });
});

describe("$syncStatus", () => {
  test("reports idle when sync is idle", () => {
    $syncStatus.set({ status: "idle" });

    expect($syncStatus.get()).toEqual({ status: "idle" });
    expect($hasUnsavedSyncChanges.get()).toBe(false);
  });

  test("reports unsaved changes while syncing", () => {
    $syncStatus.set({ status: "syncing" });

    expect($syncStatus.get()).toEqual({ status: "syncing" });
    expect($hasUnsavedSyncChanges.get()).toBe(true);
  });

  test("reports unsaved changes while recovering or failed", () => {
    $syncStatus.set({ status: "recovering" });
    expect($hasUnsavedSyncChanges.get()).toBe(true);

    $syncStatus.set({ status: "failed" });
    expect($hasUnsavedSyncChanges.get()).toBe(true);
  });

  test("does not report fatal as unsaved because sync is paused", () => {
    $syncStatus.set({ status: "fatal", error: "broken" });

    expect($syncStatus.get()).toEqual({ status: "fatal", error: "broken" });
    expect($hasUnsavedSyncChanges.get()).toBe(false);
  });
});
