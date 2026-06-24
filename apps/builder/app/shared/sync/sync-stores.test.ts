import { afterEach, describe, expect, test, vi } from "vitest";
import {
  $allSelectedInstanceSelectors,
  $selectedInstanceOutlines,
  $selectedInstanceSelector,
  $selectedPageId,
  selectInstance,
  selectInstances,
} from "../nano-states";
import { __testing__, createObjectPool } from "./sync-stores";

const { SelectedPageAndInstanceSyncObject } = __testing__;

const waitForBatchedStore = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

afterEach(() => {
  $selectedPageId.set(undefined);
  selectInstance(undefined);
  $allSelectedInstanceSelectors.set([]);
  $selectedInstanceOutlines.set([]);
});

describe("SelectedPageAndInstanceSyncObject", () => {
  test("sends page and instance selector as one final transaction", async () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();
    const sendTransaction = vi.fn();
    syncObject.subscribe(sendTransaction, new AbortController().signal);

    await waitForBatchedStore();
    sendTransaction.mockClear();

    $selectedPageId.set("page-a");
    selectInstance(["body-a"]);

    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-a",
        selectedInstanceSelector: ["body-a"],
        allSelectedInstanceSelectors: [["body-a"]],
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
        allSelectedInstanceSelectors: [["body-b"]],
      },
    });

    expect($selectedPageId.get()).toBe("page-b");
    expect($selectedInstanceSelector.get()).toEqual(["body-b"]);

    await waitForBatchedStore();

    expect(sendTransaction).not.toHaveBeenCalled();
  });

  test("applies undefined instance selector as cleared selection", async () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();

    $selectedPageId.set("page-before");
    selectInstance(["body-before"]);

    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-after",
        selectedInstanceSelector: undefined,
        allSelectedInstanceSelectors: [],
      },
    });

    expect($selectedPageId.get()).toBe("page-after");
    expect($selectedInstanceSelector.get()).toBeUndefined();
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("sends undefined instance selector when multiple instances are selected", async () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();
    const sendTransaction = vi.fn();
    syncObject.subscribe(sendTransaction, new AbortController().signal);

    await waitForBatchedStore();
    sendTransaction.mockClear();

    $selectedPageId.set("page-a");
    selectInstances([
      ["box-a", "body-a"],
      ["heading-a", "body-a"],
    ]);

    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-a",
        selectedInstanceSelector: undefined,
        allSelectedInstanceSelectors: [
          ["box-a", "body-a"],
          ["heading-a", "body-a"],
        ],
      },
    });
  });

  test("applies multi-selection without needing a particular selected instance", () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();

    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-b",
        selectedInstanceSelector: undefined,
        allSelectedInstanceSelectors: [
          ["box-b", "body-b"],
          ["heading-b", "body-b"],
        ],
      },
    });

    expect($selectedPageId.get()).toBe("page-b");
    expect($selectedInstanceSelector.get()).toBeUndefined();
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box-b", "body-b"],
      ["heading-b", "body-b"],
    ]);
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
    selectInstance(["body-c"]);

    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-c",
        selectedInstanceSelector: ["body-c"],
        allSelectedInstanceSelectors: [["body-c"]],
      },
    });
  });

  test("malformed selection fields do not update stores", () => {
    const syncObject = new SelectedPageAndInstanceSyncObject();

    $selectedPageId.set("page-before");
    selectInstance(["body-before"]);

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
    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-after",
        selectedInstanceSelector: undefined,
        allSelectedInstanceSelectors: [["box-after"], [10]],
      },
    });

    expect($selectedPageId.get()).toBe("page-before");
    expect($selectedInstanceSelector.get()).toEqual(["body-before"]);
  });
});

describe("createObjectPool", () => {
  test("syncs selected instance outlines for builder canvas overlay", () => {
    const objectPool = createObjectPool();

    objectPool.applyTransaction({
      id: "selected-outlines",
      object: "selectedInstanceOutlines",
      payload: [
        {
          selector: ["box", "body"],
          instanceId: "box",
          rect: { left: 10, top: 20, width: 100, height: 50 },
        },
        {
          selector: ["heading", "body"],
          instanceId: "heading",
          rect: { left: 30, top: 40, width: 120, height: 60 },
        },
      ],
    });

    expect(
      $selectedInstanceOutlines.get().map((outline) => outline.selector)
    ).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);
  });
});
