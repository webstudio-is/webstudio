import { afterEach, describe, expect, test, vi } from "vitest";
import { $selectedInstanceSelector, $selectedPageId } from "../nano-states";
import { __testing__ } from "./sync-stores";

const { SelectedPageAndInstanceSyncObject } = __testing__;

const waitForBatchedStore = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

afterEach(() => {
  $selectedPageId.set(undefined);
  $selectedInstanceSelector.set(undefined);
});

describe("SelectedPageAndInstanceSyncObject", () => {
  test("sends page and instance selector as one final transaction", async () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();
    const sendTransaction = vi.fn();
    syncObject.subscribe(sendTransaction, new AbortController().signal);

    await waitForBatchedStore();
    sendTransaction.mockClear();

    $selectedPageId.set("page-a");
    $selectedInstanceSelector.set(["body-a"]);

    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-a",
        selectedInstanceSelector: ["body-a"],
      },
    });
  });

  test("applies page and instance selector without echoing transaction", async () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();
    const sendTransaction = vi.fn();
    syncObject.subscribe(sendTransaction, new AbortController().signal);

    await waitForBatchedStore();
    sendTransaction.mockClear();

    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-b",
        selectedInstanceSelector: ["body-b"],
      },
    });

    expect($selectedPageId.get()).toBe("page-b");
    expect($selectedInstanceSelector.get()).toEqual(["body-b"]);

    await waitForBatchedStore();

    expect(sendTransaction).not.toHaveBeenCalled();
  });

  test("malformed remote payload does not suppress next local transaction", async () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();
    const sendTransaction = vi.fn();
    syncObject.subscribe(sendTransaction, new AbortController().signal);

    await waitForBatchedStore();
    sendTransaction.mockClear();

    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: null,
    });

    $selectedPageId.set("page-c");
    $selectedInstanceSelector.set(["body-c"]);

    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-c",
        selectedInstanceSelector: ["body-c"],
      },
    });
  });

  test("malformed selection fields do not update stores", () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();

    $selectedPageId.set("page-before");
    $selectedInstanceSelector.set(["body-before"]);

    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: 10,
        selectedInstanceSelector: ["body-after"],
      },
    });
    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-after",
        selectedInstanceSelector: [10],
      },
    });

    expect($selectedPageId.get()).toBe("page-before");
    expect($selectedInstanceSelector.get()).toEqual(["body-before"]);
  });
});
