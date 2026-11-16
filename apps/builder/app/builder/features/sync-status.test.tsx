import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, test, vi } from "vitest";
import { $syncStatus } from "@webstudio-is/sync-client";
import {
  $externalContentRoots,
  $externalContentAssetStatuses,
} from "~/shared/external-content-mutations";
import { usePreventUnload } from "~/shared/sync/project-queue";
import { SyncStatusDot } from "./sync-status";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

const renderSyncStatusDot = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(createElement(SyncStatusDot));
  });

  const getDot = () => {
    const dot = document.querySelector('[role="status"]');
    if (dot === null) {
      throw new Error("Expected sync status dot to be rendered");
    }
    return dot;
  };

  return { getDot };
};

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = undefined;
  document.body.innerHTML = "";
  $syncStatus.set({ status: "idle" });
  $externalContentRoots.set(new Map());
  $externalContentAssetStatuses.set(new Map());
  vi.useRealTimers();
});

describe("SyncStatusDot", () => {
  test("renders idle status by default", () => {
    const { getDot } = renderSyncStatusDot();

    expect(getDot().getAttribute("data-sync-status")).toBe("idle");
    expect(getDot().getAttribute("aria-label")).toBe("Sync status: idle");
  });

  test("renders pending status while changes are syncing", () => {
    const { getDot } = renderSyncStatusDot();

    act(() => {
      $syncStatus.set({ status: "syncing" });
    });

    expect(getDot().getAttribute("data-sync-status")).toBe("pending");
    expect(getDot().getAttribute("aria-label")).toBe(
      "Sync status: pending changes"
    );
  });

  test("keeps pending status until an MDX Asset save completes", () => {
    const { getDot } = renderSyncStatusDot();
    act(() => {
      $externalContentAssetStatuses.set(new Map([["asset", "pending"]]));
    });
    expect(getDot().getAttribute("data-sync-status")).toBe("pending");
    act(() => {
      $externalContentAssetStatuses.set(new Map([["asset", "saving"]]));
    });
    expect(getDot().getAttribute("data-sync-status")).toBe("pending");
    act(() => {
      $externalContentAssetStatuses.set(new Map());
    });
    expect(getDot().getAttribute("data-sync-status")).toBe("saved");
  });

  test("keeps pending status when the last MDX root unmounts", () => {
    const { getDot } = renderSyncStatusDot();
    act(() => {
      $externalContentRoots.set(
        new Map([
          [
            "block",
            {
              blockInstanceId: "block",
              instanceIds: new Set<string>(),
              mutationRevision: 1,
              savedMutationRevision: 0,
            },
          ],
        ])
      );
      $externalContentAssetStatuses.set(new Map([["asset", "pending"]]));
    });
    act(() => {
      $externalContentRoots.set(new Map());
    });
    expect(getDot().getAttribute("data-sync-status")).toBe("pending");
  });

  test.each(["failed", "conflicting"] as const)(
    "renders an MDX Asset %s status as an error",
    (assetContentStatus) => {
      const { getDot } = renderSyncStatusDot();
      act(() => {
        $externalContentAssetStatuses.set(
          new Map([["asset", assetContentStatus]])
        );
      });
      expect(getDot().getAttribute("data-sync-status")).toBe("error");
    }
  );

  test("renders saved status briefly after pending changes become idle", () => {
    vi.useFakeTimers();
    const { getDot } = renderSyncStatusDot();

    act(() => {
      $syncStatus.set({ status: "syncing" });
    });
    act(() => {
      $syncStatus.set({ status: "idle" });
    });

    expect(getDot().getAttribute("data-sync-status")).toBe("saved");
    expect(getDot().getAttribute("aria-label")).toBe("Sync status: saved");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(getDot().getAttribute("data-sync-status")).toBe("idle");
  });

  test("renders error status for recoverable and fatal sync errors", () => {
    const { getDot } = renderSyncStatusDot();

    act(() => {
      $syncStatus.set({ status: "failed" });
    });

    expect(getDot().getAttribute("data-sync-status")).toBe("error");
    expect(getDot().getAttribute("aria-label")).toBe("Sync status: error");

    act(() => {
      $syncStatus.set({ status: "fatal", error: "broken" });
    });

    expect(getDot().getAttribute("data-sync-status")).toBe("error");
    expect(getDot().getAttribute("aria-label")).toBe(
      "Sync status: error: broken"
    );
  });
});

test("warns before unloading while an MDX Asset save is pending", () => {
  const Guard = () => {
    usePreventUnload();
    return null;
  };
  root = createRoot(document.createElement("div"));
  act(() => root?.render(createElement(Guard)));
  act(() => {
    $externalContentAssetStatuses.set(new Map([["asset", "pending"]]));
  });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  act(() => {
    $externalContentAssetStatuses.set(new Map([["asset", "failed"]]));
  });
  const failedEvent = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(failedEvent);
  expect(failedEvent.defaultPrevented).toBe(true);
});
