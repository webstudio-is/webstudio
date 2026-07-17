import { afterEach, expect, test, vi } from "vitest";
import { enableMapSet } from "immer";
import { createDefaultPages } from "@webstudio-is/project-build";
import { createEmptyWebstudioFragment } from "@webstudio-is/project-build/runtime";
import { coreMetas, type Instance } from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import type { Project } from "@webstudio-is/project";
import { initBuilderApi } from "../builder-api";
import { registerContainers } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "../sync/data-stores";
import {
  $authTokenPermissions,
  $selectedPageId,
  $textEditingInstanceSelector,
  $registeredComponentMetas,
  selectInstance,
  selectInstances,
} from "../nano-states";
import {
  copyInstance,
  copyPage,
  cutInstance,
  emitPaste,
  initCopyPaste,
  initCopyPasteForContentEditMode,
} from "./copy-paste";
import { insertFragmentWithBreakpointWarning } from "./fragment-utils";

enableMapSet();
registerContainers();
$registeredComponentMetas.set(
  new Map(Object.entries({ ...baseComponentMetas, ...coreMetas }))
);

const resetStores = () => {
  $authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: false,
  });
  $instances.set(new Map());
  $project.set(undefined);
  $props.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $assets.set(new Map());
  $textEditingInstanceSelector.set(undefined);
  selectInstance(undefined);
};

