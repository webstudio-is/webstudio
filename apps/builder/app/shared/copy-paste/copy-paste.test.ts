import { afterEach, expect, test, vi } from "vitest";
import { enableMapSet } from "immer";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Instance } from "@webstudio-is/sdk";
import { registerContainers } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "../sync/data-stores";
import { $authTokenPermissions, selectInstance } from "../nano-states";
import {
  copyInstance,
  copyPage,
  cutInstance,
  initCopyPaste,
} from "./copy-paste";

enableMapSet();
registerContainers();

const resetStores = () => {
  $authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: false,
  });
  $instances.set(new Map());
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $assets.set(new Map());
  selectInstance(undefined);
};

const setupPage = () => {
  const pages = createDefaultPages({
    homePageId: "page-id",
    rootInstanceId: "body-id",
  });
  $pages.set(pages);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [],
        },
      ],
    ])
  );
};

const createClipboardEvent = (type: "copy" | "cut" | "paste") => {
  const data = new Map<string, string>();
  const clipboardData = {
    getData: (mimeType: string) => data.get(mimeType) ?? "",
    setData: (mimeType: string, value: string) => {
      data.set(mimeType, value);
    },
  } as DataTransfer;
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  return { clipboardData, event };
};

afterEach(() => {
  resetStores();
  vi.unstubAllGlobals();
});

test("does not copy page to clipboard when copy permission is disabled", async () => {
  resetStores();
  setupPage();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });
  $authTokenPermissions.set({
    canClone: true,
    canCopy: false,
    canPublish: false,
  });

  await copyPage("page-id");

  expect(writeText).not.toHaveBeenCalled();
});

test("does not copy instance to clipboard when no instance is selected", async () => {
  resetStores();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });

  await copyInstance();

  expect(writeText).not.toHaveBeenCalled();
});

test("copies selected instance through clipboard event", () => {
  resetStores();
  const abortController = new AbortController();
  initCopyPaste({ signal: abortController.signal });
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [{ type: "id", value: "box-id" }],
        },
      ],
      [
        "box-id",
        {
          type: "instance",
          id: "box-id",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
  selectInstance(["box-id", "body-id"]);
  const { clipboardData, event } = createClipboardEvent("copy");

  document.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(clipboardData.getData("text/plain")).toContain(
    '"@webstudio/instance/v0.1"'
  );
  abortController.abort();
});

test("does not intercept native copy from inputs", () => {
  resetStores();
  const abortController = new AbortController();
  initCopyPaste({ signal: abortController.signal });
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [{ type: "id", value: "box-id" }],
        },
      ],
      [
        "box-id",
        {
          type: "instance",
          id: "box-id",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
  selectInstance(["box-id", "body-id"]);
  const input = document.createElement("input");
  document.body.append(input);
  const { clipboardData, event } = createClipboardEvent("copy");

  input.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
  expect(clipboardData.getData("text/plain")).toBe("");
  input.remove();
  abortController.abort();
});

test("copies selected instance to clipboard", async () => {
  resetStores();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [{ type: "id", value: "box-id" }],
        },
      ],
      [
        "box-id",
        {
          type: "instance",
          id: "box-id",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
  selectInstance(["box-id", "body-id"]);

  await copyInstance();

  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining('"@webstudio/instance/v0.1"')
  );
});

test("does not cut instance to clipboard when no instance is selected", async () => {
  resetStores();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });

  await cutInstance();

  expect(writeText).not.toHaveBeenCalled();
});

test("cuts selected instance to clipboard and removes it", async () => {
  resetStores();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText },
  });
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [{ type: "id", value: "box-id" }],
        },
      ],
      [
        "box-id",
        {
          type: "instance",
          id: "box-id",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
  selectInstance(["box-id", "body-id"]);

  await cutInstance();

  expect(writeText).toHaveBeenCalledWith(
    expect.stringContaining('"@webstudio/instance/v0.1"')
  );
  expect($instances.get().get("body-id")?.children).toEqual([]);
  expect($instances.get().has("box-id")).toBe(false);
});
