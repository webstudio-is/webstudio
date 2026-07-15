import { afterEach, describe, expect, test, vi } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import {
  $allSelectedInstanceSelectors,
  $selectedInstanceOutlines,
  $selectedInstanceSelector,
  $selectedPageId,
  selectInstance,
  selectInstances,
} from "../nano-states";
import { __testing__, createObjectPool } from "./sync-stores";
import { $instances } from "./data-stores";

const { SelectedPageAndInstanceSyncObject } = __testing__;
const subscriptionControllers: AbortController[] = [];

const waitForBatchedStore = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const setTestInstances = (...instanceIds: string[]) => {
  const instances = new Map<string, Instance>([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: instanceIds.map((value) => ({ type: "id", value })),
      },
    ],
  ]);
  for (const id of instanceIds) {
    instances.set(id, {
      type: "instance",
      id,
      component: "Box",
      children: [],
    });
  }
  $instances.set(instances);
};

const subscribeSelectionSync = async () => {
  const syncObject = new SelectedPageAndInstanceSyncObject();
  const sendTransaction = vi.fn();
  const controller = new AbortController();
  subscriptionControllers.push(controller);
  syncObject.subscribe(sendTransaction, controller.signal);
  await waitForBatchedStore();
  sendTransaction.mockClear();
  return { sendTransaction, syncObject };
};

afterEach(() => {
  for (const controller of subscriptionControllers.splice(0)) {
    controller.abort();
  }
  $selectedPageId.set(undefined);
  selectInstance(undefined);
  $allSelectedInstanceSelectors.set([]);
  $selectedInstanceOutlines.set([]);
  $instances.set(new Map());
});

describe("SelectedPageAndInstanceSyncObject", () => {
  test("does not publish selection pruned by an instance update", async () => {
    setTestInstances("box");
    selectInstance(["box", "body"]);
    const { sendTransaction } = await subscribeSelectionSync();

    setTestInstances();
    await waitForBatchedStore();

    expect($allSelectedInstanceSelectors.get()).toEqual([]);
    expect(sendTransaction).not.toHaveBeenCalled();

    $selectedPageId.set("next-page");
    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "next-page",
        selectedInstanceSelector: undefined,
        allSelectedInstanceSelectors: [],
      },
    });
  });

  test("publishes a page change batched with instance pruning", async () => {
    setTestInstances("box");
    selectInstance(["box", "body"]);
    const { sendTransaction } = await subscribeSelectionSync();

    setTestInstances();
    $selectedPageId.set("next-page");
    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "next-page",
        selectedInstanceSelector: undefined,
        allSelectedInstanceSelectors: [],
      },
    });
  });

  test("publishes an explicit fallback selected after instance pruning", async () => {
    setTestInstances("box", "heading");
    selectInstance(["box", "body"]);
    const { sendTransaction } = await subscribeSelectionSync();

    setTestInstances("heading");
    selectInstance(["heading", "body"]);
    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: undefined,
        selectedInstanceSelector: ["heading", "body"],
        allSelectedInstanceSelectors: [["heading", "body"]],
      },
    });
  });

  test("sends page and instance selector as one final transaction", async () => {
    const { sendTransaction } = await subscribeSelectionSync();

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
    const { sendTransaction, syncObject } = await subscribeSelectionSync();

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

  test("remote no-op does not suppress the next local transaction", async () => {
    $selectedPageId.set("page-a");
    selectInstance(["body-a"]);
    const { sendTransaction, syncObject } = await subscribeSelectionSync();

    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-a",
        selectedInstanceSelector: ["body-a"],
        allSelectedInstanceSelectors: [["body-a"]],
      },
    });
    selectInstance(["body-b"]);
    await waitForBatchedStore();

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction).toHaveBeenCalledWith({
      id: expect.any(String),
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-a",
        selectedInstanceSelector: ["body-b"],
        allSelectedInstanceSelectors: [["body-b"]],
      },
    });
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
    const { sendTransaction } = await subscribeSelectionSync();

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
    const { sendTransaction, syncObject } = await subscribeSelectionSync();

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

  test("malformed remote payload does not echo a pending valid update", async () => {
    const { sendTransaction, syncObject } = await subscribeSelectionSync();

    syncObject.applyTransaction({
      id: "selection",
      object: "selectedPageAndInstance",
      payload: {
        selectedPageId: "page-a",
        selectedInstanceSelector: ["body-a"],
        allSelectedInstanceSelectors: [["body-a"]],
      },
    });
    syncObject.applyTransaction({
      id: "malformed-selection",
      object: "selectedPageAndInstance",
      payload: null,
    });
    await waitForBatchedStore();

    expect(sendTransaction).not.toHaveBeenCalled();
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