const setupPage = () => {
  const pages = createDefaultPages({
    homePageId: "page-id",
    rootInstanceId: "body-id",
  });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
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

const setupRootCssVariable = (property: `--${string}`, value: string) => {
  $styleSources.set(
    new Map([["root-local", { id: "root-local", type: "local" }]])
  );
  $styleSourceSelections.set(
    new Map([["body-id", { instanceId: "body-id", values: ["root-local"] }]])
  );
  $styles.set(
    new Map([
      [
        `root-local:base:${property}:`,
        {
          styleSourceId: "root-local",
          breakpointId: "base",
          property,
          value: { type: "unparsed", value },
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

class TestDataTransfer {
  data = new Map<string, string>();

  getData(mimeType: string) {
    return this.data.get(mimeType) ?? "";
  }

  setData(mimeType: string, value: string) {
    this.data.set(mimeType, value);
  }
}

class TestClipboardEvent extends Event {
  clipboardData?: DataTransfer;

  constructor(
    type: string,
    options: EventInit & { clipboardData?: DataTransfer }
  ) {
    super(type, options);
    this.clipboardData = options.clipboardData;
  }
}

const setupToastInfo = () => {
  initBuilderApi();
  const toastInfo = vi.fn();
  window.__webstudio__$__builderApi.toast.info = toastInfo;
  return toastInfo;
};

const setupToastError = () => {
  initBuilderApi();
  const toastError = vi.fn();
  window.__webstudio__$__builderApi.toast.error = toastError;
  return toastError;
};

const setupToastSuccess = () => {
  initBuilderApi();
  const toastSuccess = vi.fn();
  window.__webstudio__$__builderApi.toast.success = toastSuccess;
  return toastSuccess;
};

const waitForClipboardEvent = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

const pastePlainText = async (
  value: unknown,
  target: "design-token" | "css-variable" | "cancel" = "css-variable"
) => {
  initBuilderApi();
  vi.spyOn(
    window.__webstudio__$__builderApi,
    "showDesignTokenImportDialog"
  ).mockResolvedValue(target);
  const abortController = new AbortController();
  initCopyPaste({ signal: abortController.signal });
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData("text/plain", JSON.stringify(value));
  document.dispatchEvent(event);
  await waitForClipboardEvent();
  abortController.abort();
  return event;
};

afterEach(() => {
  resetStores();
  vi.restoreAllMocks();
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

test("copies multi-selected instances through clipboard event", () => {
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
          children: [
            { type: "id", value: "box-id" },
            { type: "id", value: "heading-id" },
          ],
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
      [
        "heading-id",
        {
          type: "instance",
          id: "heading-id",
          component: "Heading",
          children: [],
        },
      ],
    ])
  );
  selectInstances([
    ["box-id", "body-id"],
    ["heading-id", "body-id"],
  ]);
  const { clipboardData, event } = createClipboardEvent("copy");

  document.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(JSON.parse(clipboardData.getData("text/plain"))).toMatchObject({
    "@webstudio/instances/v0.1": {
      rootInstanceIds: ["box-id", "heading-id"],
    },
  });
  abortController.abort();
});

test("content mode copies selected instances through clipboard event", () => {
  resetStores();
  const abortController = new AbortController();
  const toastInfo = setupToastInfo();
  initCopyPasteForContentEditMode({ signal: abortController.signal });
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
  expect(toastInfo).not.toHaveBeenCalled();
  abortController.abort();
});

test("content mode reports unsupported copy selection", () => {
  resetStores();
  const abortController = new AbortController();
  const toastInfo = setupToastInfo();
  initCopyPasteForContentEditMode({ signal: abortController.signal });
  const { event } = createClipboardEvent("copy");

  document.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
  expect(toastInfo).toHaveBeenCalledWith(
    "This selection cannot be copied here."
  );
  abortController.abort();
});

test("content mode pastes instance clipboard data through clipboard event", async () => {
  resetStores();
  const abortController = new AbortController();
  const toastInfo = setupToastInfo();
  initCopyPasteForContentEditMode({ signal: abortController.signal });
  $project.set({ id: "project-id" } as Project);
  setupPage();
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
  const { clipboardData: copyData, event: copyEvent } =
    createClipboardEvent("copy");
  document.dispatchEvent(copyEvent);
  const clipboardText = copyData.getData("text/plain");
  selectInstance(["body-id"]);
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData("text/plain", clipboardText);

  document.dispatchEvent(event);
  await waitForClipboardEvent();

  expect(event.defaultPrevented).toBe(true);
  expect($instances.get().get("body-id")?.children).toEqual([
    { type: "id", value: "box-id" },
    { type: "id", value: expect.any(String) },
  ]);
  expect(toastInfo).not.toHaveBeenCalled();
  abortController.abort();
});

test("pastes multi-selected instance clipboard data through clipboard event", async () => {
  resetStores();
  const abortController = new AbortController();
  initCopyPaste({ signal: abortController.signal });
  $project.set({ id: "project-id" } as Project);
  setupPage();
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [
            { type: "id", value: "source-1" },
            { type: "id", value: "source-2" },
            { type: "id", value: "target" },
          ],
        },
      ],
      [
        "source-1",
        {
          type: "instance",
          id: "source-1",
          component: "Box",
          children: [],
        },
      ],
      [
        "source-2",
        {
          type: "instance",
          id: "source-2",
          component: "Heading",
          children: [],
        },
      ],
      [
        "target",
        {
          type: "instance",
          id: "target",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
  selectInstances([
    ["source-1", "body-id"],
    ["source-2", "body-id"],
  ]);
  const { clipboardData: copyData, event: copyEvent } =
    createClipboardEvent("copy");
  document.dispatchEvent(copyEvent);
  const clipboardText = copyData.getData("text/plain");
  expect(JSON.parse(clipboardText)).toMatchObject({
    "@webstudio/instances/v0.1": {
      rootInstanceIds: ["source-1", "source-2"],
    },
  });

  selectInstance(["target", "body-id"]);
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData("text/plain", clipboardText);
  document.dispatchEvent(event);
  await waitForClipboardEvent();

  const targetChildren = $instances.get().get("target")?.children;
  expect(targetChildren).toEqual([
    { type: "id", value: expect.any(String) },
    { type: "id", value: expect.any(String) },
  ]);
  expect(targetChildren?.[0]?.value).not.toBe("source-1");
  expect(targetChildren?.[1]?.value).not.toBe("source-2");
  expect(
    $instances.get().get(targetChildren?.[0]?.value ?? "")?.component
  ).toBe("Box");
  expect(
    $instances.get().get(targetChildren?.[1]?.value ?? "")?.component
  ).toBe("Heading");
  abortController.abort();
});

test("does not paste malformed webstudio instance json as plain text", async () => {
  resetStores();
  const abortController = new AbortController();
  const toastError = setupToastError();
  initCopyPaste({ signal: abortController.signal });
  $project.set({ id: "project-id" } as Project);
  setupPage();
  selectInstance(["body-id"]);
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData(
    "text/plain",
    `{"@webstudio/instance/v0.1":{"instanceSelector":["missing-id","body-id"]`
  );

  document.dispatchEvent(event);
  await waitForClipboardEvent();

  expect(event.defaultPrevented).toBe(true);
  expect($instances.get().get("body-id")?.children).toEqual([]);
  expect(toastError).toHaveBeenCalledWith(
    "Could not paste Webstudio instance data. The clipboard data appears to be incomplete or invalid."
  );
  abortController.abort();
});

test("reports malformed Webflow json through generic paste", async () => {
  resetStores();
  const abortController = new AbortController();
  const toastError = setupToastError();
  initCopyPaste({ signal: abortController.signal });
  setupPage();
  selectInstance(["body-id"]);
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData(
    "application/json",
    JSON.stringify({ type: "@webflow/XscpData" })
  );

  document.dispatchEvent(event);
  await waitForClipboardEvent();

  expect(event.defaultPrevented).toBe(true);
  expect($instances.get().get("body-id")?.children).toEqual([]);
  expect(toastError).toHaveBeenCalledWith(expect.any(String));
  abortController.abort();
});

test("imports pasted DTCG tokens through the runtime mutation pipeline", async () => {
  resetStores();
  setupPage();
  const toastError = setupToastError();
  const toastSuccess = setupToastSuccess();
  const event = await pastePlainText({
    color: {
      $type: "color",
      primary: { $value: "#123456" },
      action: { $ref: "#/color/primary" },
    },
  });

  expect(toastError).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(true);
  expect(
    Array.from($styles.get().values()).map((style) => [
      style.property,
      style.value,
    ])
  ).toEqual(
    expect.arrayContaining([
      ["--color-primary", { type: "unparsed", value: "#123456" }],
      ["--color-action", { type: "unparsed", value: "#123456" }],
    ])
  );
  expect(toastSuccess).toHaveBeenCalledWith("Imported 2 tokens.");
});

test("imports a pasted DTCG composite as one Webstudio design token", async () => {
  resetStores();
  setupPage();
  const toastError = setupToastError();
  const toastSuccess = setupToastSuccess();
  const event = await pastePlainText(
    {
      typography: {
        $type: "typography",
        body: {
          $value: {
            fontFamily: ["Inter", "sans-serif"],
            fontSize: { value: 16, unit: "px" },
            fontWeight: 400,
            letterSpacing: { value: 0, unit: "px" },
            lineHeight: 1.5,
          },
        },
      },
    },
    "design-token"
  );

  expect(toastError).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(true);
  const token = Array.from($styleSources.get().values()).find(
    (source) => source.type === "token"
  );
  expect(token).toMatchObject({ name: "typography-body" });
  expect(
    Array.from($styles.get().values())
      .filter((style) => style.styleSourceId === token?.id)
      .map((style) => style.property)
  ).toEqual(
    expect.arrayContaining([
      "fontFamily",
      "fontSize",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
    ])
  );
  expect(toastSuccess).toHaveBeenCalledWith("Imported 1 token.");
});

test("keeps ambiguous primitives as CSS variables when importing design tokens", async () => {
  resetStores();
  setupPage();
  setupToastError();
  await pastePlainText(
    {
      color: {
        $type: "color",
        primary: { $value: "#123456" },
      },
      spacing: {
        $type: "dimension",
        small: { $value: { value: 8, unit: "px" } },
      },
    },
    "design-token"
  );

  expect(
    Array.from($styleSources.get().values()).find(
      (source) => source.type === "token"
    )
  ).toMatchObject({ name: "color-primary" });
  expect(
    Array.from($styles.get().values()).find(
      (style) => style.property === "--spacing-small"
    )?.value
  ).toEqual({ type: "unparsed", value: "8px" });
});

test("cancels a pasted token import without changing project styles", async () => {
  resetStores();
  setupPage();
  setupToastError();
  const event = await pastePlainText(
    { color: { $type: "color", $value: "#123456" } },
    "cancel"
  );

  expect(event.defaultPrevented).toBe(true);
  expect($styleSources.get().size).toBe(0);
  expect($styles.get().size).toBe(0);
});

test("resolves token conflicts for fragments through the shared paste helper", async () => {
  resetStores();
  setupPage();
  setupToastError();
  $project.set({ id: "project-id" } as Project);
  $styleSources.set(
    new Map([
      [
        "existing-token",
        { id: "existing-token", type: "token", name: "Primary" },
      ],
    ])
  );
  $styles.set(
    new Map([
      [
        "existing-token:base:color:",
        {
          styleSourceId: "existing-token",
          breakpointId: "base",
          property: "color",
          value: { type: "unparsed", value: "red" },
        },
      ],
    ])
  );
  const fragment = createEmptyWebstudioFragment();
  fragment.styleSources.push({
    id: "incoming-token",
    type: "token",
    name: "Primary",
  });
  fragment.styles.push({
    styleSourceId: "incoming-token",
    breakpointId: "base",
    property: "color",
    value: { type: "unparsed", value: "blue" },
  });
  const conflictDialog = vi
    .spyOn(window.__webstudio__$__builderApi, "showTokenConflictDialog")
    .mockResolvedValue("ours");

  await insertFragmentWithBreakpointWarning(fragment);

  expect(conflictDialog).toHaveBeenCalledWith([
    expect.objectContaining({
      tokenName: "Primary",
      fragmentTokenId: "incoming-token",
    }),
  ]);
  expect(Array.from($styleSources.get().values())).toEqual([
    { id: "existing-token", type: "token", name: "Primary" },
  ]);
  expect($styles.get().get("existing-token:base:color:")?.value).toEqual({
    type: "unparsed",
    value: "red",
  });
});

test("does not insert a fragment when token conflict resolution is cancelled", async () => {
  resetStores();
  setupPage();
  setupToastError();
  $project.set({ id: "project-id" } as Project);
  $styleSources.set(
    new Map([
      [
        "existing-token",
        { id: "existing-token", type: "token", name: "Primary" },
      ],
    ])
  );
  const fragment = createEmptyWebstudioFragment();
  fragment.styleSources.push({
    id: "incoming-token",
    type: "token",
    name: "Primary",
  });
  fragment.styles.push({
    styleSourceId: "incoming-token",
    breakpointId: "base",
    property: "color",
    value: { type: "unparsed", value: "blue" },
  });
  vi.spyOn(
    window.__webstudio__$__builderApi,
    "showTokenConflictDialog"
  ).mockResolvedValue("cancel");

  const inserted = await insertFragmentWithBreakpointWarning(fragment);

  expect(inserted).toBe(false);
  expect(Array.from($styleSources.get().values())).toEqual([
    { id: "existing-token", type: "token", name: "Primary" },
  ]);
});

test.each([
  ["ours", "old", undefined],
  ["theirs", "old", "#123456"],
  ["merge", "#123456", undefined],
] as const)(
  "resolves pasted design token collisions with %s",
  async (resolution, expectedValue, expectedRenamedValue) => {
    resetStores();
    setupPage();
    setupRootCssVariable("--color", "old");
    setupToastError();
    setupToastSuccess();
    const conflictDialog = vi
      .spyOn(window.__webstudio__$__builderApi, "showTokenConflictDialog")
      .mockResolvedValue(resolution);
    await pastePlainText({
      color: { $type: "color", $value: "#123456" },
    });

    expect(conflictDialog).toHaveBeenCalledWith([
      {
        tokenName: "--color",
      },
    ]);
    expect($styles.get().get("root-local:base:--color:")?.value).toEqual({
      type: "unparsed",
      value: expectedValue,
    });
    expect($styles.get().get("root-local:base:--color-1:")?.value).toEqual(
      expectedRenamedValue === undefined
        ? undefined
        : { type: "unparsed", value: expectedRenamedValue }
    );
  }
);

test("silently reuses an identical pasted design value", async () => {
  resetStores();
  setupPage();
  setupRootCssVariable("--color", "#123456");
  setupToastError();
  const toastSuccess = setupToastSuccess();
  const conflictDialog = vi.spyOn(
    window.__webstudio__$__builderApi,
    "showTokenConflictDialog"
  );
  await pastePlainText({
    color: { $type: "color", $value: "#123456" },
  });

  expect(conflictDialog).not.toHaveBeenCalled();
  expect($styles.get().size).toBe(1);
  expect(toastSuccess).toHaveBeenCalledWith(
    "Imported 0 tokens; skipped 1 existing."
  );
});

test("imports the default mode from pasted Figma variables", async () => {
  resetStores();
  setupPage();
  const toastError = setupToastError();
  const toastSuccess = setupToastSuccess();
  await pastePlainText({
    meta: {
      variableCollections: {
        palette: {
          defaultModeId: "dark",
          modes: [
            { modeId: "light", name: "Light" },
            { modeId: "dark", name: "Dark" },
          ],
        },
      },
      variables: {
        primary: {
          name: "Color/Primary",
          resolvedType: "COLOR",
          variableCollectionId: "palette",
          valuesByMode: {
            light: { r: 1, g: 1, b: 1 },
            dark: { r: 0, g: 0, b: 0 },
          },
        },
      },
    },
  });

  expect(toastError).not.toHaveBeenCalled();
  expect(
    Array.from($styles.get().values()).find(
      (style) => style.property === "--color-primary"
    )?.value
  ).toEqual({ type: "unparsed", value: "rgb(0 0 0 / 1)" });
  expect(toastSuccess).toHaveBeenCalledWith("Imported 1 token.");
});

test("imports pasted DTCG resolver documents and composite tokens", async () => {
  resetStores();
  setupPage();
  const toastError = setupToastError();
  const toastSuccess = setupToastSuccess();
  const event = await pastePlainText({
    version: "2025.10",
    resolutionOrder: [
      {
        type: "set",
        name: "Base",
        sources: [
          {
            body: {
              $type: "typography",
              $value: {
                fontFamily: "Inter",
                fontSize: { value: 16, unit: "px" },
                fontWeight: 500,
                letterSpacing: { value: 0, unit: "px" },
                lineHeight: 1.5,
              },
            },
          },
        ],
      },
    ],
  });

  expect(toastError).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(true);
  expect(
    Array.from($styles.get().values()).map((style) => [
      style.property,
      style.value,
    ])
  ).toEqual(
    expect.arrayContaining([
      ["--body-font-family", { type: "unparsed", value: '"Inter"' }],
      ["--body-font-size", { type: "unparsed", value: "16px" }],
      ["--body-font-weight", { type: "unparsed", value: "500" }],
      ["--body-letter-spacing", { type: "unparsed", value: "0px" }],
      ["--body-line-height", { type: "unparsed", value: "1.5" }],
    ])
  );
  expect(toastSuccess).toHaveBeenCalledWith("Imported 5 tokens.");
});

test("reports invalid pasted design token documents", async () => {
  resetStores();
  setupPage();
  const toastError = setupToastError();
  const event = await pastePlainText({
    spacing: {
      $type: "dimension",
      $value: { value: 8, unit: "invalid" },
    },
  });

  expect(event.defaultPrevented).toBe(true);
  expect($styles.get()).toEqual(new Map());
  expect(toastError).toHaveBeenCalledWith(
    expect.stringContaining("invalid dimension unit invalid")
  );
});

test("does not intercept native paste while editing text", async () => {
  resetStores();
  const abortController = new AbortController();
  const toastError = setupToastError();
  initCopyPaste({ signal: abortController.signal });
  setupPage();
  $textEditingInstanceSelector.set({
    selector: ["text-id", "body-id"],
    reason: "click",
    mouseX: 0,
    mouseY: 0,
  });
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData(
    "text/plain",
    `{"@webstudio/instance/v0.1":{"instanceSelector":["missing-id","body-id"]`
  );

  document.dispatchEvent(event);
  await waitForClipboardEvent();

  expect(event.defaultPrevented).toBe(false);
  expect($instances.get().get("body-id")?.children).toEqual([]);
  expect(toastError).not.toHaveBeenCalled();
  abortController.abort();
});

test("cuts multi-selected instances through clipboard event", () => {
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
          children: [
            { type: "id", value: "box-id" },
            { type: "id", value: "heading-id" },
          ],
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
      [
        "heading-id",
        {
          type: "instance",
          id: "heading-id",
          component: "Heading",
          children: [],
        },
      ],
    ])
  );
  selectInstances([
    ["box-id", "body-id"],
    ["heading-id", "body-id"],
  ]);
  const { clipboardData, event } = createClipboardEvent("cut");

  document.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(JSON.parse(clipboardData.getData("text/plain"))).toMatchObject({
    "@webstudio/instances/v0.1": {
      rootInstanceIds: ["box-id", "heading-id"],
    },
  });
  expect($instances.get().get("body-id")?.children).toEqual([]);
  expect($instances.get().has("box-id")).toBe(false);
  expect($instances.get().has("heading-id")).toBe(false);
  abortController.abort();
});

test("content mode blocks cut through clipboard event", () => {
  resetStores();
  const abortController = new AbortController();
  const toastInfo = setupToastInfo();
  initCopyPasteForContentEditMode({ signal: abortController.signal });
  const { event } = createClipboardEvent("cut");

  document.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
  expect(toastInfo).toHaveBeenCalledWith(
    "Cutting is allowed in design mode only."
  );
  abortController.abort();
});

test("content mode reports unsupported paste clipboard data", async () => {
  resetStores();
  const abortController = new AbortController();
  const toastInfo = setupToastInfo();
  initCopyPasteForContentEditMode({ signal: abortController.signal });
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData("text/plain", "plain text");

  document.dispatchEvent(event);
  await waitForClipboardEvent();

  expect(event.defaultPrevented).toBe(true);
  expect(toastInfo).toHaveBeenCalledWith(
    "This clipboard data cannot be pasted here."
  );
  abortController.abort();
});

test("content mode reports malformed webstudio instance clipboard data", async () => {
  resetStores();
  const abortController = new AbortController();
  const toastInfo = setupToastInfo();
  const toastError = setupToastError();
  initCopyPasteForContentEditMode({ signal: abortController.signal });
  const { clipboardData, event } = createClipboardEvent("paste");
  clipboardData.setData(
    "text/plain",
    `{"@webstudio/instance/v0.1":{"instanceSelector":["missing-id","body-id"]`
  );

  document.dispatchEvent(event);
  await waitForClipboardEvent();

  expect(event.defaultPrevented).toBe(true);
  expect(toastError).toHaveBeenCalledWith(
    "Could not paste Webstudio instance data. The clipboard data appears to be incomplete or invalid."
  );
  expect(toastInfo).not.toHaveBeenCalledWith(
    "This clipboard data cannot be pasted here."
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
  document.body.appendChild(input);
  const { clipboardData, event } = createClipboardEvent("copy");

  input.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
  expect(clipboardData.getData("text/plain")).toBe("");
  input.remove();
  abortController.abort();
});

test("does not intercept native copy while editing canvas text", () => {
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
          children: [{ type: "id", value: "text-id" }],
        },
      ],
      [
        "text-id",
        {
          type: "instance",
          id: "text-id",
          component: "Text",
          children: [],
        },
      ],
    ])
  );
  selectInstance(["text-id", "body-id"]);
  $textEditingInstanceSelector.set({
    selector: ["text-id", "body-id"],
    reason: "enter",
  });
  const { clipboardData, event } = createClipboardEvent("copy");

  document.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
  expect(clipboardData.getData("text/plain")).toBe("");
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

test("copies multi-selected instances to clipboard and emits paste for every root", async () => {
  resetStores();
  const abortController = new AbortController();
  initCopyPaste({ signal: abortController.signal });
  let clipboardText = "";
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: {
      writeText: vi.fn(async (text: string) => {
        clipboardText = text;
      }),
      readText: vi.fn(async () => clipboardText),
    },
  });
  vi.stubGlobal("DataTransfer", TestDataTransfer);
  vi.stubGlobal("ClipboardEvent", TestClipboardEvent);
  $project.set({ id: "project-id" } as Project);
  $instances.set(
    new Map<Instance["id"], Instance>([
      [
        "body-id",
        {
          type: "instance",
          id: "body-id",
          component: "Body",
          children: [
            { type: "id", value: "source-1" },
            { type: "id", value: "source-2" },
            { type: "id", value: "target" },
          ],
        },
      ],
      [
        "source-1",
        {
          type: "instance",
          id: "source-1",
          component: "Box",
          children: [],
        },
      ],
      [
        "source-2",
        {
          type: "instance",
          id: "source-2",
          component: "Heading",
          children: [],
        },
      ],
      [
        "target",
        {
          type: "instance",
          id: "target",
          component: "Box",
          children: [],
        },
      ],
    ])
  );
  selectInstances([
    ["source-1", "body-id"],
    ["source-2", "body-id"],
  ]);

  await copyInstance();
  expect(JSON.parse(clipboardText)).toMatchObject({
    "@webstudio/instances/v0.1": {
      rootInstanceIds: ["source-1", "source-2"],
    },
  });

  selectInstance(["target", "body-id"]);
  await emitPaste();
  await waitForClipboardEvent();

  expect($instances.get().get("target")?.children).toEqual([
    { type: "id", value: expect.any(String) },
    { type: "id", value: expect.any(String) },
  ]);
  abortController.abort();
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

test("cuts multi-selected instances to clipboard and removes every root", async () => {
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
          children: [
            { type: "id", value: "box-id" },
            { type: "id", value: "heading-id" },
          ],
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
      [
        "heading-id",
        {
          type: "instance",
          id: "heading-id",
          component: "Heading",
          children: [],
        },
      ],
    ])
  );
  selectInstances([
    ["box-id", "body-id"],
    ["heading-id", "body-id"],
  ]);

  await cutInstance();

  expect(JSON.parse(writeText.mock.calls[0]?.[0] ?? "")).toMatchObject({
    "@webstudio/instances/v0.1": {
      rootInstanceIds: ["box-id", "heading-id"],
    },
  });
  expect($instances.get().get("body-id")?.children).toEqual([]);
  expect($instances.get().has("box-id")).toBe(false);
  expect($instances.get().has("heading-id")).toBe(false);
});
