/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { Backoff } from "@webstudio-is/sync-client";

//  Module mocks

const {
  mockBuildPatch,
  mockCreateNativeClient,
  mockToastError,
  mockCreateBackoff,
  mockLoadBuilderData,
} = vi.hoisted(() => ({
  mockBuildPatch: vi.fn(),
  mockCreateNativeClient: vi.fn(),
  mockToastError: vi.fn(),
  mockCreateBackoff: vi.fn(),
  mockLoadBuilderData: vi.fn(),
}));

vi.mock("~/shared/trpc/trpc-client", () => ({
  createNativeClient: mockCreateNativeClient,
  nativeClient: { build: { patch: { mutate: mockBuildPatch } } },
}));

vi.mock("@webstudio-is/design-system", () => ({
  toast: { error: mockToastError },
}));

vi.mock("~/env/env.static", () => ({
  publicStaticEnv: { VERSION: "test-version" },
}));

vi.mock("@webstudio-is/sync-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@webstudio-is/sync-client")>()),
  createBackoff: mockCreateBackoff,
}));

vi.mock("~/shared/builder-data", () => ({
  loadBuilderData: mockLoadBuilderData,
}));

//  Imports (after mocks)

import type { Change } from "immerhin";
import { $hasUnsavedSyncChanges, $syncStatus } from "@webstudio-is/sync-client";
import {
  $lastTransactionId,
  commandQueue,
  isSyncIdle,
  onTransactionComplete,
  onNextTransactionComplete,
  enqueueProjectDetails,
  stopPolling,
  ServerSyncStorage,
  __testing__,
} from "./project-queue";

const { retry, pollCommands, transactionCallbacks } = __testing__;

//  Constants (duplicated to avoid exporting them just for tests)

const NEW_ENTRIES_INTERVAL = 1000;
const INTERVAL_RECOVERY = 2000;
const MAX_RETRY_RECOVERY = 5;
const MAX_ALLOWED_API_ERRORS = 5;

//  Helpers

const flush = () => vi.advanceTimersByTimeAsync(0);

const makeTx = (id: string) => ({
  id,
  object: "server" as const,
  payload: [{ namespace: "ns", patches: [], revisePatches: [] }] as Change[],
});

const createMockBackoff = (overrides: Partial<Backoff> = {}): Backoff => {
  let failures = 0;
  return {
    next:
      overrides.next ??
      vi.fn(() => {
        failures += 1;
        return 10_000;
      }),
    reset:
      overrides.reset ??
      vi.fn(() => {
        failures = 0;
      }),
    attempts: overrides.attempts ?? vi.fn(() => failures),
  };
};

//  Tests

describe("project-queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    $syncStatus.set({ status: "idle" });
    $lastTransactionId.set(undefined);
    commandQueue.dequeueAll();
    transactionCallbacks.clear();
    stopPolling();

    // Default mocks
    mockCreateBackoff.mockReturnValue(createMockBackoff());
    mockCreateNativeClient.mockReturnValue({
      build: { patch: { mutate: mockBuildPatch } },
    });
    mockBuildPatch.mockResolvedValue({ status: "ok" });
    mockToastError.mockClear();
    mockLoadBuilderData.mockResolvedValue({});
  });

  afterEach(() => {
    stopPolling();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  //  unload protection

  describe("$hasUnsavedSyncChanges", () => {
    test("is false when sync is idle", () => {
      $syncStatus.set({ status: "idle" });

      expect($hasUnsavedSyncChanges.get()).toBe(false);
    });

    test("is true while changes are not saved yet", () => {
      $syncStatus.set({ status: "syncing" });

      expect($hasUnsavedSyncChanges.get()).toBe(true);
    });
  });

  //  isSyncIdle

  describe("isSyncIdle", () => {
    test("resolves immediately when status is idle", async () => {
      $syncStatus.set({ status: "idle" });
      const result = await isSyncIdle();
      expect(result).toEqual({ status: "idle" });
    });

    test("rejects immediately when status is fatal", async () => {
      $syncStatus.set({ status: "fatal", error: "broken" });
      await expect(isSyncIdle()).rejects.toThrow(
        "Synchronization is in fatal state"
      );
    });

    test("waits and resolves when status transitions to idle", async () => {
      $syncStatus.set({ status: "syncing" });

      let resolved = false;
      isSyncIdle().then(() => {
        resolved = true;
      });
      await flush();
      expect(resolved).toBe(false);

      $syncStatus.set({ status: "idle" });
      await flush();
      expect(resolved).toBe(true);
    });

    test("waits and rejects when status transitions to fatal", async () => {
      $syncStatus.set({ status: "syncing" });

      let error: Error | undefined;
      isSyncIdle().catch((err: Error) => {
        error = err;
      });
      await flush();
      expect(error).toBeUndefined();

      $syncStatus.set({ status: "fatal", error: "crashed" });
      await flush();
      expect(error?.message).toMatch("Synchronization is in fatal state");
    });

    test("ignores intermediate non-idle/non-fatal statuses", async () => {
      $syncStatus.set({ status: "syncing" });

      let resolved = false;
      isSyncIdle().then(() => {
        resolved = true;
      });
      await flush();

      $syncStatus.set({ status: "recovering" });
      await flush();
      expect(resolved).toBe(false);

      $syncStatus.set({ status: "failed" });
      await flush();
      expect(resolved).toBe(false);

      $syncStatus.set({ status: "idle" });
      await flush();
      expect(resolved).toBe(true);
    });
  });

  //  onTransactionComplete

  describe("onTransactionComplete", () => {
    test("cleans up callbacks after 60s timeout", async () => {
      const cb = vi.fn();
      onTransactionComplete("tx-1", cb);

      expect(transactionCallbacks.has("tx-1")).toBe(true);

      await vi.advanceTimersByTimeAsync(60_000);

      expect(transactionCallbacks.has("tx-1")).toBe(false);
    });
  });

  //  onNextTransactionComplete

  describe("onNextTransactionComplete", () => {
    test("fires when $lastTransactionId changes and transaction succeeds", async () => {
      const cb = vi.fn();
      onNextTransactionComplete(cb);

      $lastTransactionId.set("tx-next");

      const callbacks = transactionCallbacks.get("tx-next");
      expect(callbacks).toBeDefined();
      callbacks?.[0](true);

      expect(cb).toHaveBeenCalledOnce();
    });

    test("does not fire when transaction fails", async () => {
      const cb = vi.fn();
      onNextTransactionComplete(cb);

      $lastTransactionId.set("tx-fail");

      const callbacks = transactionCallbacks.get("tx-fail");
      callbacks?.[0](false);

      expect(cb).not.toHaveBeenCalled();
    });
  });

  //  retry generator

  describe("retry generator (backoff integration)", () => {
    test("uses 'recovering' status for the first MAX_RETRY_RECOVERY attempts", async () => {
      let failureCount = 0;
      mockCreateBackoff.mockReturnValue(
        createMockBackoff({
          next: vi.fn(() => {
            failureCount += 1;
            return 10_000;
          }),
          attempts: vi.fn(() => failureCount),
        })
      );

      const gen = retry();
      await gen.next();

      for (let i = 0; i < MAX_RETRY_RECOVERY; i++) {
        const p = gen.next();
        await vi.advanceTimersByTimeAsync(INTERVAL_RECOVERY);
        await p;

        expect($syncStatus.get()).toEqual({ status: "recovering" });
      }
    });

    test("transitions to 'failed' status after MAX_RETRY_RECOVERY attempts", async () => {
      let failureCount = 0;
      const mockNext = vi.fn(() => {
        failureCount += 1;
        return 15_000;
      });
      mockCreateBackoff.mockReturnValue(
        createMockBackoff({
          next: mockNext,
          attempts: vi.fn(() => failureCount),
        })
      );

      const gen = retry();
      await gen.next();

      for (let i = 0; i < MAX_RETRY_RECOVERY; i++) {
        const p = gen.next();
        await vi.advanceTimersByTimeAsync(INTERVAL_RECOVERY);
        await p;
      }

      const failedPromise = gen.next();
      await vi.advanceTimersByTimeAsync(15_000);
      await failedPromise;

      expect($syncStatus.get()).toEqual({ status: "failed" });
    });

    test("uses backoff.next() delay and shows toast in failed state", async () => {
      let failureCount = 0;
      const mockNext = vi.fn(() => {
        failureCount += 1;
        return 25_000;
      });
      mockCreateBackoff.mockReturnValue(
        createMockBackoff({
          next: mockNext,
          attempts: vi.fn(() => failureCount),
        })
      );

      const gen = retry();
      await gen.next();

      for (let i = 0; i < MAX_RETRY_RECOVERY; i++) {
        const p = gen.next();
        await vi.advanceTimersByTimeAsync(INTERVAL_RECOVERY);
        await p;
      }

      const failedPromise = gen.next();
      await vi.advanceTimersByTimeAsync(25_000);
      await failedPromise;

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("Retry in 25 seconds")
      );
    });

    test("calls backoff.next() in recovery to track attempts", async () => {
      let failureCount = 0;
      const mockNext = vi.fn(() => {
        failureCount += 1;
        return 5_000;
      });
      mockCreateBackoff.mockReturnValue(
        createMockBackoff({
          next: mockNext,
          attempts: vi.fn(() => failureCount),
        })
      );

      const gen = retry();
      await gen.next();

      const p = gen.next();
      await vi.advanceTimersByTimeAsync(INTERVAL_RECOVERY);
      await p;

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  //  pollCommands generator

  describe("pollCommands generator", () => {
    test("yields commands from the queue", async () => {
      commandQueue.enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: undefined,
      });

      const gen = pollCommands();
      const result = await gen.next();

      expect(result.value).toEqual(
        expect.objectContaining({ type: "setDetails", projectId: "p1" })
      );
    });

    test("sets status to syncing when commands are available", async () => {
      commandQueue.enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: undefined,
      });

      const gen = pollCommands();
      await gen.next();

      expect($syncStatus.get()).toEqual({ status: "syncing" });
    });

    test("sets status to idle and waits when queue is empty", async () => {
      const gen = pollCommands();

      const p = gen.next();
      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL);

      commandQueue.enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 1,
        buildId: "b1",
        authToken: undefined,
      });
      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL);
      const result = await p;

      expect(result.value).toEqual(
        expect.objectContaining({ type: "setDetails" })
      );
    });
  });

  //  enqueueProjectDetails

  describe("enqueueProjectDetails", () => {
    test("skips enqueue for 'view' permit", () => {
      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "view",
        authToken: undefined,
      });

      const commands = commandQueue.dequeueAll();
      expect(commands).toHaveLength(0);
    });

    test("enqueues setDetails for 'edit' permit", () => {
      const enqueueSpy = vi.spyOn(commandQueue, "enqueue");

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });

      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "setDetails",
          projectId: "p1",
          version: 1,
          buildId: "b1",
          authToken: "tok",
        })
      );

      enqueueSpy.mockRestore();
    });

    test("enqueues setDetails for 'own' permit", () => {
      const enqueueSpy = vi.spyOn(commandQueue, "enqueue");

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "own",
        authToken: undefined,
      });

      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "setDetails" })
      );

      enqueueSpy.mockRestore();
    });
  });

  //  ServerSyncStorage

  describe("ServerSyncStorage", () => {
    test("sendTransaction enqueues only for 'server' object", () => {
      const storage = new ServerSyncStorage("p1");

      storage.sendTransaction({
        id: "tx-1",
        object: "server",
        payload: [{ namespace: "ns", patches: [], revisePatches: [] }],
      });

      const commands = commandQueue.dequeueAll();
      expect(commands).toHaveLength(1);
      if (commands[0].type === "transactions") {
        expect(commands[0].transactions[0].id).toBe("tx-1");
      }
    });

    test("sendTransaction ignores non-server objects", () => {
      const storage = new ServerSyncStorage("p1");

      storage.sendTransaction({
        id: "tx-1",
        object: "client",
        payload: [],
      });

      const commands = commandQueue.dequeueAll();
      expect(commands).toHaveLength(0);
    });

    test("sendTransaction sets $lastTransactionId", () => {
      const storage = new ServerSyncStorage("p1");

      storage.sendTransaction({
        id: "tx-42",
        object: "server",
        payload: [{ namespace: "ns", patches: [], revisePatches: [] }],
      });

      expect($lastTransactionId.get()).toBe("tx-42");
    });
  });

  //  pollQueue integration

  describe("pollQueue integration", () => {
    test("successful transaction increments version and fires callbacks", async () => {
      mockBuildPatch.mockResolvedValue({ status: "ok" });

      const txCallback = vi.fn();
      onTransactionComplete("tx-success", txCallback);

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });

      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-success")],
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 3);
      await flush();

      expect(txCallback).toHaveBeenCalledWith(true);
    });

    test("sends auth token in RPC input and header", async () => {
      mockBuildPatch.mockResolvedValue({ status: "ok" });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });
      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-auth")],
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 3);
      await flush();

      expect(mockBuildPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: "tok",
          source: "browser",
        })
      );
      expect(mockCreateNativeClient).toHaveBeenCalledWith({
        "x-auth-token": "tok",
      });
    });

    test("version_mismatched response sets fatal status", async () => {
      vi.stubGlobal(
        "confirm",
        vi.fn(() => false)
      );

      mockBuildPatch.mockResolvedValue({
        status: "version_mismatched",
        errors: "Version mismatch",
      });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });
      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-1")],
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 3);
      await flush();

      expect($syncStatus.get().status).toBe("fatal");

      vi.unstubAllGlobals();
    });

    test("authorization_error response sets fatal status", async () => {
      vi.stubGlobal(
        "confirm",
        vi.fn(() => false)
      );

      mockBuildPatch.mockResolvedValue({
        status: "authorization_error",
        errors: "Not authorized",
      });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });
      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-1")],
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 3);
      await flush();

      expect($syncStatus.get().status).toBe("fatal");

      vi.unstubAllGlobals();
    });

    test("fatal after MAX_ALLOWED_API_ERRORS unknown API errors", async () => {
      mockBuildPatch.mockResolvedValue({
        status: "unknown_error",
        errors: "Something bad",
      });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });
      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-1")],
      });

      for (
        let i = 0;
        i < MAX_ALLOWED_API_ERRORS + MAX_RETRY_RECOVERY + 2;
        i++
      ) {
        await vi.advanceTimersByTimeAsync(
          NEW_ENTRIES_INTERVAL + INTERVAL_RECOVERY + 30_000
        );
        await flush();
      }

      expect($syncStatus.get().status).toBe("fatal");
    });

    test("rpc errors retry without crashing", async () => {
      let callCount = 0;
      mockBuildPatch.mockImplementation(async () => {
        callCount += 1;
        if (callCount <= 2) {
          throw new Error("Server Error");
        }
        return { status: "ok" };
      });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });
      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-retry")],
      });

      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(
          NEW_ENTRIES_INTERVAL + INTERVAL_RECOVERY + 15_000
        );
        await flush();
      }

      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    test("network error retries without crashing", async () => {
      let callCount = 0;
      mockBuildPatch.mockImplementation(async () => {
        callCount += 1;
        if (callCount <= 1) {
          throw new Error("ERR_CONNECTION_REFUSED");
        }
        return { status: "ok" };
      });

      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });
      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-net")],
      });

      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(
          NEW_ENTRIES_INTERVAL + INTERVAL_RECOVERY + 15_000
        );
        await flush();
      }

      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    test("missing project details causes fatal status", async () => {
      commandQueue.enqueue({
        type: "transactions",
        projectId: "p-unknown",
        transactions: [makeTx("tx-orphan")],
      });

      enqueueProjectDetails({
        projectId: "p-other",
        buildId: "b-other",
        version: 1,
        authPermit: "edit",
        authToken: undefined,
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 5);
      await flush();

      expect($syncStatus.get().status).toBe("fatal");
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("Project details not found"),
        expect.anything()
      );
    });

    test("outdated version on setDetails sets fatal status", async () => {
      vi.stubGlobal(
        "confirm",
        vi.fn(() => false)
      );

      mockBuildPatch.mockResolvedValue({ status: "ok" });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 5,
        authPermit: "edit",
        authToken: "tok",
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL);
      await flush();

      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-v")],
      });
      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 2);
      await flush();

      commandQueue.enqueue({
        type: "setDetails",
        projectId: "p1",
        version: 3,
        buildId: "b1",
        authToken: "tok",
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 2);
      await flush();

      expect($syncStatus.get().status).toBe("fatal");

      vi.unstubAllGlobals();
    });
  });

  //  stopPolling

  describe("stopPolling", () => {
    test("can be called safely when not polling", () => {
      expect(() => stopPolling()).not.toThrow();
    });

    test("stops the polling loop", async () => {
      mockBuildPatch.mockResolvedValue({ status: "ok" });

      enqueueProjectDetails({
        projectId: "p1",
        buildId: "b1",
        version: 1,
        authPermit: "edit",
        authToken: "tok",
      });

      stopPolling();
      mockBuildPatch.mockClear();

      commandQueue.enqueue({
        type: "transactions",
        projectId: "p1",
        transactions: [makeTx("tx-after-stop")],
      });

      await vi.advanceTimersByTimeAsync(NEW_ENTRIES_INTERVAL * 5);
      await flush();

      // No fetch calls should have happened after stopping
      expect(mockBuildPatch).not.toHaveBeenCalled();
    });
  });
});
